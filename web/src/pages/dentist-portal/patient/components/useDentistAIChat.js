import { useCallback, useEffect, useRef, useState } from 'react';
import { authHttp } from '../../../../utils/httpClient';

const endpointFor = (patientId, resultId, suffix = 'messages') =>
  `/dentist-portal/patients/${patientId}/ai-results/${resultId}/${suffix}`;

export default function useDentistAIChat({ patientId, resultId, enabled = true }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);
  const abortRef = useRef(null);
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || !patientId || !resultId) {
      setMessages([]);
      setContext(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setMessages([]);
    setContext(null);
    setIsLoading(true);
    setError(null);
    try {
      const response = await authHttp.get(endpointFor(patientId, resultId), { signal: controller.signal });
      setMessages(response.data?.messages || []);
      setContext(response.data?.context || null);
    } catch (requestError) {
      if (requestError?.code !== 'ERR_CANCELED') setError(requestError);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [enabled, patientId, resultId]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const send = useCallback(async (rawMessage, attachments = []) => {
    const files = Array.isArray(attachments) ? attachments.slice(0, 2) : [];
    const content = String(rawMessage || '').trim() ||
      (files.length ? 'Mohon analisis gambar klinis tambahan ini dalam konteks kasus pasien.' : '');
    if (!content || sendingRef.current || !patientId || !resultId) return false;
    sendingRef.current = true;
    setIsSending(true);
    setError(null);
    const idempotencyKey = crypto.randomUUID();
    const temporaryId = `pending-${idempotencyKey}`;
    const optimisticAttachments = files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      type: 'supplemental',
    }));
    setMessages((current) => [...current, {
      id: temporaryId,
      role: 'dentist',
      actorType: 'dentist',
      actorName: 'Dokter Gigi',
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
      attachments: optimisticAttachments,
    }]);
    try {
      const requestBody = files.length ? new FormData() : { message: content };
      if (files.length) {
        requestBody.append('message', content);
        files.forEach((file) => requestBody.append('images', file, file.name));
      }
      const response = await authHttp.post(
        endpointFor(patientId, resultId, 'chat'),
        requestBody,
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      const created = response.data?.messages || [];
      setMessages((current) => [
        ...current.filter((message) => message.id !== temporaryId),
        ...created,
      ]);
      optimisticAttachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
      return true;
    } catch (requestError) {
      setMessages((current) => current.map((message) =>
        message.id === temporaryId ? { ...message, status: 'failed' } : message
      ));
      setError(requestError);
      return false;
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }, [patientId, resultId]);

  return { messages, context, isLoading, isSending, error, reload: load, send };
}
