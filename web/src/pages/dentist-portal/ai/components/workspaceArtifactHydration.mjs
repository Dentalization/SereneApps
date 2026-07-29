function isInlineArtifactUrl(value = '') {
  return /^(?:blob:|data:image\/)/i.test(String(value || ''));
}

async function hydrateArtifact({ requestUrl, fetchArtifactBlob, createObjectUrl }) {
  if (!requestUrl) return { url: null, status: 'missing' };
  if (isInlineArtifactUrl(requestUrl)) return { url: requestUrl, status: 'ready' };

  try {
    const blob = await fetchArtifactBlob(requestUrl);
    if (!blob) return { url: null, status: 'unavailable' };
    const url = createObjectUrl(blob);
    return url ? { url, status: 'ready' } : { url: null, status: 'unavailable' };
  } catch {
    return { url: null, status: 'unavailable' };
  }
}

export async function hydrateWorkspaceImageArtifacts({
  images = [],
  fetchArtifactBlob,
  createObjectUrl,
} = {}) {
  if (typeof fetchArtifactBlob !== 'function' || typeof createObjectUrl !== 'function') {
    return images;
  }

  return Promise.all(images.map(async (image) => {
    const originalRequestUrl = image?.signed_url_request || image?.signed_url || null;
    const annotatedRequestUrl =
      image?.annotated_image_signed_url_request || image?.annotated_image_signed_url || null;
    const [original, annotated] = await Promise.all([
      hydrateArtifact({ requestUrl: originalRequestUrl, fetchArtifactBlob, createObjectUrl }),
      hydrateArtifact({ requestUrl: annotatedRequestUrl, fetchArtifactBlob, createObjectUrl }),
    ]);

    return {
      ...image,
      signed_url_request: originalRequestUrl,
      annotated_image_signed_url_request: annotatedRequestUrl,
      signed_url: original.url,
      annotated_image_signed_url: annotated.url,
      original_artifact_status: original.status,
      annotated_image_artifact_status: annotated.status,
    };
  }));
}
