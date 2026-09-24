import { PhotogrammetryNativeEngine } from './photogrammetryNativeEngine.js';
import { PythonServiceEngine } from './pythonServiceEngine.js';
import {
  ColmapEngine,
  Dust3rEngine,
  Mast3rEngine,
  NeuralangeloEngine,
  AbotReconEngine,
} from './pluggableResearchEngines.js';

class ReconstructionEngineRegistry {
  constructor() {
    this.engines = new Map();
    this.defaultEngineName = 'opencv_sparse_sfm';
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(new PhotogrammetryNativeEngine());
    this.register(new PythonServiceEngine());
    this.register(new PythonServiceEngine('python_reconstruction_service'));
    this.register(new ColmapEngine());
    this.register(new Dust3rEngine());
    this.register(new Mast3rEngine());
    this.register(new NeuralangeloEngine());
    this.register(new AbotReconEngine());
  }

  /**
   * Registers a new reconstruction engine instance.
   */
  register(engine) {
    if (!engine || !engine.name) {
      throw new Error('Engine must be an instance with a valid name');
    }
    this.engines.set(engine.name, engine);
  }

  /**
   * Retrieves exactly the requested engine. Missing implementations fail closed.
   */
  get(engineName) {
    if (!engineName) {
      return this.engines.get(this.defaultEngineName);
    }
    const engine = this.engines.get(engineName);
    if (!engine) {
      throw Object.assign(new Error(`Unknown reconstruction engine: ${engineName}`), {
        code: 'UNKNOWN_ENGINE', status: 400, retryable: false,
      });
    }
    return engine;
  }

  /**
   * Lists descriptors of all registered engines.
   */
  list() {
    const list = [];
    for (const [name, engine] of this.engines.entries()) {
      list.push({
        ...engine.getDescriptor(),
        isDefault: name === this.defaultEngineName,
      });
    }
    return list;
  }

  /**
   * Returns the default engine instance.
   */
  getDefaultEngine() {
    return this.engines.get(this.defaultEngineName);
  }
}

// Export singleton instance
export const reconstructionEngineRegistry = new ReconstructionEngineRegistry();
