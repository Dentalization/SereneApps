export function normalizePatientPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `+62${digits}`;
  if (digits.startsWith('62')) return `+${digits}`;
  return `+${digits}`;
}

function patientPhoneAliases(phone) {
  const canonical = normalizePatientPhone(phone);
  if (!canonical) return [];
  const digits = canonical.slice(1);
  const subscriber = digits.startsWith('62') ? digits.slice(2) : digits;
  return [...new Set([canonical, digits, subscriber, `0${subscriber}`])];
}

export async function withPatientIdentityTransaction(prisma, operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === maxRetries) throw error;
    }
  }
  throw new Error('Patient identity transaction exhausted retries');
}

export async function findPatientByIdentity(tx, { email, phone }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const phoneAliases = patientPhoneAliases(phone);

  if (phoneAliases.length) {
    const byPhone = await tx.user.findFirst({
      where: {
        roles: { has: 'patient' },
        phone_number: { in: phoneAliases }
      },
      include: { patientProfile: true },
      orderBy: { id: 'asc' }
    });
    if (byPhone) return byPhone;
  }

  if (!normalizedEmail) return null;
  const user = await tx.user.findUnique({
    where: { email: normalizedEmail },
    include: { patientProfile: true }
  });
  return user?.roles?.includes('patient') ? user : null;
}
