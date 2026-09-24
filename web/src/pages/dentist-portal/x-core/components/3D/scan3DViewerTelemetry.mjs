/** Local browser observations, never clinical or dataset evidence. Bounded sample storage. */
export function createScanViewerTelemetry({ now = () => performance.now() } = {}) {
  const samples = {};
  const facts = {};
  return {
    start: () => now(),
    record(name, started) {
      const elapsed = now() - started;
      if (!Number.isFinite(elapsed) || elapsed < 0) return;
      const list = samples[name] || (samples[name] = []);
      list.push(elapsed);
      if (list.length > 240) list.shift();
    },
    fact(name, value) { facts[name] = value; },
    snapshot() {
      const durationsMs = Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, {
        count: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values), latest: values[values.length - 1],
      }]));
      return { schemaVersion: 1, evidence: 'local_browser_observation', measuredAt: new Date().toISOString(),
        durationsMs, facts: { ...facts }, fps: null, gpuMemoryBytes: null,
        limitations: 'Render timings measure CPU submission; GPU completion, FPS and GPU memory are not measured.' };
    },
  };
}
