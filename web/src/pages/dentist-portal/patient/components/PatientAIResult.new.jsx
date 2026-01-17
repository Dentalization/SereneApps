const handleSendChat = async () => {
  if (!chatInput?.trim() || !selectedResult) return;
  setChatLoading(true);

  try {
    let sessionId = selectedResult.sessionId || selectedResult.session_id;

    // 1) Ensure session exists on AI service
    if (!sessionId) {
      console.log('📝 Creating AI session...');
      console.log('🔍 aiHttp baseURL:', aiHttp.defaults?.baseURL || '(none)');
      try {
        const createResp = await aiHttp.post('/sessions', {
          role: 'dentist',
          metadata: { patient_id: patient.id, ai_result_id: selectedResult.id }
        });
        console.log('📥 Create session response:', createResp?.status, createResp?.data);
        sessionId = createResp?.data?.id || createResp?.data?.session?.id || null;
        if (!sessionId) console.warn('⚠️ Session created but no id returned');
      } catch (createErr) {
        console.error('❌ Create session error', createErr?.response?.status, createErr?.message);
        try { console.error('Response:', JSON.stringify(createErr?.response?.data, null, 2)); } catch(e) {}
        // Don't throw; continue without sessionId so we can still send /chat/upload
        sessionId = null;
      }

      // try to persist sessionId locally but do not fail on error
      try {
        await http.post(`/v1/dentist-portal/patients/${patient.id}/ai-results/${selectedResult.id}/session`, { sessionId });
      } catch (persistErr) {
        console.warn('⚠️ Could not persist sessionId', persistErr?.message || persistErr);
      }

      setSelectedResult(prev => ({ ...(prev || {}), sessionId }));
    }

    // 2) Optimistic UI: show user message immediately
    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    setChatInput('');

    // 3) Build FormData payload and always post to /chat/upload
    const image = selectedResult?.images?.[0];
    const formData = new FormData();
    formData.append('message', userText);
    if (sessionId) formData.append('session_id', sessionId);
    formData.append('role', 'dentist');
    formData.append('language', 'bilingual');

    if (image?.url) {
      try {
        console.log('📸 Fetching image for upload:', image.url);
        const imgResp = await fetch(image.url);
        if (!imgResp.ok) throw new Error(`Image fetch failed ${imgResp.status}`);
        const blob = await imgResp.blob();
        console.log('✅ Image fetched, size', blob.size);
        formData.append('images', blob, image.filename || 'annotated-image.png');
        if (image.description) formData.append('image_description', image.description);
      } catch (imgErr) {
        console.warn('⚠️ Could not attach image to chat upload:', imgErr?.message || imgErr);
      }
    }

    // 4) Send as multipart to /chat/upload (let axios set boundary)
    console.log('📤 Posting to /chat/upload');
    const resp = await aiHttp.post('/chat/upload', formData);
    console.log('📥 /chat/upload response:', resp?.data);

    // 5) Try to extract immediate reply from response, otherwise poll session messages
    let aiReply = resp?.data?.reply || resp?.data?.content || resp?.data?.message || '';
    if (!aiReply && sessionId) {
      for (let i = 0; i < 6 && !aiReply; i++) {
        await new Promise(r => setTimeout(r, 700));
        try {
          const hist = await aiHttp.get(`/sessions/${sessionId}/messages`);
          const messages = Array.isArray(hist?.data) ? hist.data : [];
          console.log(`🔁 Poll attempt ${i + 1}, messages:`, messages.length);
          const lastAI = [...messages].reverse().find(m => (m.role || '').toLowerCase() !== 'user');
          aiReply = lastAI?.content || lastAI?.message || aiReply;
        } catch (pollErr) {
          console.warn('⚠️ Poll error', pollErr?.response?.status || pollErr?.message || pollErr);
        }
      }
    }

    if (!aiReply) aiReply = 'AI sedang memproses jawaban. Silakan ulangi atau tambahkan detail.';

    // 6) Append AI reply to chat
    setChatMessages(prev => [...prev, { role: 'ai', content: aiReply }]);

  } catch (err) {
    console.error('❌ Chat error', err?.message || err, 'status:', err?.response?.status);
    try { console.error('Response data:', JSON.stringify(err?.response?.data, null, 2)); } catch(e) {}
    setChatMessages(prev => [...prev, { role: 'ai', content: 'Terjadi kesalahan sistem saat memproses chat.' }]);
  } finally {
    setChatLoading(false);
  }
};
