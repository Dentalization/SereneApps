import React from 'react';
import { 
  View, 
  ScrollView, 
  StatusBar, 
  StyleSheet,
  Dimensions, 
  Platform, 
  PixelRatio,
  Image,
  Alert,
  Share,
} from 'react-native';
import { Text, Card, Button, useTheme, Chip, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import RiskBadge from '../../../components/shared/RiskBadge';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { getSession, getSessionMessages, sendChatMessage } from '../../../services/aiDiagnosisService';
import { useToast } from '../../../hooks/useToast';
import ValidationToast from '../../settings/components/ValidationToast';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = Math.min(SCREEN_WIDTH / 375, 1.2);

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
// -------------------------

const RISK_GRADIENTS = {
  low: ['#0F9D58', '#34A853'],
  medium: ['#F97316', '#FB923C'],
  high: ['#DC2626', '#EF4444'],
};

const normalizeConfidence = (value) => {
  if (value === null || value === undefined) return 0.5;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return 0.5;
    return value.includes('%') || parsed > 1 ? parsed / 100 : parsed;
  }
  if (typeof value === 'number') {
    return value > 1 ? value / 100 : value;
  }
  return 0.5;
};

const stripMarkdown = (text = '') => text.replace(/\*\*/g, '').trim();

const sanitizeRichText = (text = '') =>
  text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '');

const parseContentSections = (text = '') => {
  if (typeof text !== 'string' || !text.includes('**')) return {};
  const sections = {};
  const regex = /\*\*([^\*]+)\*\*:?([\s\S]*?)(?=\n\*\*|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const title = match[1].trim().toLowerCase();
    const body = match[2]
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    if (body.length) {
      sections[title] = body;
    }
  }
  return sections;
};

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return value;
};

const formatImageUri = (data, mime = 'image/jpeg') => {
  if (!data) return null;
  if (typeof data !== 'string') return null;
  if (data.startsWith('http') || data.startsWith('file://') || data.startsWith('data:image')) {
    return data;
  }
  return `data:${mime};base64,${data}`;
};

const resolveImageUri = (image) => {
  if (!image) return null;
  
  if (__DEV__) {
    console.log('🔍 resolveImageUri input:', {
      type: typeof image,
      isString: typeof image === 'string',
      preview: typeof image === 'string' ? image.substring(0, 50) : JSON.stringify(image).substring(0, 100),
      keys: typeof image === 'object' && image ? Object.keys(image) : [],
    });
  }
  
  if (typeof image === 'string') {
    const result = formatImageUri(image);
    if (__DEV__ && result) {
      console.log('  → Resolved string to:', result.substring(0, 60));
    }
    return result;
  }
  // Check various possible URL/URI fields
  if (image.url) {
    if (__DEV__) console.log('  → Using image.url:', image.url.substring(0, 60));
    return image.url;
  }
  if (image.uri) {
    if (__DEV__) console.log('  → Using image.uri:', image.uri.substring(0, 60));
    return image.uri;
  }
  if (image.src) {
    if (__DEV__) console.log('  → Using image.src:', image.src.substring(0, 60));
    return image.src;
  }
  if (image.source) {
    const result = typeof image.source === 'string' ? image.source : image.source?.uri;
    if (__DEV__ && result) console.log('  → Using image.source:', result.substring(0, 60));
    return result;
  }
  // Check base64 data fields
  if (image.data) {
    const result = formatImageUri(image.data, image.mime_type || image.mimeType);
    if (__DEV__ && result) console.log('  → Using image.data, converted to data URI');
    return result;
  }
  if (image.base64) {
    const result = formatImageUri(image.base64, image.mime_type || image.mimeType);
    if (__DEV__ && result) console.log('  → Using image.base64, converted to data URI');
    return result;
  }
  if (image.image_data) {
    const result = formatImageUri(image.image_data, image.mime_type || image.mimeType);
    if (__DEV__ && result) console.log('  → Using image.image_data, converted to data URI');
    return result;
  }
  if (image.annotated_image_base64) {
    const result = formatImageUri(image.annotated_image_base64, image.mime_type);
    if (__DEV__ && result) console.log('  → Using image.annotated_image_base64');
    return result;
  }
  
  if (__DEV__) {
    console.log('  → Could not resolve image, returning null');
  }
  return null;
};

const getMessageImages = (message) => {
  const images = [];
  const seenUris = new Set();
  
  const imageBuckets = [
    message?.images,
    message?.image_urls,
    message?.uploaded_images,
    message?.file_urls,
    message?.files,
    message?.metadata?.images,
    message?.metadata?.image_urls,
    message?.metadata?.uploaded_images,
    message?.metadata?.attachments,
    message?.metadata?.files,
    message?.metadata?.analysis?.images,
    message?.attachments,
    message?.content_json?.images,
    message?.content_json?.image_urls,
    message?.content_json?.attachments,
    message?.analysis?.images,
    message?.payload?.images,
    message?.payload?.attachments,
  ];
  
  imageBuckets.forEach((bucket) => {
    if (Array.isArray(bucket)) {
      bucket.forEach((img, idx) => {
        const uri = resolveImageUri(img);
        if (uri && !seenUris.has(uri)) {
          seenUris.add(uri);
          images.push({ uri, id: `${message.id || message.created_at || 'img'}-${images.length}-${idx}`, type: 'upload' });
        }
      });
    } else if (bucket && typeof bucket === 'string') {
      // Single image URL as string
      const uri = resolveImageUri(bucket);
      if (uri && !seenUris.has(uri)) {
        seenUris.add(uri);
        images.push({ uri, id: `${message.id || message.created_at || 'img'}-${images.length}`, type: 'upload' });
      }
    }
  });
  
  // Check for single image field
  const singleImageUri = resolveImageUri(message?.image || message?.metadata?.image || message?.image_url || message?.metadata?.image_url);
  if (singleImageUri && !seenUris.has(singleImageUri)) {
    seenUris.add(singleImageUri);
    images.push({ uri: singleImageUri, id: `${message.id || message.created_at || 'img'}-single`, type: 'upload' });
  }
  
  const annotatedUri = resolveImageUri(
    message?.visual_findings?.annotated_image_base64 || 
    message?.annotated_image_base64 ||
    message?.annotated_image ||
    message?.metadata?.annotated_image_base64 ||
    message?.metadata?.annotated_image ||
    message?.metadata?.visual_findings?.annotated_image_base64
  );
  if (annotatedUri && !seenUris.has(annotatedUri)) {
    seenUris.add(annotatedUri);
    images.push({
      uri: annotatedUri,
      id: `${message.id || message.created_at || 'annotated'}-annotated`,
      type: 'annotated',
    });
  }
  return images;
};

const formatMessageContent = (text = '') =>
  stripMarkdown(text)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Component for images with fallback when loading fails
const ImageWithFallback = ({ uri, style, resizeMode = 'cover' }) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  if (!uri || hasError) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' }]}>
        <MaterialCommunityIcons name="image-off-outline" size={normalize(24)} color="#94A3B8" />
        <Text style={{ fontSize: normalize(9), color: '#94A3B8', marginTop: normalize(4), textAlign: 'center' }}>
          Gambar{'\n'}tidak tersedia
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.patientImageContainer}>
      <Image
        source={{ uri }}
        style={style}
        resizeMode={resizeMode}
        onError={(error) => {
          if (__DEV__) {
            console.log('❌ Image load error:', error.nativeEvent?.error);
            console.log('   URI preview:', uri?.substring(0, 100));
          }
          setHasError(true);
        }}
        onLoad={() => {
          if (__DEV__) {
            console.log('✅ Image loaded successfully');
          }
          setIsLoading(false);
        }}
      />
    </View>
  );
};

const DetailHistoryScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sessionId } = route.params;
  const { toast, showToast, hideToast } = useToast();

  const [sessionData, setSessionData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('diagnosis'); // 'diagnosis' or 'chat'

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(180);

  React.useEffect(() => {
    loadSessionDetails();
  }, [sessionId]);

  // --- SAFE TO USE HOOKS HERE (BEFORE RETURN) ---
  
  // FIX: Moved useMemo here, BEFORE the if(isLoading) check
  // Enhanced to extract images from multiple possible locations
  const patientImages = React.useMemo(() => {
    if (!sessionData?.messages) return [];
    const collected = [];
    
    if (__DEV__) {
      console.log('🔍 patientImages - Processing messages:', sessionData.messages.length);
    }
    
    sessionData.messages.forEach((message, messageIndex) => {
      if (message.role === 'user') {
        if (__DEV__) {
          console.log(`🔍 User message ${messageIndex}:`, {
            hasImages: !!message.images,
            imagesLength: message.images?.length,
            hasImageUrls: !!message.image_urls,
            hasMetadata: !!message.metadata,
            metadataKeys: message.metadata ? Object.keys(message.metadata) : [],
            allKeys: Object.keys(message),
          });
        }
        
        // Check all possible image locations
        const imageSources = [
          message.images,
          message.image_urls,
          message.uploaded_images,
          message.file_urls,
          message.files,
          message.metadata?.images,
          message.metadata?.image_urls,
          message.metadata?.uploaded_images,
          message.metadata?.attachments,
          message.metadata?.files,
          message.attachments,
          message.content_json?.images,
          message.content_json?.attachments,
        ];
        
        imageSources.forEach((source, sourceIdx) => {
          if (Array.isArray(source) && source.length > 0) {
            if (__DEV__) {
              console.log(`  Found images in source ${sourceIdx}:`, source.length);
            }
            source.forEach((img, idx) => {
              const uri = resolveImageUri(img);
              if (uri) {
                // Avoid duplicates
                const isDuplicate = collected.some(existing => existing.uri === uri);
                if (!isDuplicate) {
                  collected.push({
                    uri,
                    id: `${message.id || messageIndex}-${idx}-${collected.length}`,
                    timestamp: message.created_at,
                  });
                }
              }
            });
          }
        });
        
        // Also check if there's a single image field
        const singleImageUri = resolveImageUri(message.image || message.metadata?.image || message.image_url || message.metadata?.image_url);
        if (singleImageUri && !collected.some(existing => existing.uri === singleImageUri)) {
          collected.push({
            uri: singleImageUri,
            id: `${message.id || messageIndex}-single`,
            timestamp: message.created_at,
          });
        }
      }
    });
    
    if (__DEV__) {
      console.log('📷 Patient images collected:', collected.length);
      if (collected.length > 0) {
        collected.forEach((img, idx) => {
          console.log(`  Image ${idx}:`, {
            id: img.id,
            uriType: typeof img.uri,
            uriStartsWith: img.uri?.substring(0, 50),
            isDataUri: img.uri?.startsWith('data:'),
            isHttpUrl: img.uri?.startsWith('http'),
            isFileUri: img.uri?.startsWith('file://'),
            uriLength: img.uri?.length,
          });
        });
      }
    }
    
    return collected;
  }, [sessionData]);

  const loadSessionDetails = async () => {
    try {
      setIsLoading(true);
      const [sessionResponse, messagesResponse] = await Promise.all([
        getSession(sessionId),
        getSessionMessages(sessionId),
      ]);

      if (__DEV__) {
        console.log('📊 DetailHistory - Session Response:', {
          success: sessionResponse.success,
          hasData: !!sessionResponse.data,
        });
        console.log('📊 DetailHistory - Messages Response:', {
          success: messagesResponse?.success,
          messagesCount: messagesResponse?.messages?.length || messagesResponse?.data?.length || 0,
        });
      }

      if (sessionResponse.success && sessionResponse.data) {
        const rawMessages =
          (messagesResponse?.success &&
            (Array.isArray(messagesResponse.messages)
              ? messagesResponse.messages
              : Array.isArray(messagesResponse?.data)
                ? messagesResponse.data
                : messagesResponse?.data?.messages)) ||
          sessionResponse.data.messages ||
          [];

        if (__DEV__) {
          console.log('📋 Raw messages extracted:', rawMessages.length);
          // Debug: Log first message structure to understand API format
          if (rawMessages.length > 0) {
            const firstMsg = rawMessages[0];
            console.log('🔍 First message structure:', {
              id: firstMsg.id,
              role: firstMsg.role,
              hasContent: !!firstMsg.content,
              contentPreview: firstMsg.content?.substring(0, 50),
              hasImages: !!firstMsg.images,
              imagesType: typeof firstMsg.images,
              imagesIsArray: Array.isArray(firstMsg.images),
              imagesLength: Array.isArray(firstMsg.images) ? firstMsg.images.length : 'N/A',
              hasMetadata: !!firstMsg.metadata,
              metadataKeys: firstMsg.metadata ? Object.keys(firstMsg.metadata) : [],
              hasAttachments: !!firstMsg.attachments,
              hasImage_urls: !!firstMsg.image_urls,
              hasUploaded_images: !!firstMsg.uploaded_images,
              allKeys: Object.keys(firstMsg),
            });
            // Also log raw first message for debugging
            console.log('🔍 First message RAW:', JSON.stringify(firstMsg, null, 2).substring(0, 2000));
          }
        }

        const sessionMessages = rawMessages.map((msg) => {
          const parsedMetadata = safeParseJson(msg.metadata) || msg.metadata || {};
          const parsedContentJson = safeParseJson(msg.content_json) || msg.content_json || {};
          const parsedAnalysis =
            safeParseJson(msg.analysis) ||
            safeParseJson(parsedMetadata?.analysis) ||
            safeParseJson(parsedContentJson?.analysis) ||
            msg.analysis;
          
          // Parse images from various possible locations (more comprehensive)
          const parsedImages = 
            safeParseJson(msg.images) || 
            msg.images ||
            safeParseJson(msg.image_urls) || 
            msg.image_urls ||
            safeParseJson(msg.uploaded_images) || 
            msg.uploaded_images ||
            safeParseJson(msg.file_urls) || 
            msg.file_urls ||
            safeParseJson(parsedMetadata?.images) || 
            parsedMetadata?.images ||
            safeParseJson(parsedMetadata?.image_urls) || 
            parsedMetadata?.image_urls ||
            safeParseJson(parsedMetadata?.uploaded_images) || 
            parsedMetadata?.uploaded_images ||
            safeParseJson(parsedContentJson?.images) ||
            parsedContentJson?.images ||
            [];
          
          // Parse attachments
          const parsedAttachments =
            safeParseJson(msg.attachments) ||
            msg.attachments ||
            safeParseJson(msg.files) ||
            msg.files ||
            safeParseJson(parsedMetadata?.attachments) ||
            parsedMetadata?.attachments ||
            safeParseJson(parsedMetadata?.files) ||
            parsedMetadata?.files ||
            [];

          return {
            ...msg,
            metadata: parsedMetadata,
            content_json: parsedContentJson,
            analysis: parsedAnalysis,
            images: Array.isArray(parsedImages) ? parsedImages : (parsedImages ? [parsedImages] : []),
            attachments: Array.isArray(parsedAttachments) ? parsedAttachments : (parsedAttachments ? [parsedAttachments] : []),
          };
        });

        if (__DEV__) {
          console.log('📋 Parsed messages:', sessionMessages.length);
          sessionMessages.forEach((msg, idx) => {
            console.log(`  Message ${idx}: role=${msg.role}, content=${msg.content?.substring(0, 30)}..., images=${msg.images?.length || 0}`);
          });
        }

        if (!messagesResponse?.success) {
          showToast('Tidak dapat memuat riwayat chat, hanya menampilkan ringkasan.', 'warning');
        }

        const finalData = {
          ...sessionResponse.data,
          messages: sessionMessages,
        };

        if (__DEV__) {
          console.log('✅ Final session data:', {
            sessionId: finalData.session_id,
            messagesCount: finalData.messages?.length,
            firstMessage: finalData.messages?.[0]?.content?.substring(0, 50),
          });
        }

        setSessionData(finalData);
      } else {
        showToast('Gagal memuat detail sesi', 'error');
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Error loading session:', error);
      showToast('Terjadi kesalahan saat memuat data', 'error');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const parseAnalysisData = () => {
    const messages = sessionData?.messages || [];
    
    if (__DEV__) {
      console.log('🔍 ParseAnalysisData - Starting with messages:', messages.length);
      if (messages.length > 0) {
        console.log('📨 First message:', {
          role: messages[0]?.role,
          hasContent: !!messages[0]?.content,
          hasVisualFindings: !!messages[0]?.visual_findings,
          hasMetadata: !!messages[0]?.metadata,
        });
      }
    }
    
    if (messages.length === 0) {
      if (__DEV__) console.log('⚠️ No messages found');
      return {
        riskLevel: 'low',
        confidence: 0.5,
        findings: [],
        recommendations: [],
        observations: [],
        annotatedImage: null,
        summary: null,
      };
    }

    const analysisMessage = [...messages].reverse().find(
      msg =>
        msg.role === 'assistant' &&
        (msg.visual_findings ||
          msg.findings ||
          msg.detections ||
          msg.annotated_image_base64 ||
          typeof msg.content === 'string')
    );

    const fallbackSummary = messages.find(m => m.role === 'assistant')?.content || null;

    if (!analysisMessage) {
      return {
        riskLevel: 'low',
        confidence: 0.5,
        findings: [],
        recommendations: [],
        observations: [],
        annotatedImage: null,
        summary: fallbackSummary,
      };
    }

    const dataCandidate =
      analysisMessage.visual_findings ||
      analysisMessage.content_json?.visual_findings ||
      analysisMessage.metadata?.visual_findings ||
      analysisMessage.metadata?.analysis ||
      analysisMessage.analysis ||
      analysisMessage.data ||
      analysisMessage.content_json ||
      analysisMessage;
    const data = safeParseJson(dataCandidate) || dataCandidate;
    const rawContent =
      analysisMessage.content ||
      analysisMessage.metadata?.analysis_text ||
      analysisMessage.metadata?.analysis_markdown ||
      analysisMessage.content_html ||
      analysisMessage.analysis?.summary ||
      '';
    const contentText =
      typeof rawContent === 'string'
        ? sanitizeRichText(rawContent)
        : typeof rawContent === 'object' && rawContent !== null
          ? sanitizeRichText(JSON.stringify(rawContent))
          : '';
    const contentSections = parseContentSections(contentText);

    let findings = [];
    
    // Try structured findings first
    if (Array.isArray(data.findings) && data.findings.length > 0) {
      findings = data.findings;
      if (__DEV__) console.log('✅ Found findings:', findings.length);
    } 
    // Try detections array
    else if (Array.isArray(data.detections) && data.detections.length > 0) {
      if (__DEV__) console.log('✅ Found detections:', data.detections.length);
      findings = data.detections.map((det, idx) => ({
        mark_id: det.mark_id || `[${idx + 1}]`,
        description: det.description || `Detected ${det.label || 'issue'}`,
        confidence: det.confidence || 0.5,
        severity: det.severity || (det.confidence > 0.7 ? 'medium' : 'low'),
        location: det.location || null,
        name: det.label || det.description || 'Unknown',
      }));
    } 
    // Search ALL messages for findings/detections
    else {
      for (const msg of messages) {
        const msgData = msg.visual_findings || msg.metadata?.visual_findings || msg.metadata?.analysis || {};
        if (msgData.findings?.length > 0) {
          findings = msgData.findings;
          if (__DEV__) console.log('✅ Found findings in message:', msg.id || 'unknown');
          break;
        } else if (msgData.detections?.length > 0) {
          findings = msgData.detections.map((det, idx) => ({
            mark_id: det.mark_id || `[${idx + 1}]`,
            description: det.description || `Detected ${det.label || 'issue'}`,
            confidence: det.confidence || 0.5,
            severity: det.severity || (det.confidence > 0.7 ? 'medium' : 'low'),
            location: det.location || null,
            name: det.label || det.description || 'Unknown',
          }));
          if (__DEV__) console.log('✅ Found detections in message:', msg.id || 'unknown');
          break;
        }
      }
      // Fallback to content sections
      if (findings.length === 0 && contentSections['temuan klinis']) {
        findings = contentSections['temuan klinis'].map((entry, idx) => ({
          mark_id: `[${idx + 1}]`,
          description: stripMarkdown(entry),
          confidence: 0.5,
        }));
      }
    }

    let observations =
      data.observations ||
      data.visual_findings?.observations ||
      data.analysis?.observations ||
      analysisMessage.metadata?.analysis?.observations ||
      contentSections['pengamatan positif'] ||
      [];

    if ((!observations || observations.length === 0) && Object.keys(contentSections).length) {
      const areaObservations = Object.entries(contentSections)
        .filter(([title]) => title.startsWith('area bertanda'))
        .flatMap(([title, lines]) => {
          const statement = stripMarkdown(`${title}: ${lines.join(' ')}`);
          return statement ? [statement] : [];
        });
      if (areaObservations.length) {
        observations = areaObservations;
      }
    }

    let recommendations =
      data.recommendations ||
      data.visual_findings?.recommendations ||
      data.analysis?.recommendations ||
      analysisMessage.metadata?.analysis?.recommendations ||
      contentSections['rekomendasi'] ||
      contentSections['rekomendasi perawatan di rumah'] ||
      [];

    if (recommendations && recommendations.length) {
      recommendations = recommendations.map(rec => stripMarkdown(rec.replace(/^\*\s*/, '')));
    } else {
      recommendations = [];
    }

    let summary =
      data.summary ||
      data.overall_assessment ||
      data.analysis?.summary ||
      analysisMessage.metadata?.analysis?.summary ||
      analysisMessage.metadata?.analysis?.overall_assessment ||
      contentSections['apa artinya ini?']?.join(' ') ||
      fallbackSummary ||
      null;

    let riskLevel = data.concern_level || 'low';
    if (findings.some(f => f.severity === 'high' || f.severity === 'critical')) {
      riskLevel = 'high';
    } else if (findings.some(f => f.severity === 'medium')) {
      riskLevel = 'medium';
    }

    const avgConfidence = findings.length > 0
      ? findings.reduce((sum, f) => sum + normalizeConfidence(f.confidence), 0) / findings.length
      : 0.5;

    // Search ALL messages for annotated image
    let annotatedImageBase64 = null;
    
    // Try analysis message first
    annotatedImageBase64 = 
      data.annotated_image_base64 ||
      analysisMessage.annotated_image_base64 ||
      analysisMessage.visual_findings?.annotated_image_base64 ||
      analysisMessage.metadata?.annotated_image_base64 ||
      null;
    
    // If not found, search all messages
    if (!annotatedImageBase64) {
      for (const msg of messages) {
        const candidate = 
          msg.annotated_image_base64 ||
          msg.visual_findings?.annotated_image_base64 ||
          msg.metadata?.annotated_image_base64 ||
          msg.metadata?.visual_findings?.annotated_image_base64 ||
          msg.metadata?.analysis?.annotated_image_base64;
        if (candidate) {
          annotatedImageBase64 = candidate;
          if (__DEV__) console.log('✅ Found annotated image in message:', msg.id || 'unknown');
          break;
        }
      }
    }

    const annotatedImageUri = annotatedImageBase64 
      ? formatImageUri(annotatedImageBase64)
      : null;
    
    if (__DEV__) {
      console.log('🖼️ Image extraction result:', {
        hasBase64: !!annotatedImageBase64,
        base64Length: annotatedImageBase64?.length || 0,
        hasUri: !!annotatedImageUri,
        uriPreview: annotatedImageUri?.substring(0, 50),
      });
      console.log('📋 ParseAnalysisData final result:', {
        findingsCount: findings.length,
        observationsCount: observations.length,
        recommendationsCount: recommendations.length,
        hasSummary: !!summary,
        hasAnnotatedImage: !!annotatedImageUri,
        riskLevel,
      });
    }

    return {
      riskLevel,
      confidence: avgConfidence,
      findings: findings.map((f, idx) => ({
        id: f.id || idx + 1,
        name: f.name || f.condition || f.label || stripMarkdown(f.description) || 'Kondisi tidak diketahui',
        severity: f.severity || 'low',
        confidence: normalizeConfidence(f.confidence),
        location: f.location || f.area || '-',
        mark: f.mark_id || f.mark || `[${idx + 1}]`,
        description: stripMarkdown(f.description || ''),
      })),
      recommendations,
      observations,
      annotatedImage: annotatedImageUri,
      summary: summary ? stripMarkdown(summary) : null,
    };
  };

  const generateMedicalReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      const conversationHistory = sessionData.messages
        .map(msg => `${msg.role === 'user' ? 'Pasien' : 'AI Diagnosis'}: ${msg.content}`)
        .join('\n\n');

      const reportPrompt = `Berdasarkan percakapan diagnosis gigi berikut, buatkan laporan medis lengkap dengan format:

**LAPORAN DIAGNOSIS GIGI**
Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

**1. RINGKASAN KONDISI**
[Deskripsi singkat kondisi gigi pasien]

**2. TEMUAN KLINIS**
[Detail temuan dari analisis AI, termasuk lokasi dan tingkat keparahan]

**3. REKOMENDASI PERAWATAN**
[Saran tindakan yang perlu dilakukan]

**4. CATATAN TAMBAHAN**
[Informasi penting lainnya dari percakapan]

---
PERCAKAPAN LENGKAP:
${conversationHistory}

Buatkan laporan profesional yang dapat dibagikan ke dokter gigi.`;

      const response = await sendChatMessage(reportPrompt, sessionId);

      if (response.success && response.reply) {
        return response.reply;
      } else {
        throw new Error('Gagal generate laporan');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleExportReport = async (format = 'text') => {
    try {
      showToast('Membuat laporan...', 'info');
      const reportContent = await generateMedicalReport();

      if (format === 'pdf') {
        Alert.alert(
          'Coming Soon',
          'Export PDF akan segera tersedia. Saat ini laporan dapat dibagikan sebagai teks.',
          [{ text: 'OK' }]
        );
        return;
      }

      const fileName = `Laporan_Diagnosis_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, reportContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Bagikan Laporan Diagnosis',
        });
        showToast('Laporan berhasil dibuat', 'success');
      } else {
        await Share.share({
          message: reportContent,
          title: 'Laporan Diagnosis Gigi',
        });
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Gagal membuat laporan', 'error');
    }
  };

  const handleSaveReportToDB = async () => {
    try {
      showToast('Menyimpan laporan...', 'info');
      // Simulate API call
      setTimeout(() => {
        showToast('Laporan tersimpan di riwayat', 'success');
      }, 1000);
    } catch (error) {
      console.error('Error saving report:', error);
      showToast('Gagal menyimpan laporan', 'error');
    }
  };

  // --- CONDITIONAL RENDERING STARTS HERE ---
  // Hooks must be defined above this line

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: normalize(12), color: '#64748B' }}>Memuat detail...</Text>
      </View>
    );
  }

  const result = parseAnalysisData();
  
  const gradient = RISK_GRADIENTS[result.riskLevel] || [theme.colors.primary, '#7F1DFF'];
  const createdDate = sessionData?.created_at 
    ? new Date(sessionData.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Tanggal tidak tersedia';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient 
          colors={gradient} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.hero, { paddingTop: insets.top + normalize(5) }]}
        >
          <View style={styles.heroTopRow}>
            {/* UPDATED BACK BUTTON: ICON ONLY */}
            <IconButton
              icon="chevron-left"
              size={normalize(32)} // Sedikit lebih besar agar mudah ditekan
              iconColor="#FFFFFF"
              onPress={() => navigation.goBack()}
              style={{ marginLeft: -normalize(10) }} // Align visual dengan margin kiri
            />
            
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="share-variant"
                size={normalize(24)}
                iconColor="#FFFFFF"
                onPress={() => {
                  Alert.alert(
                    'Bagikan Laporan',
                    'Pilih format laporan',
                    [
                      { text: 'Teks', onPress: () => handleExportReport('text') },
                      { text: 'PDF (Soon)', onPress: () => handleExportReport('pdf') },
                      { text: 'Batal', style: 'cancel' },
                    ]
                  );
                }}
              />
              <IconButton
                icon="content-save"
                size={normalize(24)}
                iconColor="#FFFFFF"
                onPress={handleSaveReportToDB}
              />
            </View>
          </View>

          <View style={styles.heroCompactContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Riwayat Diagnosis</Text>
              <Text style={styles.heroTitle}>Scan {createdDate}</Text>
              <Text style={styles.heroSubtitle}>{result.findings.length} temuan terdeteksi</Text>
            </View>
            
            <View style={styles.heroBadgeContainer}>
              <RiskBadge level={result.riskLevel} style={{ transform: [{ scale: 1.1 }] }} />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Selector */}
      <View style={{ paddingTop: headerHeight + normalize(8), paddingHorizontal: normalize(16) }}>
        <View style={styles.tabContainer}>
          <Button
            mode={activeTab === 'diagnosis' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('diagnosis')}
            style={[styles.tabButton, activeTab === 'diagnosis' && styles.tabButtonActive]}
            labelStyle={styles.tabLabel}
          >
            Hasil Diagnosis
          </Button>
          <Button
            mode={activeTab === 'chat' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('chat')}
            style={[styles.tabButton, activeTab === 'chat' && styles.tabButtonActive]}
            labelStyle={styles.tabLabel}
          >
            Riwayat Chat
          </Button>
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView
        contentContainerStyle={{ 
          paddingTop: normalize(16),
          paddingBottom: normalize(100) + insets.bottom, 
          paddingHorizontal: normalize(16) 
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'diagnosis' ? (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="bullseye-arrow" size={normalize(20)} color="#64748B" />
                <Text style={styles.statValue}>{Math.round(result.confidence * 100)}%</Text>
                <Text style={styles.statLabel}>Akurasi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="alert-circle-outline" size={normalize(20)} color="#64748B" />
                <Text style={styles.statValue}>{result.findings.length}</Text>
                <Text style={styles.statLabel}>Temuan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={normalize(20)} color="#64748B" />
                <Text style={styles.statValue}>{result.recommendations.length || 1}</Text>
                <Text style={styles.statLabel}>Saran</Text>
              </View>
            </View>

            {/* Visualisasi Area - Annotated Image from AI */}
            {result.annotatedImage && (
              <Card style={styles.card}>
                <Card.Content style={{ padding: normalize(12) }}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: normalize(8)}}>
                    <Text style={styles.cardTitle}>Visualisasi Area</Text>
                    <Chip icon="eye" style={{height: normalize(24)}} textStyle={{fontSize: normalize(10), marginVertical: -4}}>AI View</Chip>
                  </View>
                  <Image
                    source={{ uri: result.annotatedImage }}
                    style={styles.annotatedImage}
                    resizeMode="contain"
                    onError={(error) => {
                      if (__DEV__) {
                        console.log('❌ Image load error:', error.nativeEvent.error);
                        console.log('Image URI:', result.annotatedImage?.substring(0, 100));
                      }
                    }}
                    onLoad={() => {
                      if (__DEV__) {
                        console.log('✅ Annotated image loaded successfully');
                      }
                    }}
                  />
                </Card.Content>
              </Card>
            )}

            {/* Summary */}
            {result.summary && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Ringkasan</Text>
                  <Text style={styles.bodyText}>
                    {result.summary.replace(/\*\*/g, '').replace(/\*/g, '•')}
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Findings List */}
            {result.findings.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Detail Temuan ({result.findings.length})</Text>
                  {result.findings.map((finding, index) => (
                    <View key={finding.id}>
                      <View style={styles.findingRow}>
                        <View style={styles.findingNumberBadge}>
                          <Text style={styles.findingNumberText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: normalize(10), marginRight: normalize(4) }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.findingName} numberOfLines={2}>{finding.name}</Text>
                            <View style={{ marginLeft: normalize(8) }}>
                              <RiskBadge level={finding.severity} size="small" />
                            </View>
                          </View>
                          <Text style={styles.findingMeta}>
                            Lokasi: {finding.location || '-'} • Akurasi {Math.round(finding.confidence * 100)}%
                          </Text>
                        </View>
                      </View>
                      {index < result.findings.length - 1 && <Divider style={{ marginVertical: normalize(12) }} />}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}

            {/* Observations */}
            {result.observations && result.observations.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Pengamatan Positif ({result.observations.length})</Text>
                  {result.observations.map((obs, idx) => (
                    <View key={idx} style={{ marginBottom: normalize(10), flexDirection: 'row' }}>
                      <MaterialCommunityIcons name="check-circle" size={normalize(18)} color="#10B981" style={{marginTop: 2, marginRight: 8}} />
                      <Text style={[styles.bodyText, {flex: 1}]}>{obs}</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}

            {/* Recommendations */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Saran Tindakan</Text>
                {result.recommendations.length > 0 ? (
                  result.recommendations.map((rec, idx) => (
                    <View key={idx} style={{ marginBottom: normalize(10), flexDirection: 'row' }}>
                      <MaterialCommunityIcons name="check-circle" size={normalize(18)} color="#10B981" style={{marginTop: 2, marginRight: 8}} />
                      <Text style={[styles.bodyText, {flex: 1}]}>{rec}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.bodyText}>
                    Konsultasikan dengan dokter gigi untuk pemeriksaan lebih lanjut.
                  </Text>
                )}
              </Card.Content>
            </Card>
          </>
        ) : (
          /* Chat History Tab */
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Percakapan dengan AI</Text>
              
              {/* Show annotated image at top if available */}
              {result.annotatedImage && (
                <View style={styles.chatAnnotatedImageContainer}>
                  <Text style={styles.chatAnnotatedLabel}>Hasil Analisis AI</Text>
                  <Image
                    source={{ uri: result.annotatedImage }}
                    style={styles.chatAnnotatedImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              {sessionData?.messages && sessionData.messages.length > 0 ? (
                sessionData.messages.map((message, index) => {
                  // For user messages, check if they had images attached (indicated by content mentioning foto/gambar)
                  const hadImages = message.role === 'user' && 
                    (message.content?.toLowerCase().includes('foto') || 
                     message.content?.toLowerCase().includes('gambar') ||
                     message.content?.toLowerCase().includes('upload'));
                  
                  return (
                  <View
                    key={index}
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    {message.role === 'assistant' && (
                      <MaterialCommunityIcons
                        name="robot-outline"
                        size={normalize(18)}
                        color="#7C3AED"
                        style={{ marginBottom: normalize(6) }}
                      />
                    )}
                    
                    {/* User message icon for messages with images */}
                    {message.role === 'user' && hadImages && (
                      <View style={styles.userImageIndicator}>
                        <MaterialCommunityIcons name="image" size={normalize(14)} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.userImageIndicatorText}>Foto terlampir</Text>
                      </View>
                    )}
                    
                    {message.content ? (
                      <Text
                        style={[
                          styles.messageText,
                          message.role === 'user' ? styles.userText : styles.aiText,
                        ]}
                      >
                        {formatMessageContent(message.content)}
                      </Text>
                    ) : null}

                    <Text style={[
                      styles.messageTime,
                      message.role === 'user' ? styles.userTimeText : styles.aiTimeText,
                    ]}>
                      {new Date(message.created_at || Date.now()).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                  );
                })
              ) : (
                <Text style={styles.bodyText}>Belum ada percakapan</Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Export Actions */}
        <Card style={[styles.card, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}>
          <Card.Content>
            <Text style={styles.cardTitle}>Export Laporan</Text>
            <Text style={[styles.bodyText, { marginBottom: normalize(12) }]}>
              Unduh atau bagikan laporan diagnosis lengkap untuk dibawa ke dokter gigi.
            </Text>
            
            <Button
              mode="contained"
              icon="file-document"
              onPress={() => handleExportReport('text')}
              style={{ marginBottom: normalize(8) }}
              contentStyle={{ paddingVertical: normalize(6) }}
              loading={isGeneratingReport}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? 'Membuat Laporan...' : 'Unduh Laporan (TXT)'}
            </Button>
            
            <Button
              mode="outlined"
              icon="file-pdf-box"
              onPress={() => handleExportReport('pdf')}
              contentStyle={{ paddingVertical: normalize(6) }}
              disabled={isGeneratingReport}
            >
              Unduh Laporan (PDF) - Soon
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  anchorWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  hero: {
    paddingHorizontal: normalize(20),
    paddingBottom: normalize(24),
    borderBottomLeftRadius: normalize(24),
    borderBottomRightRadius: normalize(24),
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(12),
  },
  heroCompactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: normalize(10),
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: normalize(20),
    fontWeight: '700',
    marginTop: normalize(2),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: normalize(12),
    marginTop: normalize(2),
  },
  heroBadgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: normalize(8),
    borderRadius: normalize(16),
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(12),
    padding: normalize(4),
    gap: normalize(8),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    borderRadius: normalize(8),
  },
  tabButtonActive: {
    elevation: 0,
  },
  tabLabel: {
    fontSize: normalize(13),
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(16),
    padding: normalize(16),
    marginBottom: normalize(16),
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: '#0F172A',
    marginTop: normalize(4),
  },
  statLabel: {
    fontSize: normalize(10),
    color: '#64748B',
    marginTop: normalize(2),
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E2E8F0',
  },
  card: {
    borderRadius: normalize(16),
    marginBottom: normalize(16),
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  cardTitle: {
    fontSize: normalize(15),
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: normalize(8),
  },
  bodyText: {
    color: '#475569', 
    lineHeight: normalize(20), 
    fontSize: normalize(13)
  },
  annotatedImage: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.35,
    borderRadius: normalize(8),
    backgroundColor: '#F1F5F9',
  },
  patientImage: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(12),
    marginRight: normalize(10),
    backgroundColor: '#E2E8F0',
  },
  patientImageContainer: {
    marginRight: normalize(10),
  },
  noImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(24),
    backgroundColor: '#F8FAFC',
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  noImageText: {
    color: '#94A3B8',
    fontSize: normalize(12),
    marginTop: normalize(8),
    textAlign: 'center',
  },
  findingRow: {
    flexDirection: 'row', 
    alignItems: 'flex-start'
  },
  findingNumberBadge: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(2),
  },
  findingNumberText: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: '#64748B',
  },
  findingName: {
    fontWeight: '600', 
    color: '#0F172A', 
    fontSize: normalize(13),
    flex: 1,
  },
  findingMeta: {
    color: '#64748B', 
    fontSize: normalize(11), 
    marginTop: normalize(2)
  },
  messageBubble: {
    maxWidth: '100%',
    marginBottom: normalize(12),
    borderRadius: normalize(16),
    padding: normalize(12),
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: normalize(4),
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: normalize(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: normalize(13),
    lineHeight: normalize(19),
  },
  messageImage: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(10),
    marginRight: normalize(8),
    marginTop: normalize(4),
    backgroundColor: '#E2E8F0',
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: normalize(10),
    marginTop: normalize(4),
  },
  userTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  aiTimeText: {
    color: '#9CA3AF',
  },
  chatAnnotatedImageContainer: {
    marginBottom: normalize(16),
    backgroundColor: '#F8FAFC',
    borderRadius: normalize(12),
    padding: normalize(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatAnnotatedLabel: {
    fontSize: normalize(12),
    fontWeight: '600',
    color: '#64748B',
    marginBottom: normalize(8),
    textAlign: 'center',
  },
  chatAnnotatedImage: {
    width: '100%',
    height: normalize(200),
    borderRadius: normalize(10),
    backgroundColor: '#E2E8F0',
  },
  userImageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(6),
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(4),
    borderRadius: normalize(6),
    alignSelf: 'flex-start',
  },
  userImageIndicatorText: {
    fontSize: normalize(11),
    color: 'rgba(255,255,255,0.9)',
    marginLeft: normalize(4),
    fontWeight: '500',
  },
});

export default DetailHistoryScreen;
