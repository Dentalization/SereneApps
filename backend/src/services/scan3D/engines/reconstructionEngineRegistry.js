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
    this.defaultEngineName = 'photogrammetry_v1';
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(new PhotogrammetryNativeEngine());
    this.register(new PythonServiceEngine());
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
   * Retrieves an engine by name, falling back to the default engine if not found.
   */
  get(engineName) {
    if (!engineName) {
      return this.engines.get(this.defaultEngineName);
    }
    const engine = this.engines.get(engineName);
    if (!engine) {
      console.warn(`[EngineRegistry] Engine '${engineName}' not found. Falling back to '${this.defaultEngineName}'.`);
      return this.engines.get(this.defaultEngineName);
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
