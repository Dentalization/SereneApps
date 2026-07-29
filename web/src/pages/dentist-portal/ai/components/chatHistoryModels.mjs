import { normalizeVisualFindings } from './deepDentalSchemas.mjs';
import {
  buildVisualFindingsFromCaseAnalysis,
  resolveWorkspaceAssetUrl,
} from './caseAnalysisMapper.mjs';

function timestampValue(value) {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortChatHistoryOldestFirst(messages = []) {
  return messages
    .map((message, originalIndex) => ({ message, originalIndex }))
    .sort((left, right) => {
      const leftTimestamp = timestampValue(left.message?.timestamp || left.message?.created_at);
      const rightTimestamp = timestampValue(right.message?.timestamp || right.message?.created_at);
      if (leftTimestamp !== null && rightTimestamp !== null && leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ message }) => message);
}

function hasImageAnalysis(message) {
  const findings = message?.visualFindings;
  return message?.type === 'ai' && Boolean(findings && (
    findings.workspace_image_id ||
    findings.image_id ||
    findings.annotated_image_signed_url ||
    findings.annotated_image_base64 ||
    findings.detections?.length > 0 ||
    findings.findings?.length > 0
  ));
}

function auditContextForImage(auditEvents, imageId) {
  const match = auditEvents.find((event) => (
    event?.event_type === 'image_analysis_started' &&
    String(event?.after_json?.image_id || '') === String(imageId || '')
  ));
  return typeof match?.after_json?.context === 'string' ? match.after_json.context.trim() : '';
}

function findingsForImage(findings, imageId) {
  return findings.filter((finding) => String(finding?.image_id || '') === String(imageId || ''));
}

function analysisSnapshotForImage(auditEvents, imageId) {
  const snapshots = auditEvents.filter((event) => (
    event?.event_type === 'image_analysis_snapshot' &&
    String(event?.after_json?.image_id || '') === String(imageId || '') &&
    event?.after_json?.visual_findings
  ));
  return snapshots[snapshots.length - 1]?.after_json?.visual_findings || null;
}

function buildWorkspaceVisualFindings({ image, findings, auditEvents = [], authBaseUrl }) {
  const relatedFindings = findingsForImage(findings, image.id);
  const rawAiResult =
    analysisSnapshotForImage(auditEvents, image.id) ||
    relatedFindings.find((finding) => finding?.raw_ai_result)?.raw_ai_result ||
    {};

  return buildVisualFindingsFromCaseAnalysis({
    analysis: {
      findings: relatedFindings,
      visual_findings: rawAiResult,
      image: {
        ...image,
        annotated_image_signed_url: resolveWorkspaceAssetUrl(
          image.annotated_image_signed_url,
          authBaseUrl
        ),
      },
    },
    qualityCheck: image.quality_status ? { quality_status: image.quality_status } : null,
    authBaseUrl,
  });
}

function summaryFromVisualFindings(findings) {
  if (!findings) return '';
  const parts = [];
  const imageQuality = typeof findings.image_quality === 'string' ? findings.image_quality : 'dianalisis';
  parts.push(`**Kualitas Gambar:** ${imageQuality.toUpperCase()}`);

  if (findings.concern_level) {
    const concern = typeof findings.concern_level === 'string' ? findings.concern_level : 'tidak diketahui';
    parts.push(`**Tingkat Keparahan:** ${concern.toUpperCase()}`);
  }

  if (findings.detections?.length > 0) {
    parts.push(`\n**Patologi Terdeteksi (${findings.detections.length}):**`);
    const grouped = new Map();
    for (const detection of findings.detections) {
      const label = detection.label || 'Tidak diketahui';
      const group = grouped.get(label) || [];
      group.push(detection);
      grouped.set(label, group);
    }
    for (const [label, detections] of grouped) {
      const maxConfidence = Math.max(...detections.map((detection) => detection.confidence || 0));
      parts.push(`- **${label}**: ${detections.length} marker, hingga ${(maxConfidence * 100).toFixed(0)}% kepercayaan`);
    }
  }

  if (findings.findings?.length > 0) {
    parts.push('\n**Temuan Klinis:**');
    findings.findings.forEach((finding, index) => {
      const location = finding.location || finding.tooth_or_region;
      const locationLabel = location ? `**${location}**` : '';
      const severity = finding.severity ? ` (${finding.severity})` : '';
      const description = finding.description || finding.notes || finding.label || '';
      parts.push(`${index + 1}. ${locationLabel}${severity}: ${description}`);
      if (finding.differentials?.length) {
        parts.push(`   Diagnosis banding: ${finding.differentials.join(', ')}`);
      }
    });
  }

  if (findings.recommendations?.length > 0) {
    parts.push('\n**Rekomendasi:**');
    findings.recommendations.forEach((recommendation) => parts.push(`- ${recommendation}`));
  }
  if (findings.limitations) parts.push(`\n*Catatan: ${findings.limitations}*`);
  return parts.join('\n');
}

function enrichAssistantMessage(message, image, workspaceFindings, auditEvents, authBaseUrl) {
  const freshFindings = buildWorkspaceVisualFindings({
    image,
    findings: workspaceFindings,
    auditEvents,
    authBaseUrl,
  });
  const currentFindings = message.visualFindings || {};
  const freshAnnotatedUrl = resolveWorkspaceAssetUrl(image.annotated_image_signed_url, authBaseUrl);
  const annotatedImageStatus = image.annotated_image_artifact_status || null;
  const visualFindings = normalizeVisualFindings({
    ...freshFindings,
    ...currentFindings,
    workspace_image_id: image.id,
    annotated_image_signed_url:
      freshAnnotatedUrl || (
        annotatedImageStatus === 'unavailable' ? null : currentFindings.annotated_image_signed_url
      ) || null,
    annotated_image_status: annotatedImageStatus,
    annotated_image_mime_type:
      image.annotated_image_mime_type || currentFindings.annotated_image_mime_type || null,
  });

  return {
    ...message,
    content: message.content || summaryFromVisualFindings(visualFindings) || 'Analisis gambar dental dimuat dari riwayat klinis.',
    visualFindings,
  };
}

function enrichUserMessage(message, image, authBaseUrl) {
  const currentUrl = message.image?.url || null;
  const durableLocalUrl = /^(?:blob:|data:image\/)/i.test(currentUrl) ? currentUrl : null;
  return {
    ...message,
    image: {
      ...(message.image || {}),
      name: message.image?.name || image.file_name || 'dental_image.jpg',
      url:
        durableLocalUrl ||
        resolveWorkspaceAssetUrl(image.signed_url, authBaseUrl) ||
        (image.original_artifact_status === 'unavailable' ? null : currentUrl),
      workspaceImageId: image.id,
      artifactStatus: image.original_artifact_status || null,
    },
  };
}

function findNextAssistant(messages, userIndex, assignedAssistantIndexes) {
  for (let index = userIndex + 1; index < messages.length; index += 1) {
    if (messages[index]?.type === 'user') return -1;
    if (messages[index]?.type === 'ai' && !assignedAssistantIndexes.has(index)) return index;
  }
  return -1;
}

function findPreviousUser(messages, assistantIndex, assignedUserIndexes) {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.type === 'ai') return -1;
    if (messages[index]?.type === 'user' && !assignedUserIndexes.has(index)) return index;
  }
  return -1;
}

function reconstructedWorkspaceTurn({ image, findings, auditEvents, caseRecord, authBaseUrl }) {
  const visualFindings = buildWorkspaceVisualFindings({ image, findings, auditEvents, authBaseUrl });
  const createdAt = image.created_at || caseRecord?.created_at || new Date(0).toISOString();
  const updatedAt = image.updated_at || createdAt;
  const context = auditContextForImage(auditEvents, image.id);
  const imageName = image.file_name || 'dental_image.jpg';

  return [
    {
      id: `workspace-user-${image.id}`,
      type: 'user',
      content: context || `Analisis gambar dental: ${imageName}`,
      image: {
        name: imageName,
        url: resolveWorkspaceAssetUrl(image.signed_url, authBaseUrl) || null,
        workspaceImageId: image.id,
        artifactStatus: image.original_artifact_status || null,
      },
      timestamp: createdAt,
      reconstructedFromWorkspace: true,
    },
    {
      id: `workspace-ai-${image.id}`,
      type: 'ai',
      content: summaryFromVisualFindings(visualFindings) || 'Analisis gambar dental dimuat dari riwayat klinis.',
      timestamp: updatedAt,
      visualFindings: normalizeVisualFindings({
        ...visualFindings,
        workspace_image_id: image.id,
        annotated_image_status: image.annotated_image_artifact_status || null,
      }),
      sources: [],
      review: { status: 'pending_clinician_review', updatedAt: null },
      reconstructedFromWorkspace: true,
    },
  ];
}

export function mergeWorkspaceArtifactsIntoHistory({
  messages = [],
  workspace = null,
  authBaseUrl = '',
} = {}) {
  const images = (workspace?.images || [])
    .filter((image) => image?.archived !== true)
    .sort((left, right) => (
      (timestampValue(left.created_at) || 0) - (timestampValue(right.created_at) || 0)
    ));
  if (images.length === 0) return sortChatHistoryOldestFirst(messages);

  const merged = sortChatHistoryOldestFirst(messages).map((message) => ({ ...message }));
  const workspaceFindings = workspace?.findings || [];
  const auditEvents = workspace?.auditEvents || workspace?.audit_events || [];
  const usedImageIds = new Set();
  const representedUserImageIds = new Set();
  const representedAssistantImageIds = new Set();
  const assignedUserIndexes = new Set();
  const assignedAssistantIndexes = new Set();

  const takeNextImage = (preferredImageId = null) => {
    const preferred = preferredImageId
      ? images.find((image) => String(image.id) === String(preferredImageId) && !usedImageIds.has(image.id))
      : null;
    const image = preferred || images.find((candidate) => !usedImageIds.has(candidate.id));
    if (image) usedImageIds.add(image.id);
    return image || null;
  };

  // Persisted image turns already represented in DeepDental messages are
  // enriched with fresh signed URLs instead of being duplicated.
  for (let index = 0; index < merged.length; index += 1) {
    const message = merged[index];
    if (message.type !== 'user' || !message.image) continue;
    const image = takeNextImage(message.image.workspaceImageId);
    if (!image) break;
    merged[index] = enrichUserMessage(message, image, authBaseUrl);
    representedUserImageIds.add(image.id);
    assignedUserIndexes.add(index);
    const assistantIndex = findNextAssistant(merged, index, assignedAssistantIndexes);
    if (assistantIndex >= 0) {
      merged[assistantIndex] = enrichAssistantMessage(
        merged[assistantIndex],
        image,
        workspaceFindings,
        auditEvents,
        authBaseUrl
      );
      assignedAssistantIndexes.add(assistantIndex);
      representedAssistantImageIds.add(image.id);
    }
  }

  for (let index = 0; index < merged.length; index += 1) {
    if (assignedAssistantIndexes.has(index) || !hasImageAnalysis(merged[index])) continue;
    const preferredImageId = merged[index].visualFindings?.workspace_image_id || merged[index].visualFindings?.image_id;
    const image = takeNextImage(preferredImageId);
    if (!image) break;
    merged[index] = enrichAssistantMessage(merged[index], image, workspaceFindings, auditEvents, authBaseUrl);
    assignedAssistantIndexes.add(index);
    representedAssistantImageIds.add(image.id);
    const userIndex = findPreviousUser(merged, index, assignedUserIndexes);
    if (userIndex >= 0) {
      merged[userIndex] = enrichUserMessage(merged[userIndex], image, authBaseUrl);
      assignedUserIndexes.add(userIndex);
      representedUserImageIds.add(image.id);
    }
  }

  for (const image of images) {
    const reconstructed = reconstructedWorkspaceTurn({
      image,
      findings: workspaceFindings,
      auditEvents,
      caseRecord: workspace?.caseRecord || workspace?.case,
      authBaseUrl,
    });
    if (!representedUserImageIds.has(image.id)) merged.push(reconstructed[0]);
    if (!representedAssistantImageIds.has(image.id)) merged.push(reconstructed[1]);
  }

  return sortChatHistoryOldestFirst(merged);
}
