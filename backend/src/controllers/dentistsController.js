import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

/**
 * Get dentist profile by ID
 */
export const getDentistById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dentistQuery = `
      SELECT 
        dp.id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        u.avatar_url,
        dp.title,
        dp.license_number,
        dp.license_issuing_body,
        dp.license_expiry_date,
        dp.registration_number,
        dp.primary_specialization as specialization,
        dp.education_qualification as education,
        dp.years_of_experience,
        dp.clinic_name,
        dp.clinic_address,
        dp.clinic_working_hours,
        dp.consultation_types,
        dp.services_offered,
        dp.consultation_fee,
        dp.accepts_insurance,
        dp.accepts_bpjs,
        dp.emergency_availability,
        dp.is_verified,
        dp.verification_date,
        dp.created_at,
        dp.updated_at
      FROM dentist_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = $1
    `;

    const result = await query(dentistQuery, [id]);

    if (result.rows.length === 0) {
      throw new APIError(ERROR_CODES.DENTIST_NOT_FOUND);
    }

    const dentist = result.rows[0];

    // Get clinics where this dentist works
    const clinicsQuery = `
      SELECT 
        cp.id,
        cp.brand_name as name,
        cp.street_address as address,
        cp.city,
        cp.phone as phone_number,
        cs.role,
        cs.is_active
      FROM clinic_staff cs
      JOIN clinic_profiles cp ON cs.clinic_profile_id = cp.id
      WHERE cs.user_id = $1
      ORDER BY cs.is_active DESC, cp.brand_name ASC
    `;

    const clinicsResult = await query(clinicsQuery, [dentist.user_id]);

    res.json({
      success: true,
      data: {
        ...dentist,
        clinics: clinicsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dentist's schedule/availability
 */
export const getDentistSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, clinicId } = req.query;

    // Verify dentist exists
    const dentistCheck = await query(
      'SELECT id, user_id FROM dentist_profiles WHERE id = $1',
      [id]
    );

    if (dentistCheck.rows.length === 0) {
      throw new APIError(ERROR_CODES.DENTIST_NOT_FOUND);
    }

    const dentist = dentistCheck.rows[0];

    // If specific clinic requested, verify dentist works there
    if (clinicId) {
      const staffCheck = await query(
        `SELECT id FROM clinic_staff 
         WHERE user_id = $1 AND clinic_profile_id = $2 AND role = 'dentist' AND is_active = true`,
        [dentist.user_id, clinicId]
      );

      if (staffCheck.rows.length === 0) {
        throw new APIError({
          ...ERROR_CODES.DENTIST_NOT_FOUND,
          message: 'Dokter gigi tidak bekerja di klinik ini',
          messageEn: 'Dentist does not work at this clinic'
        });
      }
    }

    // Get dentist's working hours from clinic(s)
    const clinicsQuery = `
      SELECT 
        cp.id as clinic_id,
        cp.brand_name as clinic_name,
        cp.operating_hours
      FROM clinic_staff cs
      JOIN clinic_profiles cp ON cs.clinic_profile_id = cp.id
      WHERE cs.user_id = $1 
        AND cs.role = 'dentist' 
        AND cs.is_active = true
        ${clinicId ? 'AND cp.id = $2' : ''}
    `;

    const clinicsParams = clinicId ? [dentist.user_id, clinicId] : [dentist.user_id];
    const clinicsResult = await query(clinicsQuery, clinicsParams);

    if (clinicsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          dentist_id: id,
          date: date || 'all',
          clinics: [],
          message: 'Dokter gigi tidak memiliki jadwal aktif',
          messageEn: 'Dentist has no active schedule'
        }
      });
    }

    // For each clinic, get booked appointments on the requested date
    const schedules = await Promise.all(
      clinicsResult.rows.map(async (clinic) => {
        let bookedSlots = [];

        if (date) {
          const appointmentsQuery = `
            SELECT 
              appointment_date,
              appointment_time,
              duration_minutes
            FROM appointments
            WHERE dentist_id = $1 
              AND clinic_id = $2
              AND appointment_date = $3
              AND status NOT IN ('cancelled', 'rejected')
            ORDER BY appointment_time ASC
          `;

          const appointmentsResult = await query(appointmentsQuery, [
            id,
            clinic.clinic_id,
            date
          ]);

          bookedSlots = appointmentsResult.rows.map(apt => ({
            time: apt.appointment_time,
            duration: apt.duration_minutes
          }));
        }

        return {
          clinic_id: clinic.clinic_id,
          clinic_name: clinic.clinic_name,
          operating_hours: clinic.operating_hours,
          booked_slots: bookedSlots
        };
      })
    );

    res.json({
      success: true,
      data: {
        dentist_id: id,
        date: date || 'all',
        schedules
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available time slots for a dentist on a specific date
 */
export const getDentistAvailableSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, clinicId, duration = 30 } = req.query;

    if (!date) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Tanggal harus diisi',
        messageEn: 'Date is required',
        fields: { date: 'Date parameter is required' }
      });
    }

    if (!clinicId) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Clinic ID harus diisi',
        messageEn: 'Clinic ID is required',
        fields: { clinicId: 'Clinic ID parameter is required' }
      });
    }

    // Verify dentist exists and works at this clinic
    const dentistCheck = await query(
      `SELECT dp.id, dp.user_id
       FROM dentist_profiles dp
       JOIN clinic_staff cs ON dp.user_id = cs.user_id
       WHERE dp.id = $1 
         AND cs.clinic_profile_id = $2 
         AND cs.role = 'dentist' 
         AND cs.is_active = true`,
      [id, clinicId]
    );

    if (dentistCheck.rows.length === 0) {
      throw new APIError(ERROR_CODES.DENTIST_NOT_FOUND);
    }

    // Get clinic operating hours
    const clinicQuery = `
      SELECT operating_hours
      FROM clinic_profiles
      WHERE id = $1
    `;
    const clinicResult = await query(clinicQuery, [clinicId]);
    const operatingHours = clinicResult.rows[0]?.operating_hours || {};

    // Get day of week from date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Get operating hours for that day
    const dayHours = operatingHours[dayOfWeek];

    if (!dayHours || dayHours.isOpen === false) {
      return res.json({
        success: true,
        data: {
          dentist_id: id,
          clinic_id: clinicId,
          date,
          available_slots: [],
          message: `Klinik tutup pada hari ${dayOfWeek}`,
          messageEn: `Clinic is closed on ${dayOfWeek}`
        }
      });
    }

    // Parse opening and closing times
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);

    // Get all booked appointments for this dentist on this date
    const bookedQuery = `
      SELECT starts_at, ends_at
      FROM appointments
      WHERE dentist_id = $1 
        AND clinic_branch_id = $2
        AND DATE(starts_at) = $3
        AND status NOT IN ('cancelled', 'rejected')
      ORDER BY starts_at ASC
    `;
    const bookedResult = await query(bookedQuery, [id, clinicId, date]);

    // Generate all possible time slots
    const slots = [];
    let currentHour = openHour;
    let currentMinute = openMinute;
    const slotDuration = parseInt(duration);

    while (
      currentHour < closeHour ||
      (currentHour === closeHour && currentMinute < closeMinute)
    ) {
      const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Check if this slot overlaps with any booked appointment
      const isBooked = bookedResult.rows.some(booking => {
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);
        
        // Create slot start and end times for comparison
        const slotStart = new Date(requestedDate);
        slotStart.setHours(currentHour, currentMinute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Check if slot overlaps with booking
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      // Check if slot end time is within operating hours
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
        dentist_id: id,
        clinic_id: clinicId,
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
