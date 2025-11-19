import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

/**
 * POST /v1/appointments
 * Create a new appointment (book appointment)
 */
export const createAppointment = async (req, res, next) => {
  try {
    const {
      dentist_id,
      clinic_id,
      date,
      time,
      duration = 60,
      reason,
      notes
    } = req.body;

    // Validate required fields
    if (!dentist_id || !clinic_id || !date || !time) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'dentist_id, clinic_id, date, and time are required'
      );
    }

    // Get patient_id from authenticated user
    const patient_id = req.user.id;

    // Create starts_at and ends_at timestamps
    const starts_at = new Date(`${date}T${time}:00Z`);
    const ends_at = new Date(starts_at.getTime() + duration * 60000);

    // Check if dentist exists and works at the clinic
    const dentistCheckQuery = `
      SELECT cs.id, cp.operating_hours
      FROM clinic_staff cs
      JOIN clinic_profiles cp ON cp.id = cs.clinic_profile_id
      WHERE cs.user_id = $1 
        AND cs.clinic_profile_id = $2
        AND cs.is_active = true
    `;
    const dentistCheck = await query(dentistCheckQuery, [dentist_id, clinic_id]);

    if (dentistCheck.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_INVALID_SLOT.code,
        'APPOINTMENT_INVALID_SLOT',
        'Dokter gigi tidak tersedia di klinik ini',
        'Pilih dokter gigi dan klinik yang valid'
      );
    }

    // Check if slot is available (no overlapping appointments)
    const overlapQuery = `
      SELECT id
      FROM appointments
      WHERE dentist_id = $1
        AND clinic_branch_id = $2
        AND status NOT IN ('cancelled', 'rejected')
        AND (
          (starts_at <= $3 AND ends_at > $3) OR
          (starts_at < $4 AND ends_at >= $4) OR
          (starts_at >= $3 AND ends_at <= $4)
        )
      LIMIT 1
    `;
    const overlapCheck = await query(overlapQuery, [dentist_id, clinic_id, starts_at, ends_at]);

    if (overlapCheck.rows.length > 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_SLOT_UNAVAILABLE.code,
        'APPOINTMENT_SLOT_UNAVAILABLE',
        'Slot waktu tidak tersedia',
        'Pilih waktu lain atau cek slot yang tersedia'
      );
    }

    // Check if clinic is open at the requested time
    const operatingHours = dentistCheck.rows[0].operating_hours;
    const dayOfWeek = starts_at.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayHours = operatingHours[dayOfWeek];

    if (!dayHours || dayHours.isOpen === false) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_INVALID_SLOT.code,
        'APPOINTMENT_INVALID_SLOT',
        `Klinik tutup pada hari ${dayOfWeek}`,
        'Pilih hari lain saat klinik buka'
      );
    }

    // Create appointment
    const insertQuery = `
      INSERT INTO appointments (
        dentist_id, patient_id, clinic_branch_id, 
        starts_at, ends_at, status, reason, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      dentist_id,
      patient_id,
      clinic_id,
      starts_at,
      ends_at,
      'scheduled',
      reason,
      notes
    ]);

    const appointment = result.rows[0];

    // Get appointment details with dentist and clinic info
    const detailsQuery = `
      SELECT 
        a.*,
        u_dentist.name as dentist_name,
        u_dentist.email as dentist_email,
        dp.title as dentist_title,
        dp.primary_specialization,
        cp.brand_name as clinic_name,
        cp.street_address as clinic_address,
        cp.phone as clinic_phone
      FROM appointments a
      JOIN users u_dentist ON u_dentist.id = a.dentist_id
      JOIN dentist_profiles dp ON dp.user_id = a.dentist_id
      JOIN clinic_profiles cp ON cp.id = a.clinic_branch_id
      WHERE a.id = $1
    `;
    const appointmentDetails = await query(detailsQuery, [appointment.id]);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      messageEn: 'Appointment booked successfully',
      data: appointmentDetails.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/appointments
 * Get list of appointments for the authenticated user
 */
export const getAppointments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      startDate = '',
      endDate = '',
      sortOrder = 'desc'
    } = req.query;

    const user_id = req.user.id;
    const user_role = req.user.role;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by user role
    if (user_role === 'patient') {
      conditions.push(`a.patient_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    } else if (user_role === 'dentist') {
      conditions.push(`a.dentist_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Filter by date range
    if (startDate) {
      conditions.push(`a.starts_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`a.starts_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get appointments
    const appointmentsQuery = `
      SELECT 
        a.*,
        u_dentist.name as dentist_name,
        u_dentist.email as dentist_email,
        dp.title as dentist_title,
        dp.primary_specialization,
        dp.avatar_url as dentist_avatar,
        u_patient.name as patient_name,
        u_patient.email as patient_email,
        pp.avatar_url as patient_avatar,
        cp.brand_name as clinic_name,
        cp.street_address as clinic_address,
        cp.phone as clinic_phone,
        cp.city as clinic_city
      FROM appointments a
      JOIN users u_dentist ON u_dentist.id = a.dentist_id
      JOIN dentist_profiles dp ON dp.user_id = a.dentist_id
      JOIN users u_patient ON u_patient.id = a.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
      JOIN clinic_profiles cp ON cp.id = a.clinic_branch_id
      ${whereClause}
      ORDER BY a.starts_at ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);
    const result = await query(appointmentsQuery, params);

    res.json({
      success: true,
      data: {
        appointments: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/appointments/:id
 * Get appointment details by ID
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    const appointmentQuery = `
      SELECT 
        a.*,
        u_dentist.name as dentist_name,
        u_dentist.email as dentist_email,
        u_dentist.phone as dentist_phone,
        dp.title as dentist_title,
        dp.primary_specialization,
        dp.consultation_fee,
        dp.avatar_url as dentist_avatar,
        u_patient.name as patient_name,
        u_patient.email as patient_email,
        u_patient.phone as patient_phone,
        pp.date_of_birth as patient_dob,
        pp.gender as patient_gender,
        pp.avatar_url as patient_avatar,
        cp.brand_name as clinic_name,
        cp.legal_name as clinic_legal_name,
        cp.street_address as clinic_address,
        cp.city as clinic_city,
        cp.province as clinic_province,
        cp.phone as clinic_phone,
        cp.email as clinic_email
      FROM appointments a
      JOIN users u_dentist ON u_dentist.id = a.dentist_id
      JOIN dentist_profiles dp ON dp.user_id = a.dentist_id
      JOIN users u_patient ON u_patient.id = a.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
      JOIN clinic_profiles cp ON cp.id = a.clinic_branch_id
      WHERE a.id = $1
    `;

    const result = await query(appointmentQuery, [id]);

    if (result.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_NOT_FOUND.code,
        'APPOINTMENT_NOT_FOUND',
        'Appointment tidak ditemukan',
        'Periksa kembali ID appointment'
      );
    }

    const appointment = result.rows[0];

    // Check authorization (patient or dentist can only see their own appointments)
    if (user_role === 'patient' && appointment.patient_id !== user_id) {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Anda tidak memiliki akses ke appointment ini',
        'Hanya pasien yang bersangkutan yang dapat melihat detail appointment'
      );
    }

    if (user_role === 'dentist' && appointment.dentist_id !== user_id) {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Anda tidak memiliki akses ke appointment ini',
        'Hanya dokter yang bersangkutan yang dapat melihat detail appointment'
      );
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/appointments/:id
 * Update/Reschedule appointment
 */
export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, time, duration, reason, notes } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Get existing appointment
    const existingQuery = `
      SELECT * FROM appointments WHERE id = $1
    `;
    const existingResult = await query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_NOT_FOUND.code,
        'APPOINTMENT_NOT_FOUND',
        'Appointment tidak ditemukan'
      );
    }

    const appointment = existingResult.rows[0];

    // Check authorization
    if (user_role === 'patient' && appointment.patient_id !== user_id) {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Anda tidak memiliki akses untuk mengubah appointment ini'
      );
    }

    // Check if appointment can be rescheduled (not completed or cancelled)
    if (['completed', 'cancelled', 'rejected'].includes(appointment.status)) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_CANNOT_RESCHEDULE.code,
        'APPOINTMENT_CANNOT_RESCHEDULE',
        'Appointment tidak dapat diubah',
        `Appointment dengan status ${appointment.status} tidak dapat diubah`
      );
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    // Handle date/time rescheduling
    if (date && time) {
      const starts_at = new Date(`${date}T${time}:00Z`);
      const appointmentDuration = duration || 
        Math.round((new Date(appointment.ends_at) - new Date(appointment.starts_at)) / 60000);
      const ends_at = new Date(starts_at.getTime() + appointmentDuration * 60000);

      // Check for overlapping appointments
      const overlapQuery = `
        SELECT id
        FROM appointments
        WHERE dentist_id = $1
          AND clinic_branch_id = $2
          AND id != $3
          AND status NOT IN ('cancelled', 'rejected')
          AND (
            (starts_at <= $4 AND ends_at > $4) OR
            (starts_at < $5 AND ends_at >= $5) OR
            (starts_at >= $4 AND ends_at <= $5)
          )
        LIMIT 1
      `;
      const overlapCheck = await query(overlapQuery, [
        appointment.dentist_id,
        appointment.clinic_branch_id,
        id,
        starts_at,
        ends_at
      ]);

      if (overlapCheck.rows.length > 0) {
        throw new APIError(
          ERROR_CODES.APPOINTMENT_SLOT_UNAVAILABLE.code,
          'APPOINTMENT_SLOT_UNAVAILABLE',
          'Slot waktu tidak tersedia untuk reschedule',
          'Pilih waktu lain yang tersedia'
        );
      }

      updates.push(`starts_at = $${paramIndex}`);
      params.push(starts_at);
      paramIndex++;

      updates.push(`ends_at = $${paramIndex}`);
      params.push(ends_at);
      paramIndex++;

      updates.push(`rescheduled_from_id = $${paramIndex}`);
      params.push(id);
      paramIndex++;
    }

    // Handle reason update
    if (reason !== undefined) {
      updates.push(`reason = $${paramIndex}`);
      params.push(reason);
      paramIndex++;
    }

    // Handle notes update
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Tidak ada data yang diubah',
        'Berikan minimal satu field untuk diupdate'
      );
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    // Update appointment
    const updateQuery = `
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(id);

    const result = await query(updateQuery, params);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      messageEn: 'Appointment updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /v1/appointments/:id
 * Cancel appointment
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Get existing appointment
    const existingQuery = `
      SELECT * FROM appointments WHERE id = $1
    `;
    const existingResult = await query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_NOT_FOUND.code,
        'APPOINTMENT_NOT_FOUND',
        'Appointment tidak ditemukan'
      );
    }

    const appointment = existingResult.rows[0];

    // Check authorization
    if (user_role === 'patient' && appointment.patient_id !== user_id) {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Anda tidak memiliki akses untuk membatalkan appointment ini'
      );
    }

    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_ALREADY_CANCELLED.code,
        'APPOINTMENT_ALREADY_CANCELLED',
        'Appointment sudah dibatalkan sebelumnya'
      );
    }

    // Check if completed
    if (appointment.status === 'completed') {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_CANNOT_CANCEL.code,
        'APPOINTMENT_CANNOT_CANCEL',
        'Appointment yang sudah selesai tidak dapat dibatalkan'
      );
    }

    // Calculate cancellation fee based on time until appointment
    const hoursUntilAppointment = 
      (new Date(appointment.starts_at) - new Date()) / (1000 * 60 * 60);
    
    let cancellation_fee = 0;
    if (hoursUntilAppointment < 24) {
      // Less than 24 hours: 50% cancellation fee
      cancellation_fee = 50000; // Example fee, should come from settings
    }

    // Cancel appointment
    const updateQuery = `
      UPDATE appointments
      SET 
        status = 'cancelled',
        cancellation_reason = $1,
        cancellation_fee = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(updateQuery, [cancellation_reason, cancellation_fee, id]);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      messageEn: 'Appointment cancelled successfully',
      data: {
        ...result.rows[0],
        cancellation_fee_applied: cancellation_fee > 0,
        cancellation_fee_amount: cancellation_fee
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/appointments/:id/confirm
 * Confirm appointment (staff/dentist only)
 */
export const confirmAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Only dentist or staff can confirm
    if (!['dentist', 'admin', 'super_admin'].includes(user_role)) {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Hanya staff klinik yang dapat mengkonfirmasi appointment',
        'Anda tidak memiliki akses untuk fungsi ini'
      );
    }

    // Get existing appointment
    const existingQuery = `
      SELECT * FROM appointments WHERE id = $1
    `;
    const existingResult = await query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_NOT_FOUND.code,
        'APPOINTMENT_NOT_FOUND',
        'Appointment tidak ditemukan'
      );
    }

    const appointment = existingResult.rows[0];

    // If user is dentist, check if it's their appointment
    if (user_role === 'dentist' && appointment.dentist_id !== user_id) {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Anda hanya dapat mengkonfirmasi appointment Anda sendiri'
      );
    }

    // Check if already confirmed or completed
    if (['confirmed', 'completed'].includes(appointment.status)) {
      return res.json({
        success: true,
        message: 'Appointment sudah dikonfirmasi sebelumnya',
        messageEn: 'Appointment already confirmed',
        data: appointment
      });
    }

    // Check if cancelled
    if (appointment.status === 'cancelled') {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_CANNOT_CONFIRM.code,
        'APPOINTMENT_CANNOT_CONFIRM',
        'Appointment yang dibatalkan tidak dapat dikonfirmasi',
        'Buat appointment baru'
      );
    }

    // Confirm appointment
    const updateQuery = `
      UPDATE appointments
      SET 
        status = 'confirmed',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(updateQuery, [id]);

    res.json({
      success: true,
      message: 'Appointment confirmed successfully',
      messageEn: 'Appointment confirmed successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/appointments/:id/available-slots
 * Get available slots for rescheduling
 */
export const getAvailableSlotsForReschedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, duration = 60 } = req.query;

    if (!date) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'date parameter is required'
      );
    }

    // Get appointment details
    const appointmentQuery = `
      SELECT 
        a.*,
        cp.operating_hours
      FROM appointments a
      JOIN clinic_profiles cp ON cp.id = a.clinic_branch_id
      WHERE a.id = $1
    `;
    const appointmentResult = await query(appointmentQuery, [id]);

    if (appointmentResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_NOT_FOUND.code,
        'APPOINTMENT_NOT_FOUND',
        'Appointment tidak ditemukan'
      );
    }

    const appointment = appointmentResult.rows[0];
    const operatingHours = appointment.operating_hours;

    // Get day of week
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayHours = operatingHours[dayOfWeek];

    if (!dayHours || dayHours.isOpen === false) {
      return res.json({
        success: true,
        data: {
          appointment_id: id,
          date,
          day_of_week: dayOfWeek,
          available_slots: []
        },
        message: `Klinik tutup pada hari ${dayOfWeek}`
      });
    }

    // Parse operating hours
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);

    // Get booked appointments for this dentist on this date (excluding current appointment)
    const bookedQuery = `
      SELECT starts_at, ends_at
      FROM appointments
      WHERE dentist_id = $1
        AND clinic_branch_id = $2
        AND DATE(starts_at) = $3
        AND id != $4
        AND status NOT IN ('cancelled', 'rejected')
      ORDER BY starts_at ASC
    `;
    const bookedResult = await query(bookedQuery, [
      appointment.dentist_id,
      appointment.clinic_branch_id,
      date,
      id
    ]);

    // Generate slots
    const slots = [];
    let currentHour = openHour;
    let currentMinute = openMinute;
    const slotDuration = parseInt(duration);

    while (
      currentHour < closeHour ||
      (currentHour === closeHour && currentMinute < closeMinute)
    ) {
      const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // Check overlap with booked appointments
      const isBooked = bookedResult.rows.some(booking => {
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);

        const slotStart = new Date(requestedDate);
        slotStart.setHours(currentHour, currentMinute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      // Check if slot fits within operating hours
      const slotEndHour = Math.floor((currentMinute + slotDuration) / 60) + currentHour;
      const slotEndMinute = (currentMinute + slotDuration) % 60;
      const withinHours = slotEndHour < closeHour ||
        (slotEndHour === closeHour && slotEndMinute <= closeMinute);

      if (!isBooked && withinHours) {
        slots.push({
          time: slotTime,
          available: true
        });
      }

      // Move to next slot
      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    res.json({
      success: true,
      data: {
        appointment_id: id,
        dentist_id: appointment.dentist_id,
        clinic_id: appointment.clinic_branch_id,
        date,
        day_of_week: dayOfWeek,
        operating_hours: dayHours,
        slot_duration: slotDuration,
        available_slots: slots
      }
    });
  } catch (error) {
    next(error);
  }
};
