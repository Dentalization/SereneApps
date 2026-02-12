import React from 'react';
import {
  View,
  ScrollView,
  Platform,
  StyleSheet,
  StatusBar,
  Dimensions,
  PixelRatio,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  Animated,
} from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { sendChatMessage, sendChatWithImages, getSessionMessages } from '../../../services/aiDiagnosisService';
import { useDispatch } from 'react-redux';
import { syncAnalysisToBackend } from '../../../store/slices/aiSlice';
import useToast from '../../../hooks/useToast';
import ValidationToast from '../../settings/components/ValidationToast';
import { compressImages, needsCompression } from '../../../utils/imageCompression';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

const normalize = (size) => {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const ChatScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const { sessionId, analysisData, images, pendingImages, mode } = route.params || {};
  const dispatch = useDispatch();

  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState('');
  const [selectedImages, setSelectedImages] = React.useState([]);
  const [isSending, setIsSending] = React.useState(false);
  const [hasProvidedContext, setHasProvidedContext] = React.useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

  const scrollViewRef = React.useRef(null);
  const analysisContextRef = React.useRef(null);
  const keyboardPadding = React.useRef(new Animated.Value(0)).current;

  // --- 1. CALCULATE HEADER HEIGHT ---
  const HEADER_HEIGHT = normalize(56) + insets.top;

  // --- 2. KEYBOARD LISTENER (Tracks actual keyboard height for pixel-perfect positioning) ---
  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      setKeyboardVisible(true);
      const kbHeight = e.endCoordinates.height;

      let targetPadding;
      if (Platform.OS === 'ios') {
        // iOS: keyboard height minus home indicator (keyboard covers safe area)
        targetPadding = Math.max(kbHeight - insets.bottom, 0);
        Animated.timing(keyboardPadding, {
          toValue: targetPadding,
          duration: e.duration || 250,
          useNativeDriver: false,
        }).start();
      } else {
        // Android: Calculate actual overlap between keyboard and window.
        // If adjustResize already shrank the window, overlap will be ~0 (no extra padding needed).
        // If adjustResize is NOT active, overlap = amount keyboard covers our content.
        const windowH = Dimensions.get('window').height;
        const kbTop = e.endCoordinates.screenY;
        targetPadding = Math.max(windowH - kbTop, 0);
        keyboardPadding.setValue(targetPadding);
      }

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const onHide = (e) => {
      setKeyboardVisible(false);
      if (Platform.OS === 'ios') {
        Animated.timing(keyboardPadding, {
          toValue: 0,
          duration: (e && e.duration) || 250,
          useNativeDriver: false,
        }).start();
      } else {
        keyboardPadding.setValue(0);
      }
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const isModelUnavailableError = (msg = '') => {
    const lower = String(msg || '').toLowerCase();
    return (
      lower.includes('google-generativeai') ||
      lower.includes('location is not supported') ||
      lower.includes('orchestrator_error')
    );
  };

  // --- HISTORY LOADER ---
  React.useEffect(() => {
    const loadSessionHistory = async () => {
      if (!sessionId || mode === 'pre-analysis') return;
      setIsLoadingHistory(true);
      try {
        const historyResponse = await getSessionMessages(sessionId);
        if (historyResponse.success && historyResponse.messages && historyResponse.messages.length > 0) {
          const msgs = historyResponse.messages.map((m) => {
            return {
              id: m.id || m.messageId || String(m._id) || Date.now().toString(),
              role: m.role || m.sender || (m.from || 'assistant'),
              content: m.content || m.text || m.reply || '',
              images: m.images || m.imageUrls || m.files || undefined,
              annotatedImage: m.annotated_image_base64 || m.annotatedImage || m.annotatedImageUrl || undefined,
              timestamp: m.createdAt || m.timestamp || m.created_at || new Date().toISOString(),
              hasAnalysisOption: m.hasAnalysisOption || m.has_analysis || false,
              metadata: m.metadata || {}
            };
          });

          // Mark if any message contains images so we can include context
          const hasImageInHistory = msgs.some(msg => (msg.images && msg.images.length > 0) || msg.annotatedImage || (msg.metadata && msg.metadata.has_images));
          if (hasImageInHistory) setHasProvidedContext(true);

          // Replace current messages with history so navigation back restores chat
          setMessages(msgs);
        }
      } catch (error) {
        if (__DEV__) console.warn('⚠️ Could not load session history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadSessionHistory();
  }, [sessionId, mode]);

  // --- CONTEXT & INITIAL MESSAGE (No Changes Logic) ---
  React.useEffect(() => {
    if (analysisData && mode !== 'pre-analysis') {
      let context = '[KONTEKS: User sudah melakukan analisis AI sebelumnya dengan hasil berikut]\n';
      if (analysisData.riskLevel) context += `Tingkat Risiko: ${analysisData.riskLevel}\n`;
      if (analysisData.summary) context += `Ringkasan: ${analysisData.summary}\n`;
      if (analysisData.findings?.length > 0) {
        context += 'Temuan: ' + analysisData.findings.map(f => f.name || f.condition || f).join(', ') + '\n';
      }
      context += '[END KONTEKS]\n\n';
      analysisContextRef.current = context;
    }
  }, [analysisData, mode]);

  React.useEffect(() => {
    if (analysisData && mode !== 'pre-analysis') {
      let content = '';
      const annotatedImageUri = analysisData.annotated_image_base64 || analysisData.annotatedImage;
      if (analysisData.summary) content += analysisData.summary + '\n\n';
      if (analysisData.findings?.length > 0) {
        content += '📋 **Temuan:**\n';
        analysisData.findings.forEach((finding, idx) => {
          content += `${idx + 1}. ${finding.name || finding.condition}\n`;
        });
      }
      if (content.trim() || annotatedImageUri) {
        const initialMessage = {
          id: 'initial',
          role: 'assistant',
          content: content.trim() || 'Berikut hasil analisisnya:',
          timestamp: new Date().toISOString(),
        };
        if (annotatedImageUri) initialMessage.annotatedImage = annotatedImageUri;
        setMessages([initialMessage]);
      }
    }
    if (pendingImages?.length > 0) {
      setSelectedImages(pendingImages.map(img => img.uri));
      if (mode === 'pre-analysis') {
        setInputText('Ini foto gigi saya. Saya ingin menjelaskan kondisi saya.');
      }
    }
  }, [analysisData, pendingImages, mode]);

  // --- ACTIONS ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) setSelectedImages(result.assets.map(asset => asset.uri));
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSend = async () => {
    if (!inputText.trim() && selectedImages.length === 0) return;
    if (!sessionId) { showToast('Session ID tidak ditemukan', 'error'); return; }

    let messageText = inputText.trim() || (selectedImages.length > 0 ? 'Ini foto gigi saya.' : '');

    if (!hasProvidedContext && analysisContextRef.current && analysisData && mode !== 'pre-analysis') {
      messageText = analysisContextRef.current + 'Pertanyaan user: ' + messageText;
      setHasProvidedContext(true);
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim() || (selectedImages.length > 0 ? 'Ini foto gigi saya.' : ''),
      images: selectedImages.length > 0 ? selectedImages : undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    const imagesToSend = [...selectedImages];
    setSelectedImages([]);
    setIsSending(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      let response;
      let compressedImages = imagesToSend;

      if (imagesToSend.length > 0) {
        try {
          const compressibleIndexes = await Promise.all(imagesToSend.map(async (uri) => await needsCompression(uri, 600 * 1024)));
          const imagesNeedingWork = imagesToSend.filter((_, idx) => compressibleIndexes[idx]);
          if (imagesNeedingWork.length > 0) {
            const compressionResults = await compressImages(imagesNeedingWork, { maxWidth: 1280, maxHeight: 1280, quality: 0.7 });
            const normalizedCompressed = compressionResults.map((res, idx) => {
              const originalUri = imagesNeedingWork[idx];
              return (res.originalSize && res.size && res.size > res.originalSize) ? originalUri : res.uri;
            });
            compressedImages = imagesToSend.map((uri) => {
              const workIndex = imagesNeedingWork.indexOf(uri);
              return workIndex !== -1 ? normalizedCompressed[workIndex] : uri;
            });
          }
        } catch (error) { compressedImages = imagesToSend; }
      }

      if (compressedImages.length > 0) {
        response = await sendChatWithImages(messageText, sessionId, compressedImages);
        if (!hasProvidedContext) setHasProvidedContext(true);
        if (response.success) {
          const aiMessage = {
            id: response.messageId || Date.now().toString(),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date().toISOString(),
            hasAnalysisOption: mode === 'pre-analysis',
          };
          setMessages(prev => [...prev, aiMessage]);
          try {
            const vf = response.data?.visual_findings || {};
            if (vf && (vf.detections || vf.summary)) {
              dispatch(syncAnalysisToBackend({
                id: response.messageId, session_id: sessionId, findings: response.reply,
                image_url: compressedImages[0], timestamp: new Date().toISOString()
              }));
            }
          } catch (e) { }
        }
      } else {
        response = await sendChatMessage(messageText, sessionId);
        if (response.success) {
          setMessages(prev => [...prev, {
            id: response.messageId || Date.now().toString(),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date().toISOString(),
          }]);
        }
      }

      if (!response.success) {
        const errorMsg = response.error || 'Gagal mengirim pesan.';
        showToast(errorMsg, 'error');
      }
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleProceedAnalysis = () => {
    const imagesToAnalyze = pendingImages || images || [];
    navigation.replace('Analysis', { images: imagesToAnalyze, sessionId });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HEADER (Fixed Height) */}
      <View style={{ height: HEADER_HEIGHT }}>
        <LinearGradient
          colors={['#7C3AED', '#9333EA']}
          style={[styles.header, { height: HEADER_HEIGHT, paddingTop: insets.top }]}
        >
          <IconButton icon="arrow-left" size={normalize(24)} iconColor="#FFFFFF" onPress={() => navigation.navigate('AIHome')} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Chat Diagnosis</Text>
            <Text style={styles.headerSubtitle}>Asisten AI</Text>
          </View>
          <IconButton icon="delete-outline" size={normalize(24)} iconColor="#FFFFFF" onPress={() => { setMessages([]); showToast('Chat dihapus', 'info'); }} />
        </LinearGradient>
      </View>

      {/* CHAT AREA (flex:1 takes remaining space below header) */}
      <Animated.View style={{ flex: 1, paddingBottom: keyboardPadding }}>
        {/* MESSAGES LIST */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {message.role === 'assistant' && (
                <MaterialCommunityIcons name="robot-outline" size={normalize(20)} color="#7C3AED" style={styles.aiIcon} />
              )}
              {message.images?.length > 0 && (
                <View style={styles.messageImages}>
                  {message.images.map((uri, idx) => <Image key={idx} source={{ uri }} style={styles.messageImage} />)}
                </View>
              )}
              {message.annotatedImage && (
                <Image source={{ uri: `data:image/jpeg;base64,${message.annotatedImage}` }} style={styles.annotatedImage} resizeMode="contain" />
              )}
              <Text style={[styles.messageText, message.role === 'user' ? styles.userText : styles.aiText]}>
                {message.content.replace(/\*\*/g, '').replace(/\*/g, '•')}
              </Text>
              {message.hasAnalysisOption && (
                <TouchableOpacity style={styles.analysisButton} onPress={handleProceedAnalysis}>
                  <Text style={styles.analysisButtonText}>Analisis Sekarang</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.messageTime, message.role === 'user' ? styles.userTime : styles.aiTime]}>
                {new Date(message.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
          {isSending && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={[styles.messageText, styles.aiText, { marginLeft: 8 }]}>Mengetik...</Text>
            </View>
          )}
        </ScrollView>

        {/* INPUT AREA (Sticky Bottom) */}
        <View style={[
          styles.bottomContainer,
          {
            paddingBottom: isKeyboardVisible ? normalize(4) : Math.max(insets.bottom, normalize(16))
          }
        ]}>

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewBar}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.previewImageContainer}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <MaterialCommunityIcons name="close-circle" size={normalize(20)} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachButton} onPress={pickImage} disabled={isSending}>
              <MaterialCommunityIcons name="image-plus" size={normalize(24)} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Tulis pesan..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                editable={!isSending}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() && selectedImages.length === 0) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isSending || (!inputText.trim() && selectedImages.length === 0)}
            >
              <MaterialCommunityIcons name={isSending ? "loading" : "send"} size={normalize(20)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ValidationToast visible={toast.visible} message={toast.message} status={toast.status} onDismiss={hideToast} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(8),
    paddingBottom: normalize(8),
    borderBottomLeftRadius: normalize(24),
    borderBottomRightRadius: normalize(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  headerTitle: {
    fontSize: normalize(18),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: normalize(12),
    color: 'rgba(255,255,255,0.9)',
  },
  messagesContainer: {
    padding: normalize(16),
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: normalize(16),
    borderRadius: normalize(18),
    padding: normalize(12),
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: normalize(4),
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: normalize(4),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: normalize(16),
    padding: normalize(8),
    marginVertical: normalize(8),
  },
  aiIcon: {
    marginBottom: normalize(4),
  },
  messageText: {
    fontSize: normalize(14),
    lineHeight: normalize(20),
  },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#1F2937' },
  messageTime: {
    fontSize: normalize(10),
    marginTop: normalize(4),
    alignSelf: 'flex-end',
  },
  userTime: { color: 'rgba(255,255,255,0.7)' },
  aiTime: { color: '#9CA3AF' },

  // --- BOTTOM SECTION ---
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
    justifyContent: 'flex-end',
  },
  imagePreviewBar: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
  },
  previewImageContainer: {
    marginRight: normalize(8),
    position: 'relative',
  },
  previewImage: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: normalize(12),
    paddingTop: normalize(12),
  },
  attachButton: {
    padding: normalize(10),
    marginBottom: normalize(6),
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: normalize(24),
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: normalize(44),
    maxHeight: normalize(120),
    marginBottom: normalize(6),
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(10),
    fontSize: normalize(15),
    color: '#1F2937',
  },
  sendButton: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: normalize(8),
    marginBottom: normalize(6),
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },

  messageImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
    marginBottom: normalize(8),
  },
  messageImage: {
    width: normalize(100),
    height: normalize(100),
    borderRadius: normalize(12),
  },
  annotatedImage: {
    width: '100%',
    height: normalize(200),
    borderRadius: normalize(12),
    marginBottom: normalize(8),
    backgroundColor: '#F3F4F6',
  },
  analysisButton: {
    backgroundColor: '#7C3AED',
    padding: normalize(8),
    borderRadius: normalize(8),
    marginTop: normalize(8),
    alignItems: 'center',
  },
  analysisButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: normalize(12),
  },
});

export default ChatScreen;