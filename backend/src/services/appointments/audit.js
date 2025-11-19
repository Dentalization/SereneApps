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
    throw new Error('Invalid parameters for status history logging');
  }

  await tx.appointmentStatusHistory.create({
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
}
