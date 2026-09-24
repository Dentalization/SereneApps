/**
 * Geometry-preserving default. Anatomical curve fitting cannot establish dental anatomy.
 * An optional axis-aligned ROI is an explicit experiment operation, in input coordinates.
 * It never deforms vertices, fills holes, fabricates normals, or labels tissue.
 */
export class DentalMeshFilter {
  static applyDentalFilters(rawMesh, options = {}) {
    const { vertices, normals = [], faces = [] } = rawMesh;
    const indexBase = options.indexBase ?? 1;
    if (![0, 1].includes(indexBase) || !Array.isArray(vertices) || !vertices.length ||
      vertices.some(v => !Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite))) {
      throw new Error('Invalid mesh vertices or explicit face index base');
    }
    if (faces.some(f => !Array.isArray(f) || f.length !== 3 || f.some(i => !Number.isInteger(i) || i < indexBase || i >= vertices.length + indexBase))) {
      throw new Error('Invalid triangle vertex index');
    }
    const roi = options.roi ?? null;
    if (roi && (!Array.isArray(roi.min) || !Array.isArray(roi.max) || roi.min.length !== 3 || roi.max.length !== 3 ||
      !roi.min.every((x, i) => Number.isFinite(x) && Number.isFinite(roi.max[i]) && x < roi.max[i]))) {
      throw new Error('ROI requires finite ordered bounds in the input coordinate system');
    }
    const newVertices = [], newNormals = [], remap = new Map();
    vertices.forEach((v, i) => {
      if (!roi || v.every((x, axis) => x >= roi.min[axis] && x <= roi.max[axis])) {
        remap.set(i + indexBase, newVertices.length + indexBase);
        newVertices.push([...v]);
        if (normals[i]) newNormals.push([...normals[i]]);
      }
    });
    if (!newVertices.length) throw new Error('ROI excludes all geometry');
    const newFaces = faces.filter(f => f.every(i => remap.has(i))).map(f => f.map(i => remap.get(i)));
    const bounds = { min: [...newVertices[0]], max: [...newVertices[0]] };
    for (const v of newVertices) for (let i = 0; i < 3; i++) {
      bounds.min[i] = Math.min(bounds.min[i], v[i]); bounds.max[i] = Math.max(bounds.max[i], v[i]);
    }
    return { vertices: newVertices, normals: newNormals, faces: newFaces, bounds,
      metrics: { processingVersion: 'geometry-preserving-2', method: roi ? 'explicit_roi' : 'identity',
        enabled: Boolean(roi), configuration: { roi, indexBase }, coordinateTransform: 'identity',
        originalVertexCount: vertices.length, filteredVertexCount: newVertices.length,
        filteredFaceCount: newFaces.length, anatomicalSegmentation: false }, logs: [] };
  }
}
