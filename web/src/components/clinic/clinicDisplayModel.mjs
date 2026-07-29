export const EMPTY_DISPLAY_VALUE = '—';

const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const normalizeDisplayKey = (value, fallback = 'unknown') => {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
};

export const humanizeDisplayValue = (value, fallback = 'Unknown') => {
  const normalized = normalizeDisplayKey(value, '');
  if (!normalized) return fallback;

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getClinicDisplayName = (clinic = {}, fallback = 'Unnamed clinic') => (
  cleanText(clinic?.brandName) || cleanText(clinic?.legalName) || fallback
);

export const getClinicSecondaryName = (clinic = {}) => {
  const brandName = cleanText(clinic?.brandName);
  const legalName = cleanText(clinic?.legalName);

  return brandName && legalName && brandName !== legalName ? legalName : '';
};

export const formatLocalizedDate = (value, language = 'en', fallback = EMPTY_DISPLAY_VALUE) => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const locale = String(language).toLowerCase().startsWith('id') ? 'id-ID' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const getBranchCount = (clinic = {}) => {
  if (Array.isArray(clinic?.branches)) return clinic.branches.length;

  const explicitCount = Number(clinic?.branchCount ?? clinic?.branchesCount);
  return Number.isFinite(explicitCount) && explicitCount >= 0
    ? Math.trunc(explicitCount)
    : 0;
};

export const getBranchPreview = (clinic = {}, limit = 2) => {
  if (!Array.isArray(clinic?.branches)) return [];

  return clinic.branches
    .map((branch) => cleanText(branch?.branchName))
    .filter(Boolean)
    .slice(0, limit);
};

export const formatBranchAddress = (branch = {}, fallback = EMPTY_DISPLAY_VALUE) => {
  const addressParts = [
    branch?.streetAddress,
    branch?.city,
    branch?.province,
    branch?.postalCode
  ]
    .map(cleanText)
    .filter(Boolean);

  return addressParts.length ? [...new Set(addressParts)].join(', ') : fallback;
};

export const readNonNegativeInteger = (value) => {
  if (value === '' || value === null || value === undefined) return null;

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
};
