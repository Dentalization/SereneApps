/** Fail closed for legacy, synthetic, unscaled, or unvalidated reconstruction assets. */
export function resolveScanAssetCapability(asset = {}) {
  const requested = asset.measurementCapability;
  const scaleValidated = asset.scale?.status === 'validated' && asset.units === 'mm';
  const coordinateKnown = typeof asset.coordinateSystem === 'string'
    && !['unknown', 'unavailable', ''].includes(asset.coordinateSystem);
  const realGeometry = asset.provenance?.synthetic === false;
  const researchValidated = asset.validation?.status === 'validated';
  const clinicalValidated = asset.validated === true
    && ['clinically_evaluated', 'clinical_production'].includes(asset.clinicalStatus);
  const allowed = realGeometry && scaleValidated && coordinateKnown && researchValidated;
  const capability = allowed && requested === 'validated_measurement' && clinicalValidated
    ? 'validated_measurement'
    : allowed && requested === 'research_measurement' ? 'research_measurement' : 'visualization_only';
  return { capability, canMeasure: capability !== 'visualization_only',
    clinicalStatus: asset.clinicalStatus || 'experimental',
    units: asset.units || 'unknown', coordinateSystem: asset.coordinateSystem || 'unknown',
    scaleStatus: asset.scale?.status || 'unknown' };
}

// Annotations cannot be carried across changed geometry or across users.
export function scanAnnotationStorageKey({ scanId, ownerId, asset }) {
  const identity = asset?.sha256 || asset?.checksum?.sha256;
  if (!scanId || !ownerId || !/^[a-f0-9]{64}$/i.test(identity || '')) return null;
  return `xcore.annotations.${ownerId}.${scanId}.scan3d.${identity}`;
}

export function scanAssetPath(scanId, asset) {
  const prefix = `/v1/x-core/3d-scans/${encodeURIComponent(scanId)}/assets/`;
  const path = asset?.assetUrl;
  if (typeof path !== 'string' || !path.startsWith(prefix)) return null;
  const filename = path.slice(prefix.length);
  return /^[a-zA-Z0-9_-]+\.(stl|ply|obj)$/.test(filename) ? path : null;
}

export const MAX_SCAN_ASSET_BYTES = 128 * 1024 * 1024;
export async function readBoundedAsset(response, maxBytes = MAX_SCAN_ASSET_BYTES) {
  if (Number(response.headers.get('Content-Length')) > maxBytes) throw new Error('Aset melebihi batas memori unduhan viewer (128 MiB).');
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error('Aset terlalu besar untuk viewer.');
    return buffer;
  }
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new Error('Aset terlalu besar untuk viewer.'); }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return data.buffer;
}
