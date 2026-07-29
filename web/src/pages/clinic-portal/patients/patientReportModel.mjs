import { scopeClinicPatientData } from './clinicPatientDataModel.mjs';

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (headers, rows) => [
  headers.map(csvCell).join(','),
  ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
].join('\r\n');

const safeDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const reportName = (type) => ({
  patientList: 'patient-list',
  visitSummary: 'visit-summary',
  treatmentReport: 'treatment-report',
  demographic: 'patient-demographic',
  dentistPerformance: 'dentist-performance',
}[type] || 'patient-report');

export function buildClinicPatientReport({
  type = 'patientList',
  patients = [],
  appointments = [],
  doctors = [],
  selectedDentist = 'all',
  patientType = 'all',
  treatmentType = 'all',
  start = null,
  end = null,
  generatedAt = new Date(),
} = {}) {
  const scoped = scopeClinicPatientData({
    patients, appointments, selectedDentist, patientType, treatmentType, start, end
  });
  let rows = [];

  if (type === 'patientList') {
    rows = scoped.patients.map((patient) => ({
      patientId: patient.id,
      name: patient.name,
      age: patient.age ?? '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      status: patient.status || '',
      careDentist: patient.doctorName || '',
      lastVisit: safeDate(patient.lastVisit),
      nextAppointment: safeDate(patient.nextAppointment),
      completedVisits: patient.totalVisits ?? 0,
      paidRevenue: Number(patient.totalRevenue) || 0,
    }));
  } else if (type === 'visitSummary') {
    rows = scoped.appointments.map((appointment) => ({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName || '',
      dentistId: appointment.dentistId || appointment.doctorId || '',
      dentistName: appointment.dentistName || '',
      startsAt: safeDate(appointment.startsAt || appointment.date),
      status: appointment.status || '',
      treatment: appointment.treatment || appointment.reason || '',
      consultationType: appointment.consultationType || '',
      paid: Boolean(appointment.isPaid),
      fee: Number(appointment.fee) || 0,
    }));
  } else if (type === 'treatmentReport') {
    const treatments = new Map();
    scoped.appointments.forEach((appointment) => {
      const name = String(appointment.treatment || appointment.reason || 'Tidak tercatat').trim();
      const current = treatments.get(name) || { treatment: name, appointments: 0, paidAppointments: 0, paidRevenue: 0 };
      current.appointments += 1;
      if (appointment.isPaid) {
        current.paidAppointments += 1;
        current.paidRevenue += Number(appointment.fee) || 0;
      }
      treatments.set(name, current);
    });
    rows = [...treatments.values()].sort((a, b) => b.appointments - a.appointments);
  } else if (type === 'demographic') {
    const groups = new Map();
    scoped.patients.forEach((patient) => {
      const numericAge = Number(patient.age);
      const ageGroup = !Number.isFinite(numericAge) ? 'Tidak diketahui'
        : numericAge < 18 ? '0-17'
          : numericAge < 30 ? '18-29'
            : numericAge < 45 ? '30-44'
              : numericAge < 60 ? '45-59' : '60+';
      const gender = patient.gender === 'M' ? 'Laki-laki' : patient.gender === 'F' ? 'Perempuan' : 'Tidak diketahui';
      const key = `${gender}|${ageGroup}`;
      const current = groups.get(key) || { gender, ageGroup, patients: 0 };
      current.patients += 1;
      groups.set(key, current);
    });
    rows = [...groups.values()];
  } else if (type === 'dentistPerformance') {
    rows = doctors
      .filter((doctor) => selectedDentist === 'all' || String(doctor.id) === String(selectedDentist))
      .map((doctor) => {
        const doctorAppointments = scoped.appointments.filter((appointment) =>
          String(appointment.dentistId || appointment.doctorId) === String(doctor.id));
        return {
          dentistId: doctor.id,
          dentistName: doctor.name,
          uniquePatients: new Set(doctorAppointments.map((appointment) => String(appointment.patientId))).size,
          appointments: doctorAppointments.length,
          completedAppointments: doctorAppointments.filter((appointment) => appointment.status === 'completed').length,
          paidAppointments: doctorAppointments.filter((appointment) => appointment.isPaid).length,
          paidRevenue: doctorAppointments.filter((appointment) => appointment.isPaid)
            .reduce((sum, appointment) => sum + (Number(appointment.fee) || 0), 0),
        };
      });
  }

  const headers = rows.length ? Object.keys(rows[0]) : ['message'];
  const normalizedRows = rows.length ? rows : [{ message: 'Tidak ada data untuk filter yang dipilih' }];
  const dateKey = generatedAt.toISOString().slice(0, 10);
  return {
    filename: `${reportName(type)}-${dateKey}.csv`,
    mimeType: 'text/csv;charset=utf-8',
    content: `\uFEFF${toCsv(headers, normalizedRows)}`,
    rowCount: rows.length,
    scoped,
  };
}
