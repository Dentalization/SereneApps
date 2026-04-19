import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { colors as COLORS, withOpacity } from '../../theme/colors';
import { typography as TYPOGRAPHY } from '../../theme/dimensions';

const { width } = Dimensions.get('window');

const DentalTimelineScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTimeline = async () => {
    try {
      const response = await api.get('/profile/health-history');
      if (response.data && response.data.success) {
        setTimeline(response.data.data);
      }
    } catch (error) {
      console.error('[DentalTimeline] Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimeline();
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.surfaceElevated} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Timeline Gigi</Text>
          <Text style={styles.headerSubtitle}>Perjalanan kesehatan mulut Anda</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const getEventIcon = (type) => {
    switch (type) {
      case 'appointment': return 'calendar-check';
      case 'ai_analysis': return 'robot-outline';
      case 'imaging': return 'radiology-box';
      default: return 'circle';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'appointment': return COLORS.primary;
      case 'ai_analysis': return COLORS.secondary || '#A855F7';
      case 'imaging': return COLORS.success;
      default: return COLORS.border;
    }
  };

  const getEventTitle = (item) => {
    switch (item.type) {
      case 'appointment': return `Janji dengan drg. ${item.dentist_name}`;
      case 'ai_analysis': return item.title || 'Analisis AI dilakukan';
      case 'imaging': return item.title || `Imaging (${item.modality})`;
      default: return 'Aktivitas Medis';
    }
  };

  const renderTimelineItem = (item, index) => {
    const isLast = index === timeline.length - 1;
    const eventColor = getEventColor(item.type);
    const dateObj = new Date(item.date);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
      <View key={`${item.type}-${item.id}`} style={styles.timelineItem}>
        <View style={styles.leftColumn}>
          <View style={[styles.iconCircle, { backgroundColor: eventColor }]}>
            <MaterialCommunityIcons name={getEventIcon(item.type)} size={20} color={COLORS.surfaceElevated} />
          </View>
          {!isLast && <View style={styles.connectorLine} />}
        </View>

        <TouchableOpacity 
          style={styles.contentCard}
          activeOpacity={0.7}
          onPress={() => {
            // Navigate to detail screens based on type
            if (item.type === 'ai_analysis') navigation.navigate('AIDiagnosisResult', { sessionId: item.sessionId });
            // Add other navigation endpoints as needed
          }}
          accessibilityLabel={`Aktivitas pada ${formattedDate}, ${getEventTitle(item)}`}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <Text style={styles.eventDate}>{formattedDate}</Text>
            {item.risk_level && (
              <View style={[styles.riskBadge, { backgroundColor: item.risk_level === 'high' ? withOpacity(COLORS.error, 0.2) : withOpacity(COLORS.success, 0.2) }]}>
                <Text style={[styles.riskText, { color: item.risk_level === 'high' ? COLORS.error : COLORS.success }]}>
                  {item.risk_level.toUpperCase()} RISK
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.eventTitle}>{getEventTitle(item)}</Text>
          
          {item.status && (
            <Text style={styles.eventSubtitle}>
              Status: <Text style={{ fontWeight: '600', color: COLORS.textSecondary }}>{item.status}</Text>
            </Text>
          )}

          {item.findings && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {item.findings}
            </Text>
          )}
          
          <View style={styles.cardFooter}>
            <Text style={styles.viewDetailLink}>Lihat Detail</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
        ) : timeline.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="history" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
            <Text style={styles.emptySubtitle}>Aktivitas kesehatan Anda akan tampil di sini secara kronologis.</Text>
          </View>
        ) : (
          timeline.map(renderTimelineItem)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(COLORS.surfaceElevated, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.surfaceElevated,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: withOpacity(COLORS.surfaceElevated, 0.8),
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 120,
  },
  leftColumn: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDate: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 9,
    fontWeight: '800',
  },
  eventTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  eventSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  eventDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  viewDetailLink: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default DentalTimelineScreen;
