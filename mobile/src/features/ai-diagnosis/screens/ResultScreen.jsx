import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet, Dimensions, Platform, PixelRatio, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RiskBadge from '../../../components/shared/RiskBadge';
import AuthGuard from '../../../components/shared/AuthGuard';
import { AUTH_LEVELS } from '../../../store/slices/authSlice';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { normalizeAnalysisResult, toImageUri } from '../utils/analysisResult';
import { syncAnalysisToBackend } from '../../../store/slices/aiSlice';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Batasi scale agar tidak terlalu besar di tablet/layar lebar
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

const ResultScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sessionId, analysisData, images } = route.params;
  const dispatch = useDispatch();
  const { authLevel } = useSelector((state) => state.auth);
  const [showAuthGuard, setShowAuthGuard] = React.useState(false);
  const imageBackfillRef = React.useRef(null);
  
  // Header height logic
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(180); // Default estimate reduced

  const result = React.useMemo(
    () => normalizeAnalysisResult(analysisData),
    [analysisData],
  );
  const annotatedImageUri = toImageUri(result.annotatedImage);

  React.useEffect(() => {
    if (!sessionId || !analysisData || imageBackfillRef.current === sessionId) return;
    const originalImageUri =
      analysisData.source_image_uri ||
      analysisData.images?.[0]?.url ||
      images?.[0]?.uri ||
      null;
    if (!originalImageUri && !annotatedImageUri) return;

    imageBackfillRef.current = sessionId;
    dispatch(syncAnalysisToBackend({
      id: analysisData.message_id || sessionId,
      session_id: sessionId,
      image_url: originalImageUri,
      annotated_image_url: annotatedImageUri,
      findings: analysisData.reply || analysisData.content || result.summary || '',
      summary: result.summary || '',
      overall_assessment: analysisData.overall_assessment || '',
      risk_level: result.riskLevel,
      confidence_score: result.confidence === null ? null : Math.round(result.confidence * 100),
      detections: analysisData.detections || analysisData.visual_findings?.detections || [],
      recommendations: result.recommendations,
      timestamp: new Date().toISOString(),
    }));
  }, [
    analysisData,
    annotatedImageUri,
    dispatch,
    images,
    result.confidence,
    result.recommendations,
    result.riskLevel,
    result.summary,
    sessionId,
  ]);

  const handleBookAppointment = () => {
    if (authLevel === AUTH_LEVELS.GUEST) {
      setShowAuthGuard(true);
    } else {
      navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' });
    }
  };

  const gradient = RISK_GRADIENTS[result.riskLevel] || [theme.colors.primary, '#7F1DFF'];

  // Stats Data
  const stats = [
    {
      label: 'Keyakinan',
      value: result.confidence === null ? '—' : `${Math.round(result.confidence * 100)}%`,
      icon: 'bullseye-arrow',
    },
    { label: 'Temuan', value: result.findings.length, icon: 'alert-circle-outline' },
    { label: 'Saran', value: result.recommendations.length || 1, icon: 'clipboard-list-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- HEADER COMPACT --- */}
      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient 
          colors={gradient} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.hero, { paddingTop: insets.top + normalize(5) }]}
        >
          {/* Top Nav Row */}
          <View style={styles.heroTopRow}>
            <Button 
              mode="text" 
              textColor="#FFFFFF" 
              icon="arrow-left" 
              onPress={() => navigation.navigate('AIHome')} 
              labelStyle={{ fontSize: normalize(14), marginLeft: -normalize(8) }}
            >
              Kembali
            </Button>
            <View style={{ flexDirection: 'row' }}>
              <IconButtonGhost 
                icon="message-text-outline" 
                onPress={() => navigation.navigate('Chat', { sessionId, analysisData, images })} 
              />
            </View>
          </View>

          {/* Title Row (Compact) */}
          <View style={styles.heroCompactContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Hasil Analisis Serene AI</Text>
              <Text style={styles.heroTitle}>Temuan Perlu Ditinjau</Text>
              <Text style={styles.heroSubtitle}>Baca temuan dan maknanya di bawah</Text>
            </View>
            
            <View style={styles.heroBadgeContainer}>
              <RiskBadge level={result.riskLevel} style={{ transform: [{ scale: 1.1 }] }} />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* --- SCROLL CONTENT --- */}
      <ScrollView
        contentContainerStyle={{ 
          paddingTop: headerHeight + normalize(16), // Dynamic padding
          paddingBottom: normalize(100) + insets.bottom, 
          paddingHorizontal: normalize(16) 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Stats Row (Moved from Header to Body) */}
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name={stat.icon} size={normalize(20)} color="#64748B" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {index < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* 2. Annotated Image */}
        {annotatedImageUri && (
          <Card style={styles.card}>
            <Card.Content style={{ padding: normalize(12) }}>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: normalize(8)}}>
                <Text style={styles.cardTitle}>Area yang Ditandai AI</Text>
                <Chip icon="eye" style={{height: normalize(24)}} textStyle={{fontSize: normalize(10), marginVertical: -4}}>Gambar anotasi</Chip>
              </View>
              <Image
                source={{ uri: annotatedImageUri }}
                style={styles.annotatedImage}
                resizeMode="contain"
              />
              <Text style={styles.imageCaption}>
                Nomor penanda pada gambar sesuai dengan nomor temuan di bawah.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* 3. Analysis context */}
        {result.imageQuality && (
          <View style={styles.qualityBanner}>
            <MaterialCommunityIcons name="image-check-outline" size={normalize(20)} color="#0369A1" />
            <View style={{ flex: 1 }}>
              <Text style={styles.qualityLabel}>Kualitas gambar</Text>
              <Text style={styles.qualityValue}>{result.imageQuality}</Text>
            </View>
          </View>
        )}

        {/* 4. Summary */}
        {result.summary && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Ringkasan</Text>
              <Text style={styles.bodyText}>
                {result.summary}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* 5. Findings and reasoning */}
        {result.findings.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Temuan dan Penjelasan ({result.findings.length})</Text>
              {result.findings.map((finding, index) => (
                <View key={finding.id} style={styles.findingCard}>
                  <View style={styles.findingHeader}>
                    <View style={styles.findingNumberBadge}>
                      <Text style={styles.findingNumberText}>{finding.mark || `[${index + 1}]`}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.findingName}>{finding.name}</Text>
                      <Text style={styles.findingMeta}>
                        {finding.confidence === null
                          ? 'Keyakinan deteksi tidak tersedia'
                          : `Keyakinan deteksi ${Math.round(finding.confidence * 100)}%`}
                        {finding.location ? ` · ${finding.location}` : ''}
                      </Text>
                    </View>
                    <RiskBadge level={finding.severity} size="big" />
                  </View>

                  {finding.description ? (
                    <View style={styles.findingDetail}>
                      <Text style={styles.findingDetailLabel}>Yang terlihat</Text>
                      <Text selectable style={styles.bodyText}>{finding.description}</Text>
                    </View>
                  ) : null}

                  {finding.reasoning ? (
                    <View style={styles.reasoningBox}>
                      <View style={styles.reasoningTitleRow}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={normalize(17)} color="#6D28D9" />
                        <Text style={styles.reasoningTitle}>Makna temuan</Text>
                      </View>
                      <Text selectable style={styles.reasoningText}>{finding.reasoning}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* 6. Positive Observations */}
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

        {/* 7. Recommendations */}
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
            
            <View style={styles.recommendationChips}>
              <Chip icon="calendar-clock" style={styles.chipStyled} textStyle={{ fontSize: normalize(11) }}>Kontrol</Chip>
              <Chip icon="tooth" style={styles.chipStyled} textStyle={{ fontSize: normalize(11) }}>Periksa</Chip>
            </View>
          </Card.Content>
        </Card>

        {/* 8. Suggested follow-ups */}
        {result.suggestedQuestions.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Pertanyaan Lanjutan</Text>
              <Text style={styles.sectionIntro}>
                Ketuk pertanyaan untuk melanjutkan percakapan dengan Serene AI.
              </Text>
              {result.suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={`${question}-${index}`}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Tanyakan: ${question}`}
                  style={styles.questionRow}
                  onPress={() => navigation.navigate('Chat', {
                    sessionId,
                    analysisData,
                    images,
                    initialQuestion: question,
                  })}
                >
                  <MaterialCommunityIcons name="message-question-outline" size={normalize(18)} color="#4F46E5" />
                  <Text selectable style={styles.questionText}>{question}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={normalize(18)} color="#6366F1" />
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* 9. Limits and disclaimer */}
        {result.limitations && (
          <Card style={styles.limitationCard}>
            <Card.Content>
              <View style={styles.limitationTitleRow}>
                <MaterialCommunityIcons name="information-outline" size={normalize(19)} color="#92400E" />
                <Text style={styles.limitationTitle}>Keterbatasan Analisis</Text>
              </View>
              <Text selectable style={styles.limitationText}>{result.limitations}</Text>
              <Text style={styles.disclaimerText}>
                Hasil ini merupakan skrining AI, bukan diagnosis pasti. Konfirmasi pemeriksaan dengan dokter gigi.
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* --- BOTTOM FLOATING BAR --- */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, normalize(16)) }]}>
        <Button
          mode="outlined"
          icon="robot-outline"
          onPress={() => navigation.navigate('Chat', { sessionId, analysisData, images })}
          contentStyle={{ height: normalize(44) }}
          style={{ marginRight: normalize(8), borderColor: '#CBD5E1' }}
        >
          Tanya AI
        </Button>
        <Button
          mode="contained"
          icon="calendar-check"
          style={{ flex: 1 }}
          contentStyle={{ height: normalize(44) }}
          onPress={handleBookAppointment}
        >
          Buat Janji
        </Button>
      </View>

      <AuthGuard
        visible={showAuthGuard}
        onDismiss={() => setShowAuthGuard(false)}
        onOTPLogin={() => {
          setShowAuthGuard(false);
          navigation.navigate('SettingsTab', { screen: 'OTP' });
        }}
        onFullLogin={() => {
          setShowAuthGuard(false);
          navigation.navigate('SettingsTab', { screen: 'Login' });
        }}
      />
    </View>
  );
};

const IconButtonGhost = ({ icon, onPress }) => (
  <Button
    mode="text"
    compact
    icon={icon}
    onPress={onPress}
    textColor="rgba(255,255,255,0.95)"
    style={{ borderRadius: 999, minWidth: 0, paddingHorizontal: normalize(4) }}
    labelStyle={{fontSize: normalize(20)}}
  />
);

const styles = StyleSheet.create({
  anchorWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    // Shadow untuk memisahkan header saat discroll
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  hero: {
    paddingHorizontal: normalize(20),
    paddingBottom: normalize(24), // Reduced from 32
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
    fontSize: normalize(20), // Reduced from 24
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
  
  // New Stats Row Styles
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

  // Card & Content Styles
  card: {
    borderRadius: normalize(16),
    marginBottom: normalize(16),
    backgroundColor: 'white',
    elevation: 1, // Lighter shadow
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
    height: SCREEN_HEIGHT * 0.35, // Responsive height (35% of screen)
    borderRadius: normalize(8),
    backgroundColor: '#F1F5F9',
  },
  imageCaption: {
    color: '#64748B',
    fontSize: normalize(10),
    lineHeight: normalize(15),
    marginTop: normalize(8),
  },
  qualityBanner: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderRadius: normalize(14),
    borderWidth: 1,
    flexDirection: 'row',
    gap: normalize(10),
    marginBottom: normalize(16),
    padding: normalize(12),
  },
  qualityLabel: {
    color: '#0369A1',
    fontSize: normalize(10),
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  qualityValue: {
    color: '#0C4A6E',
    fontSize: normalize(13),
    fontWeight: '600',
    marginTop: normalize(2),
  },
  
  // Finding List Styles
  findingCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: normalize(14),
    borderWidth: 1,
    marginTop: normalize(10),
    padding: normalize(12),
  },
  findingHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: normalize(9),
  },
  findingNumberBadge: {
    minWidth: normalize(30),
    height: normalize(24),
    borderRadius: normalize(8),
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(2),
    paddingHorizontal: normalize(5),
  },
  findingNumberText: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: '#4F46E5',
  },
  findingName: {
    fontWeight: '700',
    color: '#0F172A', 
    fontSize: normalize(13),
  },
  findingMeta: {
    color: '#64748B', 
    fontSize: normalize(11), 
    marginTop: normalize(3),
  },
  findingDetail: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    marginTop: normalize(11),
    paddingTop: normalize(11),
  },
  findingDetailLabel: {
    color: '#334155',
    fontSize: normalize(10),
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: normalize(5),
    textTransform: 'uppercase',
  },
  reasoningBox: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderRadius: normalize(11),
    borderWidth: 1,
    marginTop: normalize(10),
    padding: normalize(10),
  },
  reasoningTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: normalize(6),
    marginBottom: normalize(5),
  },
  reasoningTitle: {
    color: '#5B21B6',
    fontSize: normalize(11),
    fontWeight: '700',
  },
  reasoningText: {
    color: '#4C1D95',
    fontSize: normalize(12),
    lineHeight: normalize(19),
  },

  recommendationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
    marginTop: normalize(16),
  },
  chipStyled: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionIntro: {
    color: '#64748B',
    fontSize: normalize(12),
    lineHeight: normalize(18),
    marginBottom: normalize(10),
  },
  questionRow: {
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: normalize(11),
    flexDirection: 'row',
    gap: normalize(9),
    marginTop: normalize(8),
    minHeight: normalize(44),
    padding: normalize(11),
  },
  questionText: {
    color: '#312E81',
    flex: 1,
    fontSize: normalize(12),
    lineHeight: normalize(18),
  },
  limitationCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: normalize(16),
    borderWidth: 1,
    marginBottom: normalize(16),
  },
  limitationTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: normalize(7),
    marginBottom: normalize(7),
  },
  limitationTitle: {
    color: '#78350F',
    fontSize: normalize(13),
    fontWeight: '700',
  },
  limitationText: {
    color: '#92400E',
    fontSize: normalize(12),
    lineHeight: normalize(18),
  },
  disclaimerText: {
    borderTopColor: '#FDE68A',
    borderTopWidth: 1,
    color: '#78350F',
    fontSize: normalize(11),
    fontWeight: '600',
    lineHeight: normalize(17),
    marginTop: normalize(10),
    paddingTop: normalize(10),
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: normalize(16),
    paddingTop: normalize(16),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});

export default ResultScreen;
