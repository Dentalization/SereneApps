/**
 * Fast Binary and ASCII STL (Standard Tessellation Language) Exporter
 * Generates compact 3D triangle mesh files compatible with dental CAD/CAM systems
 * and @kitware/vtk.js/IO/Geometry/STLReader with zero browser freezing.
 */

/**
 * Creates a binary STL buffer from vertices, faces, and normals.
 * @param {Array<[number, number, number]>} vertices - Array of [x, y, z] vertex coordinates.
 * @param {Array<[number, number, number]>} faces - Array of 1-based or 0-based [v1, v2, v3] vertex indices.
 * @param {Array<[number, number, number]>} [normals] - Optional array of [nx, ny, nz] normal vectors.
 * @param {string} [headerText='SereneApps 3D Dental Reconstruction'] - 80-byte header string.
 * @returns {Buffer} Binary STL buffer.
 */
export function exportBinarySTL(vertices, faces, normals = [], headerText = 'SereneApps 3D Dental Reconstruction') {
  const triangleCount = faces.length;
  // Binary STL format:
  // 80 bytes: Header
  // 4 bytes: Number of triangles (uint32 little-endian)
  // 50 bytes per triangle:
  //   12 bytes: Normal vector (3x float32)
  //   36 bytes: 3 Vertices (3x 3x float32)
  //    2 bytes: Attribute byte count (uint16 = 0)
  const bufferSize = 84 + triangleCount * 50;
  const buffer = Buffer.alloc(bufferSize);

  // 1. Write 80-byte header
  const headerBuf = Buffer.from(headerText.padEnd(80, ' ').substring(0, 80), 'ascii');
  headerBuf.copy(buffer, 0, 0, 80);

  // 2. Write triangle count
  buffer.writeUInt32LE(triangleCount, 80);

  // Determine if faces are 1-based (OBJ style) or 0-based
  const isOneBased = faces.length > 0 && (
    faces.some(f => f[0] === vertices.length || f[1] === vertices.length || f[2] === vertices.length) ||
    !faces.some(f => f[0] === 0 || f[1] === 0 || f[2] === 0)
  );

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const face = faces[i];
    const idx1 = isOneBased ? face[0] - 1 : face[0];
    const idx2 = isOneBased ? face[1] - 1 : face[1];
    const idx3 = isOneBased ? face[2] - 1 : face[2];

    const v1 = vertices[idx1] || [0, 0, 0];
    const v2 = vertices[idx2] || [0, 0, 0];
    const v3 = vertices[idx3] || [0, 0, 0];

    // Compute face normal if not provided
    let nx = 0;
    let ny = 0;
    let nz = 1;

    if (normals && normals[i]) {
      [nx, ny, nz] = normals[i];
    } else {
      // Cross product (v2 - v1) x (v3 - v1)
      const ax = v2[0] - v1[0];
      const ay = v2[1] - v1[1];
      const az = v2[2] - v1[2];

      const bx = v3[0] - v1[0];
      const by = v3[1] - v1[1];
      const bz = v3[2] - v1[2];

      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;

      const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1.0;
      nx = cx / len;
      ny = cy / len;
      nz = cz / len;
    }

    // Write Normal (3 x float32)
    buffer.writeFloatLE(nx, offset);
    buffer.writeFloatLE(ny, offset + 4);
    buffer.writeFloatLE(nz, offset + 8);

    // Write Vertex 1 (3 x float32)
    buffer.writeFloatLE(v1[0], offset + 12);
    buffer.writeFloatLE(v1[1], offset + 16);
    buffer.writeFloatLE(v1[2], offset + 20);

    // Write Vertex 2 (3 x float32)
    buffer.writeFloatLE(v2[0], offset + 24);
    buffer.writeFloatLE(v2[1], offset + 28);
    buffer.writeFloatLE(v2[2], offset + 32);

    // Write Vertex 3 (3 x float32)
    buffer.writeFloatLE(v3[0], offset + 36);
    buffer.writeFloatLE(v3[1], offset + 40);
    buffer.writeFloatLE(v3[2], offset + 44);

    // Write attribute byte count (uint16 = 0)
    buffer.writeUInt16LE(0, offset + 48);

    offset += 50;
  }

  return buffer;
}

/**
 * Creates ASCII STL string from vertices and faces.
 */
export function exportAsciiSTL(vertices, faces, normals = [], solidName = 'dental_mesh') {
  let stl = `solid ${solidName}\n`;
  const isOneBased = faces.length > 0 && !faces.some(f => f[0] === 0 || f[1] === 0 || f[2] === 0);

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    const idx1 = isOneBased ? face[0] - 1 : face[0];
    const idx2 = isOneBased ? face[1] - 1 : face[1];
    const idx3 = isOneBased ? face[2] - 1 : face[2];

    const v1 = vertices[idx1] || [0, 0, 0];
    const v2 = vertices[idx2] || [0, 0, 0];
    const v3 = vertices[idx3] || [0, 0, 0];

    let nx = 0;
    let ny = 0;
    let nz = 1;

    if (normals && normals[i]) {
      [nx, ny, nz] = normals[i];
    } else {
      const ax = v2[0] - v1[0];
      const ay = v2[1] - v1[1];
      const az = v2[2] - v1[2];

      const bx = v3[0] - v1[0];
      const by = v3[1] - v1[1];
      const bz = v3[2] - v1[2];

      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;

      const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1.0;
      nx = cx / len;
      ny = cy / len;
      nz = cz / len;
    }

    stl += `  facet normal ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${v1[0].toFixed(4)} ${v1[1].toFixed(4)} ${v1[2].toFixed(4)}\n`;
    stl += `      vertex ${v2[0].toFixed(4)} ${v2[1].toFixed(4)} ${v2[2].toFixed(4)}\n`;
    stl += `      vertex ${v3[0].toFixed(4)} ${v3[1].toFixed(4)} ${v3[2].toFixed(4)}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }

  stl += `endsolid ${solidName}\n`;
  return stl;
}
