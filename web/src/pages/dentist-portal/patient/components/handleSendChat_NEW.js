/**
 * Simplified handleSendChat function - copy this logic into PatientAIResult.jsx
 * This version:
 * 1. Ensures loading state is ALWAYS reset in finally block
 * 2. Adds timeout to fallback fetch (3s max)
 * 3. Avoids double-adding AI bubbles
 * 4. Works with the same API contract as before
 */

export const createHandleSendChat = (dependencies) => {
  const {
    chatInput,
    selectedResult,
    patient,
    setChatLoading,
    setChatMessages,
    setChatInput,
    setSelectedResult,
    skipNextFetchRef,
    aiHttp,
    http
  } = dependencies;

  return async () => {
    if (!chatInput?.trim() || !selectedResult) return;

    setChatLoading(true);
    let sessionId = selectedResult.sessionId || selectedResult.session_id || null;
    const userMessage = chatInput.trim();

    try {
      // Step 1: Create session if needed
      if (!sessionId) {
        const createResp = await aiHttp.post('/sessions', {
          role: 'dentist',
          language: 'bilingual',
          metadata: { source: 'dentist_portal', patient_id: patient.id, ai_result_id: selectedResult.id }
        });

        sessionId = createResp?.data?.id || createResp?.data?.session?.id;
        if (!sessionId) {
          console.warn('No sessionId returned from create session');
          return;
        }

        // Persist sessionId to backend
        try {
          if (!selectedResult.sessionId && !selectedResult.session_id) {
            skipNextFetchRef.current = true;
            await http.post(
              `/v1/dentist-portal/patients/${patient.id}/ai-results/${selectedResult.id}/session`,
              { sessionId }
            );
            setSelectedResult((prev) => ({ ...(prev || {}), sessionId }));
          }
        } catch (persistErr) {
          if (persistErr?.response?.status !== 404) {
            console.warn('sessionId persistence failed:', persistErr?.response?.status);
          }
          if (!selectedResult.sessionId && !selectedResult.session_id) {
            skipNextFetchRef.current = true;
            setSelectedResult((prev) => ({ ...(prev || {}), sessionId }));
          }
        }
      }

      // Step 2: Add user message optimistically
      setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

      // Step 3: Build payload
      const summaryImage = selectedResult?.images?.[0];
      const imageUrl = summaryImage?.url;
      const imageDescription = summaryImage?.description;

      const imageContext = imageUrl ? `\nAnnotated Image URL: ${imageUrl}` : '';
      const contextMessage = `Patient: ${patient.name}\nPrevious Analysis: ${
        selectedResult.summary || 
        selectedResult.overallAssessment || 
        selectedResult.diagnosis?.[0]?.description || 
        'No previous analysis'
      }${imageContext}\nDentist Question: ${userMessage}`;

      const payload = {
        message: contextMessage,
        session_id: sessionId,
        role: 'dentist',
        language: 'bilingual'
      };

      if (imageUrl) {
        payload.image_url = imageUrl;
        if (imageDescription) payload.image_description = imageDescription;
        payload.images = [{ url: imageUrl, description: imageDescription || 'Annotated dental image' }];
      }

      // Step 4: Send to AI - with 10s timeout
      let aiReply = '';
      try {
        const abortCtrl = new AbortController();
        const timeout = setTimeout(() => abortCtrl.abort(), 10000);
        const resp = await aiHttp.post('/chat', payload, { signal: abortCtrl.signal });
        clearTimeout(timeout);

        // Try to extract reply
        aiReply =
          resp?.data?.reply ||
          resp?.data?.content ||
          resp?.data?.message ||
          resp?.data?.response ||
          resp?.data?.choices?.[0]?.message?.content ||
          '';

        // Fallback: check messages array
        if (!aiReply && Array.isArray(resp?.data?.messages)) {
          const last = [...resp.data.messages]
            .reverse()
            .find((m) => (m.role || '').toLowerCase() !== 'system');
          aiReply = last?.content || last?.message || last?.reply || '';
        }
      } catch (chatErr) {
        console.warn('Chat POST error:', chatErr?.message);
      }

      // Step 5: Fallback fetch if still no reply (3s timeout)
      if (!aiReply) {
        try {
          const abortCtrl = new AbortController();
          const timeout = setTimeout(() => abortCtrl.abort(), 3000);
          const histResp = await aiHttp.get(`/sessions/${sessionId}/messages`, {
            signal: abortCtrl.signal
          });
          clearTimeout(timeout);

          const hist = Array.isArray(histResp?.data) ? histResp.data : [];
          const last = [...hist]
            .reverse()
            .find((m) => (m.role || '').toLowerCase() !== 'user');
          aiReply = last?.content || last?.message || last?.reply || '';
        } catch (fetchErr) {
          console.warn('Fallback fetch timeout/error:', fetchErr?.message);
        }
      }

      // Step 6: Add AI reply ONCE if we got one
      if (aiReply) {
        setChatMessages((prev) => [...prev, { role: 'ai', content: aiReply }]);
      }

      setChatInput('');
    } catch (err) {
      console.error('Chat error:', err?.message);
    } finally {
      // CRITICAL: Always reset loading, even on error
      setChatLoading(false);
    }
  };
};
