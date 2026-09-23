/**
 * BaseReconstructionEngine
 * Standardized conceptual interface for all 3D dental reconstruction engines.
 *
 * ReconstructionService Abstraction:
 *  Input:
 *    - frames: Array of selected, clean keyframe objects or file paths (from LIDRA)
 *    - cameraMetadata: Resolution, FPS, sensor characteristics, estimated focal length
 *    - scanScope: 'full' | 'upper' | 'lower'
 *    - studyDir: Target directory for asset storage
 *    - lidraReport: Acquisition metrics and coverage information
 *    - options: Engine-specific parameters
 *
 *  Process:
 *    - process({ study, frames, cameraMetadata, scanScope, studyDir, lidraReport, options })
 *
 *  Output:
 *    - pointCloud: { fileName: 'mesh.ply', format: 'ply', sizeInBytes, vertexCount, assetUrl }
 *    - mesh: { fileName: 'mesh.obj', format: 'obj', sizeInBytes, vertexCount, faceCount, bounds, assetUrl }
 *    - cameraTrajectory: Array of estimated camera poses / trajectory points
 *    - confidence: Confidence score between 0.0 and 1.0
 *    - preview: { fileName: 'preview.png', format: 'png', sizeInBytes, assetUrl }
 *    - metadata: { engineName, engineVersion, durationMs, ... }
 *    - logs: Array of { timestamp, stage, level, message }
 */
export class BaseReconstructionEngine {
  constructor({
    name,
    displayName,
    version = '1.0.0',
    description = '',
    capabilities = ['surface_mesh', 'point_cloud'],
    isAvailable = true,
  }) {
    if (!name) {
      throw new Error('Engine must provide a unique name');
    }
    this.name = name;
    this.displayName = displayName || name;
    this.version = version;
    this.description = description;
    this.capabilities = capabilities;
    this.isAvailable = isAvailable;
  }

  /**
   * Process method to be implemented by all concrete reconstruction engines.
   */
  async process(input) {
    throw new Error(`process() method must be implemented by ${this.constructor.name}`);
  }

  /**
   * Returns metadata summarizing the engine's capabilities and status.
   */
  getDescriptor() {
    return {
      name: this.name,
      displayName: this.displayName,
      version: this.version,
      description: this.description,
      capabilities: this.capabilities,
      isAvailable: this.isAvailable,
    };
  }
}
