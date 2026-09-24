/** Describes implemented code separately from runtime availability and validation. */
export class BaseReconstructionEngine {
  constructor({ name, displayName, version = null, description = '', capabilities = [],
    implementationStatus = 'scaffold', isAvailable = false, executionBackend = null,
    inputRequirements = ['verified_video'], outputFormats = [], gpuRequired = false }) {
    if (!name) throw new Error('Engine must provide a unique name');
    Object.assign(this, { name, displayName: displayName || name, version, description, capabilities,
      implementationStatus, isAvailable, executionBackend, inputRequirements, outputFormats, gpuRequired });
  }

  async process() {
    throw Object.assign(new Error(`${this.name} has no installed reconstruction implementation`), {
      code: 'ENGINE_UNAVAILABLE', retryable: false,
    });
  }

  getDescriptor() {
    return {
      name: this.name, engine: this.name, displayName: this.displayName, version: this.version,
      description: this.description, capabilities: this.capabilities,
      implementationStatus: this.implementationStatus,
      isAvailable: this.isAvailable, available: this.isAvailable,
      availability: this.isAvailable === null ? 'unverified' : this.isAvailable ? 'available' : 'unavailable',
      executionBackend: this.executionBackend, inputRequirements: this.inputRequirements,
      outputFormats: this.outputFormats, gpuRequired: this.gpuRequired,
      experimental: true, validated: false, clinicallyValidated: false,
    };
  }
}
