import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhoneNumber,
  formatTime,
  getInitials,
  truncateText,
} from '../src/utils/formatters.js';

describe('mobile formatters', () => {
  test('formats Indonesian currency and numbers', () => {
    expect(formatCurrency(150000)).toBe('Rp\u00a0150.000');
    expect(formatNumber(1250000)).toBe('1.250.000');
  });

  test('formats date and time values deterministically', () => {
    const value = '2026-06-08T09:30:00.000Z';

    expect(formatDate(value, 'dd/MM/yyyy')).toBe('08/06/2026');
    expect(formatTime(value)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatDateTime(value)).toMatch(/08 Juni 2026, \d{2}:\d{2}/);
  });

  test('formats Indonesian phone numbers', () => {
    expect(formatPhoneNumber('+6281234567890')).toBe('+62 812-3456-7890');
    expect(formatPhoneNumber('021-555-0101')).toBe('021-555-0101');
    expect(formatPhoneNumber('')).toBe('');
  });

  test('truncates text and extracts initials', () => {
    expect(truncateText('Konsultasi gigi lanjutan', 10)).toBe('Konsultasi...');
    expect(truncateText('Pendek', 10)).toBe('Pendek');
    expect(getInitials('Ayu Lestari Putri')).toBe('AL');
    expect(getInitials('')).toBe('');
  });
});
