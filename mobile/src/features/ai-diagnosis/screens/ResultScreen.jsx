import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet, Dimensions, Platform, PixelRatio, Image } from 'react-native';
import { Text, Card, Button, useTheme, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RiskBadge from '../../../components/shared/RiskBadge';
import AuthGuard from '../../../components/shared/AuthGuard';
import { AUTH_LEVELS } from '../../../store/slices/authSlice';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

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
  const { authLevel } = useSelector((state) => state.auth);
  const [showAuthGuard, setShowAuthGuard] = React.useState(false);
  
  // Header height logic
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(180); // Default estimate reduced

  // --- PARSING LOGIC (Sama seperti sebelumnya) ---
  const parseAnalysisData = () => {
    if (__DEV__) {
      console.log('📊 ResultScreen - Raw analysisData received:', JSON.stringify(analysisData, null, 2));
      
      // Check all possible data paths
      console.log('🔍 Checking data paths:');
      console.log('  - analysisData.findings:', analysisData?.findings);
      console.log('  - analysisData.detections:', analysisData?.detections);
      console.log('  - analysisData.content:', analysisData?.content);
      console.log('  - analysisData.data?.findings:', analysisData?.data?.findings);
      console.log('  - analysisData.visual_findings:', analysisData?.visual_findings);
      console.log('  - analysisData.recommendations:', analysisData?.recommendations);
      console.log('  - analysisData.data?.recommendations:', analysisData?.data?.recommendations);
      console.log('  - analysisData.observations:', analysisData?.observations);
      console.log('  - analysisData.data?.observations:', analysisData?.data?.observations);
    }
    
    if (!analysisData) {
      return {
        riskLevel: 'low',
        confidence: 0.5,
        findings: [],
        recommendations: [],
        observations: [],
        annotatedImage: null,
      };
    }
    
    const stripMarkdown = (text = '') => text.replace(/\*\*/g, '').trim();
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

    const contentText = typeof analysisData.content === 'string' ? analysisData.content : '';
    const contentSections = parseContentSections(contentText);

    const annotatedImage = 
      analysisData.annotated_image_base64 || 
      analysisData.annotatedImage ||
      (analysisData.visual_findings && analysisData.visual_findings.annotated_image_base64) ||
      (analysisData.data && analysisData.data.annotated_image_base64) ||
      null;

    // Extract findings - can come from 'findings', 'detections', or 'content' array
    let findings = [];
    
    // Try findings array first (structured findings with description)
    if (analysisData.findings && Array.isArray(analysisData.findings) && analysisData.findings.length > 0) {
      findings = analysisData.findings;
    } 
    // Visual findings (structured) from DeepDental visual response
    else if (analysisData.visual_findings?.findings?.length) {
      findings = analysisData.visual_findings.findings;
    }
    // Fallback to detections array (raw detections from model)
    else if (
      (analysisData.detections && Array.isArray(analysisData.detections) && analysisData.detections.length > 0) ||
      (analysisData.visual_findings?.detections?.length)
    ) {
      const detectionsSource = analysisData.detections?.length
        ? analysisData.detections
        : analysisData.visual_findings?.detections || [];
      findings = detectionsSource.map((det, idx) => {
        const confValue = normalizeConfidence(det.confidence);
        return {
          mark_id: det.mark_id || `[${idx + 1}]`,
          description: det.description || `Detected ${det.label || 'issue'}`,
          confidence: confValue,
          severity: det.severity || (confValue > 0.7 ? 'medium' : 'low'),
          location: det.location || null,
          name: det.label || det.description || 'Unknown',
        };
      });
    }
    // Check content array (from chat response structure)
    else if (analysisData.content && Array.isArray(analysisData.content)) {
      const contentWithFindings = analysisData.content.find(c => c.findings && Array.isArray(c.findings));
      if (contentWithFindings && contentWithFindings.findings.length > 0) {
        findings = contentWithFindings.findings;
      }
    }
    // Fallback to nested paths
    else if (analysisData.data && analysisData.data.findings) {
      findings = analysisData.data.findings;
    }
    
    // Extract observations/positive findings from various possible paths
    let observations = 
      analysisData.observations || 
      analysisData.visual_findings?.observations ||
      analysisData.data?.observations ||
      analysisData.data?.visual_findings?.observations ||
      [];
    
    // Check content array for observations
    if ((!observations || observations.length === 0) && analysisData.content && Array.isArray(analysisData.content)) {
      const contentWithObs = analysisData.content.find(c => c.observations && Array.isArray(c.observations));
      if (contentWithObs && contentWithObs.observations.length > 0) {
        observations = contentWithObs.observations;
      }
    }
    
    // Extract recommendations from multiple paths (filter out empty arrays)
    let recommendations = 
      analysisData.recommendations ||
      analysisData.visual_findings?.recommendations ||
      analysisData.data?.recommendations ||
      [];
    
    // Check content array for recommendations
    if ((!recommendations || recommendations.length === 0) && analysisData.content && Array.isArray(analysisData.content)) {
      const contentWithRec = analysisData.content.find(c => c.recommendations && Array.isArray(c.recommendations));
      if (contentWithRec && contentWithRec.recommendations.length > 0) {
        recommendations = contentWithRec.recommendations;
      }
    }
    
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

    if ((!recommendations || recommendations.length === 0) && Object.keys(contentSections).length) {
      const recSection =
        contentSections['rekomendasi'] ||
        contentSections['rekomendasi perawatan di rumah'] ||
        contentSections['rekomendasi tambahan'];
      if (recSection && recSection.length) {
        recommendations = recSection.map(line => stripMarkdown(line.replace(/^\*\s*/, '')));
      }
    }
    
    if (!recommendations || (Array.isArray(recommendations) && recommendations.length === 0)) {
      recommendations = [];
    }
    
    // Extract summary from multiple paths
    let summary = 
      analysisData.summary || 
      analysisData.overall_assessment ||
      analysisData.visual_findings?.summary ||
      analysisData.data?.summary ||
      analysisData.data?.overall_assessment ||
      null;
    if (!summary && contentSections['apa artinya ini?']) {
      summary = stripMarkdown(contentSections['apa artinya ini?'].join(' '));
    }
    if (!summary && contentText) {
      summary = stripMarkdown(contentText);
    }
    
    if (__DEV__) {
      const findingsSource = analysisData.findings
        ? 'findings'
        : analysisData.visual_findings?.findings
          ? 'visual_findings.findings'
          : analysisData.detections?.length
            ? 'detections'
            : analysisData.visual_findings?.detections
              ? 'visual_findings.detections'
              : 'none';
      console.log('📋 ResultScreen - Parsed data:', {
        findingsSource,
        findings: findings.length,
        observations: observations.length,
        recommendations: recommendations.length,
        hasAnnotatedImage: !!annotatedImage,
        hasSummary: !!summary
      });
      
      if (findings.length > 0) {
        console.log('🔍 Sample finding:', findings[0]);
      }
    }
    
    let riskLevel = analysisData.concern_level || analysisData.visual_findings?.concern_level || 'low';
    if (findings.some(f => f.severity === 'high' || f.severity === 'critical')) {
      riskLevel = 'high';
    } else if (findings.some(f => f.severity === 'medium')) {
      riskLevel = 'medium';
    }

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

    const avgConfidence = findings.length > 0
      ? findings.reduce((sum, f) => sum + normalizeConfidence(f.confidence), 0) / findings.length
      : 0.5;

    return {
      riskLevel,
      confidence: avgConfidence,
      findings: findings.map((f, idx) => ({
        id: f.id || idx + 1,
        name: f.name || f.condition || f.label || f.description || 'Kondisi tidak diketahui',
        severity: f.severity || 'low',
        confidence: normalizeConfidence(f.confidence),
        location: f.location || f.area || '-',
        mark: f.mark_id || f.mark || `[${idx + 1}]`,
        description: f.description,
      })),
      recommendations: recommendations,
      observations: observations,
      annotatedImage: annotatedImage,
      summary: summary,
    };
  };

  const result = parseAnalysisData();

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
    { label: 'Akurasi', value: `${Math.round(result.confidence * 100)}%`, icon: 'bullseye-arrow' },
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
              <Text style={styles.heroLabel}>Hasil Diagnosis AI</Text>
              <Text style={styles.heroTitle}>Risiko Terdeteksi</Text>
              <Text style={styles.heroSubtitle}>Cek detail di bawah</Text>
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
        {result.annotatedImage && (
          <Card style={styles.card}>
            <Card.Content style={{ padding: normalize(12) }}>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: normalize(8)}}>
                <Text style={styles.cardTitle}>Visualisasi Area</Text>
                <Chip icon="eye" style={{height: normalize(24)}} textStyle={{fontSize: normalize(10), marginVertical: -4}}>AI View</Chip>
              </View>
              <Image
                source={{ uri: `data:image/jpeg;base64,${result.annotatedImage}` }}
                style={styles.annotatedImage}
                resizeMode="contain"
              />
            </Card.Content>
          </Card>
        )}

        {/* 3. Summary */}
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

        {/* 4. Findings List */}
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
                          <RiskBadge level={finding.severity} size="big" />
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

        {/* 5. Positive Observations */}
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

        {/* 6. Recommendations */}
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
  
  // Finding List Styles
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
