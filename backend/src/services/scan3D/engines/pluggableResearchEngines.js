import { BaseReconstructionEngine } from './baseReconstructionEngine.js';

// These names reserve integration points; none of these external algorithms is installed here.
// Never delegate to a different algorithm and return its result under a research model's name.
class ResearchScaffold extends BaseReconstructionEngine {
  constructor(name, displayName, gpuRequired = false) {
    super({ name, displayName, version: null, implementationStatus: 'scaffold',
      isAvailable: false, executionBackend: null, gpuRequired,
      description: 'Unavailable research adapter. No external model execution is implemented.' });
  }
}
export class ColmapEngine extends ResearchScaffold {
  constructor() { super('colmap', 'COLMAP — unavailable adapter'); }
}
export class Dust3rEngine extends ResearchScaffold {
  constructor() { super('dust3r', 'DUSt3R — unavailable adapter', true); }
}
export class Mast3rEngine extends ResearchScaffold {
  constructor() { super('mast3r', 'MASt3R — unavailable adapter', true); }
}
export class NeuralangeloEngine extends ResearchScaffold {
  constructor() { super('neuralangelo', 'Neuralangelo — unavailable adapter', true); }
}
export class AbotReconEngine extends ResearchScaffold {
  constructor() { super('abot_recon', 'ABot-Recon — unavailable adapter', true); }
}
