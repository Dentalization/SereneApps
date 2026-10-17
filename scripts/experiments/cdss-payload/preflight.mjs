#!/usr/bin/env node
/**
 * preflight.mjs
 * 
 * Strict preflight gate for CDSS benchmark runs on Apple Silicon.
 * Exits non-zero unless ALL conditions hold:
 *   1. On AC power ('AC Power' in `pmset -g batt`)
 *   2. Swap used <= MAX_SWAP_USED_MB (default: 500 MB)
 *   3. Available memory (free + inactive + speculative) >= MIN_AVAILABLE_MEM_MB (default: 3000 MB)
 *   4. Thermal state normal (`pmset -g therm` indicates no thermal warning)
 * 
 * When failing, prints the top 10 processes by RSS and what to close. No retry loops.
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

// Strict preflight constants (strict defaults per Prompt 03e, no environment overrides allowed)
export const PREFLIGHT_CONFIG = {
  MAX_SWAP_USED_MB: 500,
  MIN_AVAILABLE_MEM_MB: 3000,
  REQUIRE_AC_POWER: true,
  REQUIRE_NORMAL_THERMAL: true,
};

export function getSystemState() {
  // 1. Power State
  let powerSource = 'Unknown';
  let isAcPower = false;
  try {
    const battOut = execSync('pmset -g batt', { encoding: 'utf8' });
    if (battOut.includes("'AC Power'")) {
      powerSource = 'AC Power';
      isAcPower = true;
    } else if (battOut.includes("'Battery Power'")) {
      powerSource = 'Battery Power';
      isAcPower = false;
    }
  } catch (err) {
    powerSource = `Error: ${err.message}`;
  }

  // 2. Swap Usage
  let swapUsedMb = null;
  let swapTotalMb = null;
  let swapFreeMb = null;
  try {
    const swapOut = execSync('sysctl vm.swapusage', { encoding: 'utf8' }).trim();
    const matchUsed = swapOut.match(/used\s*=\s*([0-9.]+)([MGK]?)/);
    const matchTotal = swapOut.match(/total\s*=\s*([0-9.]+)([MGK]?)/);
    const matchFree = swapOut.match(/free\s*=\s*([0-9.]+)([MGK]?)/);

    const parseUnit = (val, unit) => {
      const num = parseFloat(val);
      if (unit === 'G') return num * 1024;
      if (unit === 'M') return num;
      if (unit === 'K') return num / 1024;
      return num / (1024 * 1024);
    };

    if (matchUsed) swapUsedMb = parseUnit(matchUsed[1], matchUsed[2]);
    if (matchTotal) swapTotalMb = parseUnit(matchTotal[1], matchTotal[2]);
    if (matchFree) swapFreeMb = parseUnit(matchFree[1], matchFree[2]);
  } catch (err) {
    console.error(`[Preflight] Error reading swap usage: ${err.message}`);
  }

  // 3. Memory Availability
  let availableMemMb = null;
  let freeMb = null;
  let inactiveMb = null;
  let speculativeMb = null;
  try {
    const vmStat = execSync('vm_stat', { encoding: 'utf8' });
    const pageSize = 16384;
    const getPages = (key) => {
      const m = vmStat.match(new RegExp(`${key}:\\s+([0-9]+)\\.`));
      return m ? parseInt(m[1], 10) : 0;
    };
    const freePages = getPages('Pages free');
    const inactivePages = getPages('Pages inactive');
    const speculativePages = getPages('Pages speculative');
    freeMb = (freePages * pageSize) / (1024 * 1024);
    inactiveMb = (inactivePages * pageSize) / (1024 * 1024);
    speculativeMb = (speculativePages * pageSize) / (1024 * 1024);
    availableMemMb = freeMb + inactiveMb + speculativeMb;
  } catch (err) {
    console.error(`[Preflight] Error reading vm_stat: ${err.message}`);
  }

  // 4. Thermal State
  let isThermalNormal = false;
  let thermalOutput = '';
  try {
    thermalOutput = execSync('pmset -g therm', { encoding: 'utf8' }).trim();
    const lower = thermalOutput.toLowerCase();
    const hasWarnings = (
      lower.includes('fair') ||
      lower.includes('serious') ||
      lower.includes('critical') ||
      lower.includes('thermal warning level has been reached')
    );
    isThermalNormal = !hasWarnings;
  } catch (err) {
    thermalOutput = `Error: ${err.message}`;
  }

  return {
    powerSource,
    isAcPower,
    swapUsedMb,
    swapTotalMb,
    swapFreeMb,
    availableMemMb,
    freeMb,
    inactiveMb,
    speculativeMb,
    isThermalNormal,
    thermalOutput,
  };
}

export function getTopProcesses(count = 10) {
  try {
    const raw = execSync('ps -axo pid=,rss=,comm=', { encoding: 'utf8' });
    const lines = raw.trim().split('\n');
    const procs = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const pid = parts[0];
        const rssKb = parseInt(parts[1], 10);
        const command = parts.slice(2).join(' ');
        if (!isNaN(rssKb) && rssKb > 0) {
          procs.push({
            pid,
            rssKb,
            rssMb: (rssKb / 1024).toFixed(1),
            command,
          });
        }
      }
    }
    procs.sort((a, b) => b.rssKb - a.rssKb);
    return procs.slice(0, count);
  } catch (err) {
    return [{ pid: 'N/A', rssMb: 'N/A', command: `Failed to inspect ps: ${err.message}` }];
  }
}

export function evaluatePreflight(config = PREFLIGHT_CONFIG) {
  const state = getSystemState();
  const checks = [];

  // Check 1: AC Power
  const acPassed = !config.REQUIRE_AC_POWER || state.isAcPower;
  checks.push({
    name: 'AC Power Connection',
    required: 'AC Power (wall charger plugged in)',
    actual: state.powerSource,
    passed: acPassed,
  });

  // Check 2: Swap Used
  const swapPassed = state.swapUsedMb !== null && state.swapUsedMb <= config.MAX_SWAP_USED_MB;
  checks.push({
    name: 'Swap Usage',
    required: `<= ${config.MAX_SWAP_USED_MB} MB`,
    actual: state.swapUsedMb !== null ? `${state.swapUsedMb.toFixed(1)} MB` : 'UNKNOWN',
    passed: swapPassed,
  });

  // Check 3: Available Memory
  const memPassed = state.availableMemMb !== null && state.availableMemMb >= config.MIN_AVAILABLE_MEM_MB;
  checks.push({
    name: 'Available Memory (Free + Inactive + Speculative)',
    required: `>= ${config.MIN_AVAILABLE_MEM_MB} MB`,
    actual: state.availableMemMb !== null ? `${state.availableMemMb.toFixed(1)} MB` : 'UNKNOWN',
    passed: memPassed,
  });

  // Check 4: Thermal State
  const thermPassed = !config.REQUIRE_NORMAL_THERMAL || state.isThermalNormal;
  checks.push({
    name: 'Thermal State',
    required: 'Normal (no thermal pressure/throttling)',
    actual: state.isThermalNormal ? 'Normal' : `Throttled/Warning: ${state.thermalOutput}`,
    passed: thermPassed,
  });

  const allPassed = checks.every((c) => c.passed);

  return {
    allPassed,
    checks,
    state,
    config,
  };
}

export function runPreflightGate(config = PREFLIGHT_CONFIG, verbose = true) {
  const result = evaluatePreflight(config);

  if (verbose) {
    console.log('================================================================');
    console.log('Preflight Hardware & Operating System Cleanliness Gate');
    console.log('================================================================');
    console.log(`Configured thresholds:`);
    console.log(`  - Max Swap Allowed:     ${config.MAX_SWAP_USED_MB} MB`);
    console.log(`  - Min Memory Available: ${config.MIN_AVAILABLE_MEM_MB} MB`);
    console.log(`  - Require AC Power:     ${config.REQUIRE_AC_POWER}`);
    console.log(`  - Require Normal Therm: ${config.REQUIRE_NORMAL_THERMAL}`);
    console.log('----------------------------------------------------------------');

    for (const c of result.checks) {
      const statusIcon = c.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`[${statusIcon}] ${c.name}`);
      console.log(`        Required: ${c.required}`);
      console.log(`        Actual:   ${c.actual}`);
    }
    console.log('----------------------------------------------------------------');
  }

  if (!result.allPassed) {
    console.error('\nPREFLIGHT GATE FAILED! System environment is not clean for benchmarking.');
    console.error('To obtain reproducible measurements on an 8 GB Mac, close background processes.\n');

    console.log('Top 10 Processes by Resident Set Size (RSS):');
    console.log('----------------------------------------------------------------');
    console.log('PID\t\tRSS (MB)\tCOMMAND');
    console.log('----------------------------------------------------------------');
    const topProcs = getTopProcesses(10);
    for (const p of topProcs) {
      console.log(`${p.pid}\t\t${p.rssMb} MB\t\t${p.command.slice(0, 70)}`);
    }
    console.log('----------------------------------------------------------------');

    console.log('\nRemediation recommendations before Phase 2:');
    if (!result.state.isAcPower) {
      console.log('  1. Plug in the Apple USB-C power charger.');
    }
    if (result.state.swapUsedMb > config.MAX_SWAP_USED_MB) {
      console.log('  2. Reboot the Mac to flush active swapfiles (currently using ' + result.state.swapUsedMb.toFixed(0) + ' MB swap).');
    }
    console.log('  3. Close IDEs (Antigravity/Cursor/VSCode/Trae), Web Browsers (Chrome/Safari), Chat apps (Slack/Telegram/WhatsApp/Discord).');
    console.log('  4. Run the benchmark directly in macOS Terminal.app.\n');

    return false;
  }

  if (verbose) {
    console.log('✓ All preflight checks PASSED. System is clean and ready.\n');
  }
  return true;
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('preflight.mjs')) {
  const ok = runPreflightGate(PREFLIGHT_CONFIG, true);
  if (!ok) {
    process.exit(1);
  }
}
