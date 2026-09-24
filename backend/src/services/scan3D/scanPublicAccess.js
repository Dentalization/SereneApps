import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export function isPrivateScanProxyPath(rawPath) {
  let pathname;
  try { pathname = new URL(rawPath, 'http://localhost').pathname; for (let i = 0; i < 3; i += 1) pathname = decodeURIComponent(pathname); }
  catch { return true; }
  return /^\/(reconstruct|lidra|segment)(\/|$)/i.test(pathname) || /SCAN-3D-|3d-scans|private\/|\.\./i.test(pathname);
}

export async function denyPublicScanUploads(req, res, next) {
  try {
    const folder = req.params.folder;
    const reserved = /^SCAN-3D-/i.test(folder);
    const scan = reserved ? true : await prisma.imagingStudy.findFirst({ where: { folderName: folder, modality: '3D_SCAN' }, select: { id: true } });
    if (scan) return res.status(404).json({ error: 'Scan files require the authenticated scan asset API' });
    return next();
  } catch { return res.status(503).json({ error: 'Asset authorization is temporarily unavailable' }); }
}
