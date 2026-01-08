import React from 'react';
import { 
  View, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  PixelRatio,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { sendChatMessage, sendChatWithImages, getSessionMessages } from '../../../services/aiDiagnosisService';
import { useDispatch } from 'react-redux';
import { syncAnalysisToBackend } from '../../../store/slices/aiSlice';
import useToast from '../../../hooks/useToast';
import ValidationToast from '../../settings/components/ValidationToast';
import { compressImages } from '../../../utils/imageCompression';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
// -------------------------

const ChatScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const { sessionId, analysisData, images, pendingImages, mode } = route.params || {};
  const dispatch = useDispatch();
  
  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState('');
  const [selectedImages, setSelectedImages] = React.useState([]);
  const [isSending, setIsSending] = React.useState(false);
  const [hasProvidedContext, setHasProvidedContext] = React.useState(false); // Track if analysis context sent
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const scrollViewRef = React.useRef(null);
  
  // Build analysis context string for AI
  const analysisContextRef = React.useRef(null);
  
  // Load session history from server to check if AI already has context
  React.useEffect(() => {
    const loadSessionHistory = async () => {
      if (!sessionId || mode === 'pre-analysis') return;
      
      setIsLoadingHistory(true);
      try {
        const historyResponse = await getSessionMessages(sessionId);
        
        if (historyResponse.success && historyResponse.messages && historyResponse.messages.length > 0) {
          // Check if session already has messages with images
          const hasImageInHistory = historyResponse.messages.some(msg => 
            (msg.images && msg.images.length > 0) || 
            msg.has_images ||
            (msg.metadata && msg.metadata.has_images)
          );
          
          if (hasImageInHistory) {
            // AI already has image context from this session
            setHasProvidedContext(true);
            if (__DEV__) {
              console.log('✅ Session already has image context from server history');
            }
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('⚠️ Could not load session history:', error);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadSessionHistory();
  }, [sessionId, mode]);
  
  React.useEffect(() => {
    if (analysisData && mode !== 'pre-analysis') {
      // Build context string to send with first chat message
      let context = '[KONTEKS: User sudah melakukan analisis AI sebelumnya dengan hasil berikut]\n';
      
      if (analysisData.riskLevel || analysisData.risk_level) {
        context += `Tingkat Risiko: ${analysisData.riskLevel || analysisData.risk_level}\n`;
      }
      
      if (analysisData.summary || analysisData.overall_assessment) {
        context += `Ringkasan: ${analysisData.summary || analysisData.overall_assessment}\n`;
      }
      
      if (analysisData.findings && Array.isArray(analysisData.findings) && analysisData.findings.length > 0) {
        context += 'Temuan: ';
        const findingNames = analysisData.findings.map(f => f.name || f.condition || f).join(', ');
        context += findingNames + '\n';
      }
      
      if (analysisData.recommendations && Array.isArray(analysisData.recommendations) && analysisData.recommendations.length > 0) {
        context += 'Rekomendasi sebelumnya: ';
        context += analysisData.recommendations.slice(0, 3).join('; ') + '\n';
      }
      
      context += '[END KONTEKS]\n\n';
      analysisContextRef.current = context;
      
      if (__DEV__) {
        console.log('📝 Analysis context built for chat:', context);
      }
    }
  }, [analysisData, mode]);

  React.useEffect(() => {
    // Add initial AI message from analysis
    if (analysisData && mode !== 'pre-analysis') {
      if (__DEV__) {
        console.log('📊 ChatScreen received analysisData:', JSON.stringify(analysisData, null, 2));
        console.log('📊 Mode:', mode);
      }
      
      let content = '';
      
      // Try multiple paths to find annotated image
      const annotatedImageUri = 
        analysisData.annotated_image_base64 || 
        analysisData.annotatedImage || 
        (analysisData.visual_findings && analysisData.visual_findings.annotated_image_base64) ||
        (analysisData.data && analysisData.data.annotated_image_base64) ||
        (analysisData.data && analysisData.data.visual_findings && analysisData.data.visual_findings.annotated_image_base64);
      
      if (__DEV__) {
        console.log('🖼️ Annotated image found:', annotatedImageUri ? `Yes (length: ${annotatedImageUri.length}, preview: ${annotatedImageUri.substring(0, 30)}...)` : 'No');
        
        // Test if it's valid base64
        if (annotatedImageUri) {
          try {
            // Check if base64 string starts with valid image prefix
            const hasValidPrefix = annotatedImageUri.startsWith('/9j/') || // JPEG
                                   annotatedImageUri.startsWith('iVBOR') || // PNG
                                   annotatedImageUri.startsWith('R0lGO'); // GIF
            console.log('🔍 Base64 validation:', hasValidPrefix ? 'Valid image format' : 'Unknown format');
          } catch (e) {
            console.log('⚠️ Base64 validation error:', e.message);
          }
        }
      }
      
      // Build comprehensive analysis summary
      if (analysisData.summary || analysisData.overall_assessment) {
        content += (analysisData.summary || analysisData.overall_assessment) + '\n\n';
      }
      
      // If reply exists (from chat response), use it
      if (analysisData.reply || analysisData.content) {
        content += (analysisData.reply || analysisData.content) + '\n\n';
      }
      
      if (analysisData.findings && Array.isArray(analysisData.findings) && analysisData.findings.length > 0) {
        content += '📋 **Temuan yang Terdeteksi:**\n';
        analysisData.findings.forEach((finding, idx) => {
          content += `${idx + 1}. ${finding.name || finding.condition || finding}\n`;
          if (finding.location) content += `   Lokasi: ${finding.location}\n`;
          if (finding.severity) content += `   Tingkat: ${finding.severity}\n`;
          if (finding.confidence) content += `   Keyakinan: ${Math.round(finding.confidence * 100)}%\n`;
        });
        content += '\n';
      }
      
      if (analysisData.recommendations && Array.isArray(analysisData.recommendations) && analysisData.recommendations.length > 0) {
        content += '💡 **Rekomendasi:**\n';
        analysisData.recommendations.forEach((rec, idx) => {
          content += `${idx + 1}. ${rec}\n`;
        });
      }
      
      // Create initial message if we have content OR annotated image
      if (content.trim() || annotatedImageUri) {
        const initialMessage = {
          id: 'initial',
          role: 'assistant',
          content: content.trim() || 'Berikut adalah hasil analisis gambar Anda:',
          timestamp: new Date().toISOString(),
        };
        
        // Add annotated image if available
        if (annotatedImageUri) {
          initialMessage.annotatedImage = annotatedImageUri;
          if (__DEV__) {
            console.log('✅ Annotated image added to initial message');
          }
        } else if (__DEV__) {
          console.log('⚠️ No annotated image found in analysisData');
        }
        
        setMessages([initialMessage]);
        
        if (__DEV__) {
          console.log('✅ Initial message created with:', {
            hasContent: !!content.trim(),
            hasAnnotatedImage: !!annotatedImageUri,
          });
        }
      } else if (__DEV__) {
        console.log('⚠️ No initial message created - no content or annotated image');
      }
    }

    // If there are pending images from ImagePreviewScreen, attach them
    if (pendingImages && pendingImages.length > 0) {
      setSelectedImages(pendingImages.map(img => img.uri));
      if (mode === 'pre-analysis') {
        setInputText('Ini foto gigi saya. Saya ingin menjelaskan kondisi yang saya alami sebelum dianalisis.');
      }
    }
  }, [analysisData, pendingImages, mode]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      setSelectedImages(result.assets.map(asset => asset.uri));
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSend = async () => {
    if (!inputText.trim() && selectedImages.length === 0) return;
    if (!sessionId) {
      showToast('Session ID tidak ditemukan', 'error');
      return;
    }

    // Get message text with fallback
    let messageText = inputText.trim() || (selectedImages.length > 0 ? 'Ini foto gigi saya.' : '');
    
    // Don't send if both are empty
    if (!messageText && selectedImages.length === 0) return;
    
    // Prepend analysis context on first message if coming from ResultScreen
    // This tells AI that user already did analysis before chatting
    if (!hasProvidedContext && analysisContextRef.current && analysisData && mode !== 'pre-analysis') {
      messageText = analysisContextRef.current + 'Pertanyaan user: ' + messageText;
      setHasProvidedContext(true);
      if (__DEV__) {
        console.log('📨 Sending first message with analysis context');
      }
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim() || (selectedImages.length > 0 ? 'Ini foto gigi saya.' : ''), // Display original message
      images: selectedImages.length > 0 ? selectedImages : undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    const imagesToSend = [...selectedImages];
    setSelectedImages([]);
    setIsSending(true);
    
    // Show analysis in progress message for images
    if (imagesToSend.length > 0) {
      const processingMessage = {
        id: 'processing_' + Date.now(),
        role: 'system',
        content: '🔄 Mengompres gambar untuk upload lebih cepat...',
        timestamp: new Date().toISOString(),
        isProcessing: true,
      };
      setMessages(prev => [...prev, processingMessage]);
    }

    try {
      let response;
      let compressedImages = imagesToSend;
      
      // Compress images before upload
      if (imagesToSend.length > 0) {
        try {
          const compressionResults = await compressImages(imagesToSend, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
          });
          compressedImages = compressionResults.map(r => r.uri);
          
          // Update processing message
          setMessages(prev => prev.map(msg => 
            msg.isProcessing 
              ? { ...msg, content: '🔄 Sedang mengirim gambar ke AI untuk analisis...' }
              : msg
          ));
        } catch (compressionError) {
          console.warn('⚠️ Image compression failed, using original:', compressionError);
          // Continue with original images if compression fails
        }
      }
      
      // Use appropriate endpoint based on whether images are included
      if (compressedImages.length > 0) {
        // Use /chat/upload for images (multipart) - always provide valid message text
        response = await sendChatWithImages(messageText, sessionId, compressedImages);
        
        // Mark that we've provided context (images contain visual context)
        if (!hasProvidedContext) {
          setHasProvidedContext(true);
        }
        
        // Remove processing message after getting response
        setMessages(prev => prev.filter(msg => !msg.isProcessing));
        
        // If this is pre-analysis mode, offer to proceed with analysis
        if (mode === 'pre-analysis' && response.success) {
          const aiMessage = {
            id: response.messageId || Date.now().toString(),
            role: 'assistant',
            content: response.reply + '\n\n✨ Apakah Anda ingin saya melakukan analisis mendalam sekarang?',
            timestamp: new Date().toISOString(),
            hasAnalysisOption: true,
          };
          setMessages(prev => [...prev, aiMessage]);
        } else if (response.success) {
          const aiMessage = {
            id: response.messageId || Date.now().toString(),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, aiMessage]);

          // Background sync of image-based analysis (visual findings) to backend
          try {
            const vf = response.data?.visual_findings || {};
            if (vf && (vf.detections || vf.annotated_image_base64 || vf.summary || vf.overall_assessment)) {
              const analysisPayload = {
                id: response.messageId || Date.now().toString(),
                session_id: sessionId,
                findings: response.reply || '',
                summary: vf.summary || vf.overall_summary || '',
                overall_assessment: vf.overall_assessment || '',
                risk_level: vf.risk_level || 'unknown',
                confidence_score: typeof vf.confidence === 'number' ? Math.round(vf.confidence * 100) : vf.confidence_score || null,
                detections: vf.detections || [],
                recommendations: vf.recommendations || [],
                image_url: compressedImages?.[0] || null,
                annotated_image_url: vf.annotated_image_base64 ? `data:image/jpeg;base64,${vf.annotated_image_base64}` : null,
                timestamp: new Date().toISOString(),
              };
              dispatch(syncAnalysisToBackend(analysisPayload));
            }
          } catch (syncErr) {
            if (__DEV__) console.warn('Chat sync skipped:', syncErr?.message);
          }
        }
      } else {
        // Use /chat for text only (JSON)
        // If we have analysis context and haven't sent it yet, prepend to message
        let messageToSend = messageText;
        if (analysisContextRef.current && !hasProvidedContext && mode !== 'pre-analysis') {
          messageToSend = analysisContextRef.current + 'Pertanyaan user: ' + messageText;
          setHasProvidedContext(true);
          if (__DEV__) {
            console.log('📤 Sending message with analysis context');
          }
        }
        
        response = await sendChatMessage(messageToSend, sessionId);
        
        if (response.success) {
          const aiMessage = {
            id: response.messageId || Date.now().toString(),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, aiMessage]);
        }
      }

      if (!response.success) {
        // Remove processing message
        setMessages(prev => prev.filter(msg => !msg.isProcessing));
        
        // Show specific error message from service
        const errorMsg = response.error || 'Gagal mengirim pesan. Coba lagi.';
        showToast(errorMsg, 'error');
        
        // If 504 timeout, show retry suggestion with more context
        if (response.statusCode === 504) {
          const systemMessage = {
            id: Date.now().toString() + '_system',
            role: 'system',
            content: compressedImages.length > 0 
              ? '⚠️ Server AI sedang memproses banyak request. Mohon tunggu 2-3 menit sebelum mencoba lagi.\n\nℹ️ Gambar sudah dikompres untuk mempercepat proses.'
              : '⚠️ Server sedang sibuk. Mohon tunggu 1-2 menit sebelum mengirim pesan lagi.',
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, systemMessage]);
        }
      }
      
      // Auto scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      // Remove processing message
      setMessages(prev => prev.filter(msg => !msg.isProcessing));
      
      const errorMsg = error.message || 'Terjadi kesalahan saat mengirim pesan';
      showToast(errorMsg, 'error');
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now().toString() + '_error',
        role: 'system',
        content: '❌ Pesan gagal terkirim. Coba lagi dalam beberapa saat.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleProceedAnalysis = () => {
    // Use pendingImages if available, otherwise use images from params
    const imagesToAnalyze = pendingImages || images || [];
    navigation.replace('Analysis', {
      images: imagesToAnalyze,
      sessionId,
    });
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={['#7C3AED', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + normalize(10) }]}
      >
        <IconButton
          icon="arrow-left"
          size={normalize(24)}
          iconColor="#FFFFFF"
          onPress={() => {
            // If we have analysisData and not in pre-analysis mode, go back to Result
            if (analysisData && mode !== 'pre-analysis') {
              navigation.navigate('Result', { sessionId, analysisData, images });
            } else {
              navigation.navigate('AIHome');
            }
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Chat dengan AI Diagnosis</Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'pre-analysis' ? 'Jelaskan kondisi Anda untuk hasil lebih akurat' : 'Tanya lebih lanjut tentang diagnosis'}
          </Text>
        </View>
        <IconButton
          icon="delete-outline"
          size={normalize(24)}
          iconColor="#FFFFFF"
          onPress={() => {
            setMessages([]);
            showToast('Chat history dihapus', 'info');
          }}
        />
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : 
              message.role === 'system' ? styles.systemBubble :
              styles.aiBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <MaterialCommunityIcons
                name="robot-outline"
                size={normalize(20)}
                color="#7C3AED"
                style={styles.aiIcon}
              />
            )}
            {message.role === 'system' && (
              <MaterialCommunityIcons
                name="information-outline"
                size={normalize(18)}
                color="#F59E0B"
                style={styles.aiIcon}
              />
            )}
            
            {message.images && message.images.length > 0 && (
              <View style={styles.messageImages}>
                {message.images.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={styles.messageImage}
                  />
                ))}
              </View>
            )}
            
            {message.annotatedImage && (
              <View style={styles.annotatedImageContainer}>
                <Text style={styles.annotatedImageLabel}>📸 Gambar dengan Anotasi AI:</Text>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${message.annotatedImage}` }}
                  style={styles.annotatedImage}
                  resizeMode="contain"
                  onError={(error) => {
                    if (__DEV__) {
                      console.log('❌ Error loading annotated image:', error.nativeEvent.error);
                    }
                  }}
                  onLoad={() => {
                    if (__DEV__) {
                      console.log('✅ Annotated image loaded successfully');
                    }
                  }}
                />
              </View>
            )}
            
            <Text style={[
              styles.messageText,
              message.role === 'user' ? styles.userText : 
              message.role === 'system' ? styles.systemText :
              styles.aiText,
            ]}>
              {message.content.replace(/\*\*/g, '').replace(/\*/g, '•')}
            </Text>
            
            {message.hasAnalysisOption && (
              <TouchableOpacity
                style={styles.analysisButton}
                onPress={handleProceedAnalysis}
              >
                <MaterialCommunityIcons name="brain" size={normalize(16)} color="#FFFFFF" />
                <Text style={styles.analysisButtonText}>Ya, Analisis Sekarang</Text>
              </TouchableOpacity>
            )}
            
            <Text style={[
              styles.messageTime,
              message.role === 'user' ? styles.userTime : styles.aiTime,
            ]}>
              {new Date(message.timestamp).toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        ))}
        
        {isSending && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={normalize(20)}
              color="#7C3AED"
              style={styles.aiIcon}
            />
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text style={[styles.messageText, styles.aiText, { marginTop: normalize(8) }]}>
              AI sedang mengetik...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Image Preview */}
      {selectedImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imagePreview}
        >
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.previewImageContainer}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <MaterialCommunityIcons name="close-circle" size={normalize(20)} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + normalize(10) }]}>
        <IconButton
          icon="image-outline"
          size={normalize(24)}
          iconColor="#7C3AED"
          onPress={pickImage}
          disabled={isSending}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Ketik pertanyaan Anda..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isSending}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() && selectedImages.length === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={isSending || (!inputText.trim() && selectedImages.length === 0)}
        >
          <MaterialCommunityIcons
            name={isSending ? "loading" : "send"}
            size={normalize(20)}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(8),
    paddingBottom: normalize(16),
    borderBottomLeftRadius: normalize(24),
    borderBottomRightRadius: normalize(24),
  },
  headerTitle: {
    fontSize: normalize(18),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: normalize(12),
    color: 'rgba(255,255,255,0.9)',
    marginTop: normalize(2),
  },
  messagesContainer: {
    padding: normalize(16),
    paddingBottom: normalize(24),
  },
  messageBubble: {
    maxWidth: '90%',
    marginBottom: normalize(16),
    borderRadius: normalize(20),
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
    borderWidth: 1,
    borderColor: '#FCD34D',
    maxWidth: '85%',
  },
  aiIcon: {
    marginBottom: normalize(6),
  },
  messageText: {
    fontSize: normalize(14),
    lineHeight: normalize(20),
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F2937',
  },
  systemText: {
    color: '#92400E',
    fontSize: normalize(13),
    fontWeight: '500',
    textAlign: 'center',
  },
  messageTime: {
    fontSize: normalize(10),
    marginTop: normalize(6),
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  aiTime: {
    color: '#9CA3AF',
  },
  messageImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(10),
    marginBottom: normalize(12),
  },
  messageImage: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(12),
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  annotatedImageContainer: {
    marginBottom: normalize(12),
    width: '100%',
    alignItems: 'center',
  },
  annotatedImageLabel: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: normalize(10),
    alignSelf: 'flex-start',
  },
  annotatedImage: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: normalize(16),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePreview: {
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(16),
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: normalize(12),
  },
  previewImageContainer: {
    marginRight: normalize(4),
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: normalize(90),
    height: normalize(90),
    borderRadius: normalize(12),
    borderWidth: 2,
    borderColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
  },
  removeImageButton: {
    position: 'absolute',
    top: normalize(-8),
    right: normalize(-8),
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(12),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(12),
    paddingTop: normalize(12),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: normalize(24),
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(10),
    fontSize: normalize(14),
    color: '#1F2937',
    maxHeight: normalize(100),
  },
  sendButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: normalize(8),
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(10),
    borderRadius: normalize(12),
    marginTop: normalize(12),
    justifyContent: 'center',
  },
  analysisButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(14),
    fontWeight: '600',
    marginLeft: normalize(8),
  },
});

export default ChatScreen;
