import { PrismaClient } from '@prisma/client';
import { redactSensitiveData } from '../../utils/redact.js';

const prisma = new PrismaClient();

/**
 * Record a financial audit log in an append-only table.
 * All sensitive values are sanitized before saving to database.
 */
export async function recordFinancialAuditLog({
  actorId,
  actorRole,
  entityType,
  entityId,
  action,
  metadata = {},
  req = null
}) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null;
    
    // Sanitize metadata to remove secrets, tokens, card info
    const sanitizedMetadata = redactSensitiveData(metadata);

    const log = await prisma.financialAuditLog.create({
      data: {
        actorId: actorId ? BigInt(actorId) : null,
        actorRole: actorRole || (req?.user?.roles?.[0] || 'anonymous'),
        entityType,
        entityId: String(entityId),
        action,
        metadata: sanitizedMetadata || {},
        ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null
      }
    });

    return log;
  } catch (err) {
    // Log error but do not throw to avoid crashing parent transactional processes
    console.error('[FinancialAuditLog] Failed to write audit log:', err);
    return null;
  }
}
