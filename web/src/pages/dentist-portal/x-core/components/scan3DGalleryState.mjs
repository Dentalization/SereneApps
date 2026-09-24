export function scan3DGalleryState(study) {
    const status = study?.status;
    const metadata = study?.metadata || {};
    const mesh = metadata.assets?.mesh;
    const isStatusUnavailable = study?.scanStatusUnavailable === true;
    const isVerifiedMesh = !isStatusUnavailable && status === 'ready'
        && metadata.provenance?.geometrySource === 'image_derived'
        && metadata.provenance?.synthetic === false
        && metadata.qualityAssessment?.status === 'candidate'
        && Boolean(mesh?.fileName && (mesh?.sha256 || mesh?.checksum));
    const isFailed = !isStatusUnavailable && (status === 'failed' || (status === 'ready' && !isVerifiedMesh));
    const isInsufficient = isFailed && (metadata.qualityAssessment?.status === 'insufficient'
        || metadata.processingJob?.failureCode === 'RECONSTRUCTION_GEOMETRY_INSUFFICIENT');
    const isCapturePending = status === 'created' || status === 'pending_capture';
    const isProcessing = ['uploaded', 'queued', 'processing'].includes(status);

    return {
        isReady: isVerifiedMesh,
        isFailed,
        isInsufficient,
        isStatusUnavailable,
        isCapturePending,
        isProcessing,
        seriesStatus: isStatusUnavailable ? 'unavailable' : (isVerifiedMesh ? 'ready' : (isFailed ? 'failed' : (isCapturePending ? 'pending' : 'converting'))),
        seriesType: isVerifiedMesh ? '3D Mesh Eksperimental' : '3D Capture',
        previewUrl: isVerifiedMesh ? `/api/v1/x-core/3d-scans/${encodeURIComponent(study.id)}/assets/preview.png` : null,
        failureReason: isStatusUnavailable
            ? 'Status scan belum dapat diverifikasi dari server'
            : isFailed
            ? (metadata.processingJob?.failureReason || metadata.failureReason || 'Reconstruction mesh is unavailable')
            : null,
    };
}

export function formatGalleryStudy(study) {
    const patientAssigned = study.patientId !== null && study.patientId !== undefined;
    const patientName = study.modality === '3D_SCAN'
        ? (study.patient?.name || (patientAssigned ? `Patient P-${study.patientId}` : 'Unassigned scan'))
        : (study.metadata?.PatientName
            ? study.metadata.PatientName.replace(/\^/g, ' ').trim()
            : (study.originalName && study.originalName !== study.folderName && study.originalName !== 'Upload'
                ? study.originalName
                : (study.patient?.name || 'Unassigned study')));
    const scanStatus = study.modality === '3D_SCAN' ? scan3DGalleryState(study) : null;

    return {
        ...study,
        patientAssigned,
        patientName,
        realPatientId: study.patientId,
        patientIdDisplay: patientAssigned
            ? (study.metadata?.PatientID || `P-${study.patientId}`)
            : 'Not linked to patient',
        originalName: study.originalName || study.folderName || 'Unknown',
        statusDisplay: scanStatus
            ? (scanStatus.isStatusUnavailable ? 'Status Unavailable' : (scanStatus.isReady ? 'Mesh Eksperimental' : (scanStatus.isInsufficient ? 'Mesh Belum Memadai' : (scanStatus.isFailed ? 'Failed' : 'Processing'))))
            : ((study.status || 'Unknown').charAt(0).toUpperCase() + (study.status || 'unknown').slice(1)),
    };
}
