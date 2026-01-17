/**
 * Fixed handleSendChat with:
 * 1. Full response logging to debug API structure
 * 2. Polling fallback that retries 5x with 1s delay
 * 3. Clear timeout handling
 */

export const createHandleSendChat_v2 = (dependencies) => {
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
        try {
          const createResp = await aiHttp.post('/sessions', {
            role: 'dentist',
            language: 'bilingual',
            metadata: { source: 'dentist_portal', patient_id: patient.id, ai_result_id: selectedResult.id }
          });

          sessionId = createResp?.data?.id || createResp?.data?.session?.id;
          console.log('✅ Session created:', sessionId);
          
          if (!sessionId) {
            console.warn('No sessionId in response:', JSON.stringify(createResp?.data));
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
        } catch (createErr) {
          console.error('Session creation error:', createErr?.message);
          setChatLoading(false);
          return;
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

      console.log('📤 Sending chat payload:', JSON.stringify(payload, null, 2));

      // Step 4: Send to AI - with 10s timeout
      let aiReply = '';
      try {
        const abortCtrl = new AbortController();
        const timeout = setTimeout(() => abortCtrl.abort(), 10000);
        const resp = await aiHttp.post('/chat', payload, { signal: abortCtrl.signal });
        clearTimeout(timeout);

        console.log('📥 Full chat response:', JSON.stringify(resp?.data, null, 2));

        // Try to extract reply from response
        aiReply =
          resp?.data?.reply ||
          resp?.data?.content ||
          resp?.data?.message ||
          resp?.data?.response ||
          resp?.data?.choices?.[0]?.message?.content ||
          '';

        console.log('✅ Extracted aiReply:', aiReply);

        // Fallback: check messages array in response
        if (!aiReply && Array.isArray(resp?.data?.messages)) {
          console.log('📋 Checking messages array in response...');
          const last = [...resp.data.messages]
            .reverse()
            .find((m) => (m.role || '').toLowerCase() !== 'system');
          aiReply = last?.content || last?.message || last?.reply || '';
          console.log('✅ Found in messages array:', aiReply);
        }
      } catch (chatErr) {
        console.warn('Chat POST error:', chatErr?.message, chatErr?.code);
      }

      // Step 5: Polling fallback if still no reply - retry 5 times with 1s delay
      if (!aiReply) {
        console.log('🔄 No reply in POST response, polling messages...');
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
            
            const abortCtrl = new AbortController();
            const timeout = setTimeout(() => abortCtrl.abort(), 5000);
            const histResp = await aiHttp.get(`/sessions/${sessionId}/messages`, {
              signal: abortCtrl.signal
            });
            clearTimeout(timeout);

            console.log(`📊 Attempt ${attempt} - Messages:`, JSON.stringify(histResp?.data, null, 2));

            const hist = Array.isArray(histResp?.data) ? histResp.data : [];
            if (hist.length > 0) {
              const last = [...hist]
                .reverse()
                .find((m) => (m.role || '').toLowerCase() !== 'user');
              aiReply = last?.content || last?.message || last?.reply || '';
              
              if (aiReply) {
                console.log(`✅ Found aiReply on attempt ${attempt}:`, aiReply);
                break;
              }
            }
          } catch (fetchErr) {
            console.warn(`Attempt ${attempt} fetch error:`, fetchErr?.message);
          }
        }
      }

      // Step 6: Add AI reply if we got one
      if (aiReply) {
        console.log('✅ Adding AI bubble:', aiReply.substring(0, 50) + '...');
        setChatMessages((prev) => [...prev, { role: 'ai', content: aiReply }]);
      } else {
        console.warn('❌ No aiReply found after all attempts');
      }

      setChatInput('');
    } catch (err) {
      console.error('❌ Chat error:', err?.message, err);
    } finally {
      // CRITICAL: Always reset loading
      console.log('🔴 Resetting loading state');
      setChatLoading(false);
    }
  };
};
