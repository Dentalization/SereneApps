// A full-arch capture is two independently reconstructed jaw scans.
// This verifies their association, never anatomical coverage or mesh quality.
const badPair = (message, code) => Object.assign(new Error(message), { status: 400, code });

export async function resolveFullArchPair(protocol, scanScope, patientId, dentistId, lookupUpper) {
  if (protocol?.mode !== 'full_arch_pair') return null;
  if (protocol.sequence === 1 && protocol.arch === 'upper' && scanScope === 'upper') {
    return { mode: 'full_arch_pair', sequence: 1, arch: 'upper', associationVerifiedByServer: true };
  }
  if (protocol.sequence !== 2 || protocol.arch !== 'lower' || scanScope !== 'lower') {
    throw badPair('Invalid full-arch capture sequence', 'INVALID_FULL_ARCH_SEQUENCE');
  }
  const id = String(protocol.pairedUpperScanId ?? '');
  if (!/^[1-9]\d*$/.test(id) || BigInt(id) > 9223372036854775807n) {
    throw badPair('A recorded upper-arch scan for this patient and dentist is required', 'FULL_ARCH_UPPER_REQUIRED');
  }
  const upper = await lookupUpper({ id: BigInt(id), patientId, dentistId });
  if (!upper || upper.metadata?.fullArchPair?.arch !== 'upper'
      || upper.metadata?.fullArchPair?.associationVerifiedByServer !== true
      || !upper.metadata?.videoFileName) {
    throw badPair('A recorded upper-arch scan for this patient and dentist is required', 'FULL_ARCH_UPPER_REQUIRED');
  }
  return { mode: 'full_arch_pair', sequence: 2, arch: 'lower',
    upperScanId: upper.id.toString(), pairGroupId: upper.folderName, associationVerifiedByServer: true };
}
