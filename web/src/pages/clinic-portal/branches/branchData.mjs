const text = (value) => (value == null ? '' : String(value).trim());

export function normalizeBranch(branch, owner = null) {
  if (!branch || typeof branch !== 'object') return null;

  return {
    ...branch,
    id: branch.id == null ? branch.id : String(branch.id),
    clinicProfileId: branch.clinicProfileId == null
      ? branch.clinicProfileId
      : String(branch.clinicProfileId),
    streetAddress: text(branch.streetAddress || branch.address),
    treatmentRoomsCount: Number(
      branch.treatmentRoomsCount ?? branch.treatment_rooms_count ?? branch.treatmentRooms ?? 0
    ),
    staffCount: Number(branch.staffCount ?? branch.staff_count ?? 0),
    monthlyPatients: Number(branch.monthlyPatients ?? branch.monthly_patients ?? 0),
    facilities: Array.isArray(branch.facilities) ? branch.facilities.filter(Boolean) : [],
    ownerEmail: branch.ownerEmail || owner?.email || null,
    ownerName: branch.ownerName || owner?.name || null,
    ownerWhatsapp: branch.ownerWhatsapp || owner?.whatsapp || null,
  };
}

export function branchToForm(branch) {
  const normalized = normalizeBranch(branch) || {};
  const hours = normalized.operatingHours;
  const operatingHours = typeof hours === 'string'
    ? hours
    : hours?.monday || '';

  return {
    branchName: text(normalized.branchName),
    address: normalized.streetAddress || '',
    city: text(normalized.city),
    province: text(normalized.province),
    district: text(normalized.district),
    postalCode: text(normalized.postalCode),
    latitude: normalized.latitude == null ? '' : String(normalized.latitude),
    longitude: normalized.longitude == null ? '' : String(normalized.longitude),
    phone: text(normalized.phone),
    operatingHours,
    treatmentRooms: normalized.treatmentRoomsCount,
    facilities: normalized.facilities,
    isMainBranch: Boolean(normalized.isMainBranch),
    status: normalized.isActive === false ? 'inactive' : 'active',
  };
}

export function formToBranchPayload(form) {
  const hours = text(form.operatingHours);
  return {
    branchName: text(form.branchName),
    streetAddress: text(form.address),
    city: text(form.city),
    province: text(form.province),
    district: text(form.district) || null,
    postalCode: text(form.postalCode),
    latitude: form.latitude === '' || form.latitude == null ? null : Number(form.latitude),
    longitude: form.longitude === '' || form.longitude == null ? null : Number(form.longitude),
    phone: text(form.phone) || null,
    treatmentRoomsCount: Number(form.treatmentRooms) || 1,
    facilities: Array.isArray(form.facilities) ? form.facilities.filter(Boolean) : [],
    operatingHours: {
      monday: hours,
      tuesday: hours,
      wednesday: hours,
      thursday: hours,
      friday: hours,
      saturday: hours,
      sunday: hours,
    },
    isMainBranch: Boolean(form.isMainBranch),
    isActive: form.status !== 'inactive',
  };
}
