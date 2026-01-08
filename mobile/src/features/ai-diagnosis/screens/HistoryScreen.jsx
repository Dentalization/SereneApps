import React from 'react';
import { 
  View, 
  ScrollView, 
  StatusBar, 
  Dimensions, 
  Platform, 
  PixelRatio,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Button, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '../../../components/shared/EmptyState';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { listSessions, getSession, deleteSession, getSessionMessages } from '../../../services/aiDiagnosisService';
import { saveAIAnalysis } from '../../../services/aiAnalysisSyncService';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base width iPhone 11/Pro

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
// -------------------------

const HistoryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  const [historyItems, setHistoryItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(220);

  // Fetch sessions on mount and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchSessions();
    }, [])
  );

  const fetchSessions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await listSessions();
      
      if (response.success && response.data?.sessions) {
        // Parse sessions into history items
        const items = response.data.sessions.map(session => {
          const sessionIdentifier = session.session_id || session.id;
          const createdDate = new Date(session.created_at);
          const formattedDate = createdDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          // Count findings from session messages
          const messageCount = session.message_count || 0;
          const findingsText = messageCount > 0 
            ? `${messageCount} pesan dalam sesi`
            : 'Belum ada analisis';

          return {
            id: sessionIdentifier,
            title: `Scan ${formattedDate}`,
            date: formattedDate,
            status: messageCount > 0 ? 'completed' : 'draft',
            findings: findingsText,
            sessionId: sessionIdentifier,
            createdAt: session.created_at,
          };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setHistoryItems(items);

        // Auto-sync latest analysis to backend for dentist portal visibility
        try {
          const latest = items[0];
          if (latest) {
            const msgRes = await getSessionMessages(latest.sessionId);
            if (msgRes.success && msgRes.messages && msgRes.messages.length) {
              // Find the latest AI reply with visual findings
              const lastMsg = [...msgRes.messages].reverse().find(m => m.role !== 'user');
              const vf = lastMsg?.visual_findings || lastMsg?.metadata?.visual_findings || {};

              const detections = vf.detections || [];
              const recommendations = vf.recommendations || [];
              const annotatedBase64 = vf.annotated_image_base64 || null;

              const analysisPayload = {
                id: lastMsg?.id || latest.sessionId,
                session_id: latest.sessionId,
                findings: lastMsg?.content || lastMsg?.reply || '',
                summary: vf.summary || vf.overall_summary || '',
                overall_assessment: vf.overall_assessment || '',
                risk_level: vf.risk_level || 'unknown',
                confidence_score: typeof vf.confidence === 'number' ? Math.round(vf.confidence * 100) : vf.confidence_score || null,
                detections,
                recommendations,
                // Best-effort image mapping
                image_url: lastMsg?.images?.[0]?.url || null,
                annotated_image_url: annotatedBase64 ? `data:image/jpeg;base64,${annotatedBase64}` : null,
                timestamp: latest.createdAt,
              };

              await saveAIAnalysis(analysisPayload);
            }
          }
        } catch (syncErr) {
          // Non-blocking: log only
          console.warn('AI analysis sync skipped:', syncErr?.message);
        }
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert(
        'Gagal Memuat Riwayat',
        'Tidak dapat memuat riwayat diagnosis. Periksa koneksi internet Anda.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchSessions(true);
  };

  const handleViewDetails = async (item) => {
    // Navigate to detail history screen
    navigation.navigate('DetailHistory', {
      sessionId: item.sessionId,
    });
  };

  const handleDeleteSession = async (sessionId) => {
    Alert.alert(
      'Hapus Riwayat',
      'Apakah Anda yakin ingin menghapus riwayat ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteSession(sessionId);
              if (response.success) {
                // Refresh list
                fetchSessions();
              } else {
                Alert.alert('Gagal', 'Tidak dapat menghapus riwayat.');
              }
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Terjadi Kesalahan', 'Gagal menghapus riwayat.');
            }
          },
        },
      ]
    );
  };
  
  const completedThisMonth = historyItems.filter((item) => item.status === 'completed').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header anchored */}
      <View onLayout={handleHeaderLayout} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <LinearGradient
          colors={[theme.colors.primary, '#7F1DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ 
            paddingTop: insets.top + normalize(2), 
            paddingHorizontal: normalize(20), 
            paddingBottom: normalize(20), 
            borderBottomLeftRadius: normalize(24), 
            borderBottomRightRadius: normalize(24) 
          }}
        >
          {/* Header minimalis tanpa icon */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: normalize(12) }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: normalize(12) }}>Riwayat Diagnosis</Text>
              <Text style={{ color: '#FFFFFF', fontSize: normalize(18), fontWeight: '700', marginTop: normalize(4) }}>
                Pantau progres kesehatan gigi Anda
              </Text>
            </View>
          </View>

          {/* Stats compact */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: normalize(14),
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: normalize(16),
              paddingVertical: normalize(10),
              paddingHorizontal: normalize(12),
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: '#FFFFFF', fontSize: normalize(16), fontWeight: '700' }}>{historyItems.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: normalize(11), marginTop: normalize(2) }}>Total scan</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: '#FFFFFF', fontSize: normalize(16), fontWeight: '700' }}>{completedThisMonth}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: normalize(11), marginTop: normalize(2) }}>Bulan ini</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: '#FFFFFF', fontSize: normalize(16), fontWeight: '700' }}>92%</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: normalize(11), marginTop: normalize(2) }}>Akurasi rata-rata</Text>
            </View>
          </View>

          {/* Tombol full-width di tengah */}
          <Button
            mode="contained"
            icon="camera"
            onPress={() => navigation.navigate('Camera')}
            style={{ marginTop: normalize(16), borderRadius: normalize(16), alignSelf: 'center', width: '100%' }}
            contentStyle={{ paddingVertical: normalize(6) }}
            labelStyle={{ fontWeight: '700', fontSize: normalize(13) }}
          >
            Mulai scan baru
          </Button>
        </LinearGradient>
      </View>

      {/* Konten scroll */}
      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + normalize(12), paddingBottom: normalize(60), paddingHorizontal: normalize(20) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: normalize(12), color: '#64748B', fontSize: normalize(14) }}>
              Memuat riwayat...
            </Text>
          </View>
        ) : historyItems.length === 0 ? (
          <EmptyState
            icon="history"
            title="Belum ada riwayat"
            description="Hasil scan AI Anda akan tersimpan otomatis dan bisa diunduh kapan saja."
            action={
              <Button mode="contained" onPress={() => navigation.navigate('AIHome')} icon="camera">
                Mulai Scan
              </Button>
            }
          />
        ) : (
          historyItems.map((item, index) => (
            <View
              key={item.id || index}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: normalize(20),
                padding: normalize(16),
                marginBottom: normalize(16),
                shadowColor: '#0F172A',
                shadowOpacity: 0.05,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: normalize(16) }}>{item.title}</Text>
                  <Text style={{ color: '#475569', marginTop: normalize(4), fontSize: normalize(12) }}>{item.date}</Text>
                </View>
                <Chip mode="flat" style={{ backgroundColor: '#DBEAFE', height: normalize(28) }} textStyle={{ color: '#1D4ED8', fontSize: normalize(11) }}>
                  {item.status === 'completed' ? 'Selesai' : 'Draft'}
                </Chip>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: normalize(10) }}>
                <MaterialCommunityIcons name="flag-outline" size={normalize(18)} color="#475569" />
                <Text style={{ marginLeft: normalize(6), color: '#475569', fontSize: normalize(13) }}>{item.findings}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: normalize(10) }}>
                <Button
                  mode="text"
                  onPress={() => handleViewDetails(item)}
                  labelStyle={{ fontSize: normalize(13) }}
                >
                  Lihat detail
                </Button>
                <Button 
                  mode="outlined" 
                  compact 
                  icon="delete-outline" 
                  labelStyle={{ fontSize: normalize(13) }}
                  onPress={() => handleDeleteSession(item.sessionId)}
                >
                  Hapus
                </Button>
              </View>
            </View>
          ))
        )}

        <View style={{ marginTop: normalize(32) }}>
          <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
            Tips menjaga konsistensi
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: normalize(16),
              padding: normalize(14),
              marginBottom: normalize(12),
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <MaterialCommunityIcons name="calendar-check" size={normalize(22)} color={theme.colors.primary} />
            <Text style={{ marginLeft: normalize(12), color: '#475569', flex: 1, fontSize: normalize(13) }}>
              Jadwalkan pengingat bulanan untuk melakukan scan ulang.
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: normalize(16),
              padding: normalize(14),
              marginBottom: normalize(12),
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <MaterialCommunityIcons name="account-heart" size={normalize(22)} color={theme.colors.primary} />
            <Text style={{ marginLeft: normalize(12), color: '#475569', flex: 1, fontSize: normalize(13) }}>
              Bagikan hasil AI ke dokter mitra untuk rekomendasi personal.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HistoryScreen;
