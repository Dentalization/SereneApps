export async function recordStatusChange(tx, {
  appointmentId,
  previousStatus,
  newStatus,
  changedBy,
  changedByRole,
  reason,
  notes,
  metadata
}) {
  if (!tx || !appointmentId || !newStatus) {
    console.error('[recordStatusChange] Invalid parameters:', { tx: !!tx, appointmentId, newStatus });
    throw new Error('Invalid parameters for status history logging');
  }

  console.log('[recordStatusChange] Creating status history:', {
    appointmentId: appointmentId.toString(),
    previousStatus,
    newStatus,
    changedBy: changedBy?.toString(),
    changedByRole
  });

  const result = await tx.appointmentStatusHistory.create({
    data: {
      appointmentId: BigInt(appointmentId),
      previousStatus: previousStatus || null,
      newStatus,
      changedBy: changedBy ? BigInt(changedBy) : null,
      changedByRole: changedByRole || null,
      reason: reason || null,
      notes: notes || null,
      metadata: metadata || {}
    }
  });
  
  console.log('[recordStatusChange] ✅ Status history created:', { id: result.id.toString() });
  return result;
}
