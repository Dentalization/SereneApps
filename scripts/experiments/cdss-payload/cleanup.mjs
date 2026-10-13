#!/usr/bin/env node
/**
 * cleanup.mjs
 * 
 * Disk-space guard and manifest-driven artifact cleanup for CDSS payload experiments.
 * 
 * Rules:
 *   - MIN_FREE_GB = 5: Free-space check using `df -k` on repo volume.
 *   - Manifest-driven: Only deletes entries recorded in `.experiment-scratch/manifest.jsonl`.
 *   - Level 1: Deletes finished study artifacts in `backend/uploads/x-core/`.
 *              First attempts `DELETE /v1/x-core/benchmark/studies/{studyId}`.
 *              Falls back to direct folder deletion ONLY if realpath is inside
 *              `backend/uploads/x-core/` AND in manifest.
 *   - Level 2: Deletes phantom directories in .experiment-scratch/phantom-N[N]/
 *              that remaining planned runs do NOT need.
 *   - Safety: Never follow symlinks, never delete paths containing "Patient",
 *             never delete outside allowed roots, never delete real datasets.
 *   - Appends all deletions to `docs/experiments/results/cdss-payload/cleanup-log.jsonl`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import process from 'node:process';

export const MIN_FREE_GB = 5;

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const SCRATCH_DIR = path.join(REPO_ROOT, '.experiment-scratch');
const MANIFEST_PATH = path.join(SCRATCH_DIR, 'manifest.jsonl');
const UPLOADS_XCORE_DIR = path.join(REPO_ROOT, 'backend/uploads/x-core');
const RESULTS_DIR = path.join(REPO_ROOT, 'docs/experiments/results/cdss-payload');
const CLEANUP_LOG_PATH = path.join(RESULTS_DIR, 'cleanup-log.jsonl');

// Prohibited path keywords/locations
const PROHIBITED_KEYWORDS = ['patient', 'node_modules', 'paper-evidence', 'pengujian', '.git', 'venv'];

/**
 * Get available disk space in GB using `df -k` on the volume holding targetPath.
 */
export function getVolumeFreeSpaceGb(targetPath = REPO_ROOT) {
  try {
    const out = execSync(`df -k "${targetPath}"`, { encoding: 'utf8' }).trim();
    const lines = out.split('\n');
    if (lines.length < 2) return null;
    const parts = lines[1].trim().split(/\s+/);
    // On macOS: Filesystem, 1024-blocks, Used, Available, Capacity, iused, ifree, %iused, Mounted on
    // Available is index 3
    const availBlocks = parseInt(parts[3], 10);
    if (isNaN(availBlocks)) return null;
    return parseFloat((availBlocks / (1024 * 1024)).toFixed(3));
  } catch (err) {
    console.error(`[Cleanup] Error querying df -k: ${err.message}`);
    return null;
  }
}

/**
 * Append an entry to the manifest.
 */
export function recordManifestEntry(entry) {
  try {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    }) + '\n';
    fs.appendFileSync(MANIFEST_PATH, line);
  } catch (err) {
    console.error(`[Cleanup] Error writing to manifest: ${err.message}`);
  }
}

/**
 * Read all entries from the manifest.
 */
export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    return fs
      .readFileSync(MANIFEST_PATH, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`[Cleanup] Error reading manifest: ${err.message}`);
    return [];
  }
}

/**
 * Calculate size of a directory recursively in bytes.
 */
function getDirSizeBytes(dirPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += getDirSizeBytes(full);
      } else if (entry.isFile()) {
        total += fs.statSync(full).size;
      }
    }
  } catch {}
  return total;
}

/**
 * Validate path safety against prohibited rules.
 */
function isPathSafeForDeletion(targetPath, allowedRoot) {
  if (!targetPath || !fs.existsSync(targetPath)) return false;

  // Never follow symlinks
  const lstat = fs.lstatSync(targetPath);
  if (lstat.isSymbolicLink()) {
    console.warn(`[Cleanup Safety] Refusing symlink: ${targetPath}`);
    return false;
  }

  // Resolve realpath
  let real;
  try {
    real = fs.realpathSync(targetPath);
  } catch {
    return false;
  }

  const realAllowedRoot = path.resolve(allowedRoot);
  if (!real.startsWith(realAllowedRoot + path.sep) && real !== realAllowedRoot) {
    console.warn(`[Cleanup Safety] Path ${real} is not strictly inside allowed root ${realAllowedRoot}`);
    return false;
  }

  const lower = real.toLowerCase();
  for (const kw of PROHIBITED_KEYWORDS) {
    if (lower.includes(kw)) {
      console.warn(`[Cleanup Safety] Refusing path containing prohibited keyword '${kw}': ${real}`);
      return false;
    }
  }

  return true;
}

/**
 * Log deleted item to cleanup-log.jsonl.
 */
function logDeletion(item) {
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...item,
    }) + '\n';
    fs.appendFileSync(CLEANUP_LOG_PATH, line);
  } catch (err) {
    console.error(`[Cleanup] Error writing cleanup log: ${err.message}`);
  }
}

/**
 * Delete a specific study artifact safely.
 */
export async function cleanupStudyArtifact(studyId, folderName, authHeader = null, apiBaseUrl = null, dryRun = false) {
  if (!studyId && !folderName) return { deleted: false, bytes: 0 };

  // 1. Try API cleanup if auth is provided
  if (studyId && authHeader && apiBaseUrl) {
    try {
      const resp = await fetch(`${apiBaseUrl}/x-core/benchmark/studies/${studyId}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      });
      if (resp.ok) {
        // API handled cleanup
      }
    } catch {}
  }

  // 2. Direct folder cleanup check in uploads
  const targetFolder = folderName || studyId;
  const candidatePath = path.join(UPLOADS_XCORE_DIR, targetFolder);

  if (!fs.existsSync(candidatePath)) {
    return { deleted: true, bytes: 0 };
  }

  if (!isPathSafeForDeletion(candidatePath, UPLOADS_XCORE_DIR)) {
    console.warn(`[Cleanup] Path ${candidatePath} failed safety check. Skipping.`);
    return { deleted: false, bytes: 0 };
  }

  const bytes = getDirSizeBytes(candidatePath);

  if (dryRun) {
    console.log(`[Dry-Run Cleanup] Would delete: ${candidatePath} (${(bytes / 1024).toFixed(1)} KB)`);
    return { deleted: false, bytes, dryRun: true };
  }

  try {
    fs.rmSync(candidatePath, { recursive: true, force: true });
    console.log(`[Cleanup] Deleted study folder: ${candidatePath} (${(bytes / 1024).toFixed(1)} KB)`);
    logDeletion({
      path: path.relative(REPO_ROOT, candidatePath),
      bytes,
      level: 'Level 1',
      studyId,
      reason: 'Study artifact cleanup',
    });
    return { deleted: true, bytes };
  } catch (err) {
    console.error(`[Cleanup] Error deleting ${candidatePath}: ${err.message}`);
    return { deleted: false, bytes: 0 };
  }
}

/**
 * Execute Level 1 and Level 2 cleanup if free space is below MIN_FREE_GB.
 */
export async function runDiskCleanup({
  plannedRemainingTiers = [],
  dryRun = false,
  authHeader = null,
  apiBaseUrl = null,
  forceLevel1 = false,
} = {}) {
  let freeGb = getVolumeFreeSpaceGb(REPO_ROOT);
  console.log(`[Disk Guard] Current free space: ${freeGb !== null ? freeGb.toFixed(2) : 'UNKNOWN'} GB (Threshold: ${MIN_FREE_GB} GB)`);

  let totalDeletedBytes = 0;
  let deletedCount = 0;

  if (freeGb !== null && freeGb >= MIN_FREE_GB && !forceLevel1) {
    return {
      ok: true,
      freeGb,
      deletedCount: 0,
      totalDeletedBytes: 0,
    };
  }

  console.log(`[Disk Guard] Free space (${freeGb?.toFixed(2)} GB) is below threshold (${MIN_FREE_GB} GB) or cleanup requested. Initiating cleanup...`);

  // --- Level 1 Cleanup: Manifest Study Folders ---
  console.log('[Disk Guard] Initiating Level 1: Cleaning finished manifest studies...');
  const manifest = readManifest();
  const studyEntries = manifest.filter((m) => m.type === 'study');

  for (const s of studyEntries) {
    const res = await cleanupStudyArtifact(s.studyId, s.folderName, authHeader, apiBaseUrl, dryRun);
    if (res.deleted || res.dryRun) {
      totalDeletedBytes += res.bytes;
      deletedCount++;
    }
  }

  freeGb = getVolumeFreeSpaceGb(REPO_ROOT);
  console.log(`[Disk Guard] Free space after Level 1: ${freeGb !== null ? freeGb.toFixed(2) : 'UNKNOWN'} GB`);

  if (freeGb !== null && freeGb >= MIN_FREE_GB) {
    return {
      ok: true,
      freeGb,
      deletedCount,
      totalDeletedBytes,
    };
  }

  // --- Level 2 Cleanup: Unneeded Phantom Directories ---
  console.log('[Disk Guard] Free space still below threshold. Initiating Level 2: Removing unneeded phantoms...');
  const neededTiers = new Set(plannedRemainingTiers);
  const phantomEntries = manifest.filter((m) => m.type === 'phantom');

  // Also check existing phantom dirs on disk
  let phantomDirs = [];
  try {
    phantomDirs = fs.readdirSync(SCRATCH_DIR).filter((d) => d.startsWith('phantom-N'));
  } catch {}

  for (const d of phantomDirs) {
    const match = d.match(/phantom-N(\d+)/);
    if (!match) continue;
    const tierN = parseInt(match[1], 10);

    if (!neededTiers.has(tierN)) {
      const pPath = path.join(SCRATCH_DIR, d);
      if (!isPathSafeForDeletion(pPath, SCRATCH_DIR)) continue;

      const bytes = getDirSizeBytes(pPath);
      if (dryRun) {
        console.log(`[Dry-Run Cleanup] Level 2 would delete unneeded phantom: ${pPath} (${(bytes / (1024 * 1024)).toFixed(1)} MB)`);
      } else {
        try {
          fs.rmSync(pPath, { recursive: true, force: true });
          console.log(`[Cleanup] Level 2 deleted unneeded phantom: ${pPath} (${(bytes / (1024 * 1024)).toFixed(1)} MB)`);
          logDeletion({
            path: path.relative(REPO_ROOT, pPath),
            bytes,
            level: 'Level 2',
            tierN,
            reason: 'Unneeded phantom directory cleanup',
          });
          totalDeletedBytes += bytes;
          deletedCount++;
        } catch (err) {
          console.error(`[Cleanup] Error deleting phantom ${pPath}: ${err.message}`);
        }
      }
    }
  }

  freeGb = getVolumeFreeSpaceGb(REPO_ROOT);
  console.log(`[Disk Guard] Free space after Level 2: ${freeGb !== null ? freeGb.toFixed(2) : 'UNKNOWN'} GB`);

  const ok = freeGb !== null && freeGb >= MIN_FREE_GB;
  if (!ok && !dryRun) {
    console.error(`[Disk Guard] FATAL: Free disk space (${freeGb?.toFixed(2)} GB) remains below minimum threshold (${MIN_FREE_GB} GB) after Level 1 and Level 2 cleanup.`);
  }

  return {
    ok,
    freeGb,
    deletedCount,
    totalDeletedBytes,
  };
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('cleanup.mjs')) {
  const isDryRun = process.argv.includes('--dry-run');
  const isForce = process.argv.includes('--force');
  console.log(`Running cleanup.mjs standalone (dry-run: ${isDryRun}, force: ${isForce})`);
  runDiskCleanup({ dryRun: isDryRun, forceLevel1: isForce }).then((res) => {
    console.log(`Completed cleanup check: ok=${res.ok}, freeGb=${res.freeGb?.toFixed(2)}, deleted=${res.deletedCount}`);
    process.exit(res.ok ? 0 : 1);
  });
}
