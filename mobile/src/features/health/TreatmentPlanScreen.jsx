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

const TreatmentPlanScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/profile/treatment-plans');
      if (response.data && response.data.success) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('[TreatmentPlan] Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
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
          <Text style={styles.headerTitle}>Rencana Perawatan</Text>
          <Text style={styles.headerSubtitle}>Pantau progres kesehatan gigi Anda</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderPlanCard = (plan) => {
    const isCompleted = plan.status === 'completed';
    const progressColor = isCompleted ? COLORS.success : COLORS.primary;

    return (
      <View 
        key={plan.id} 
        style={styles.planCard}
        accessibilityLabel={`Rencana ${plan.title}, Oleh drg. ${plan.dentist_name}, Progres ${plan.progress}%`}
      >
        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planTitleText}>{plan.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isCompleted ? withOpacity(COLORS.success, 0.2) : withOpacity(COLORS.warning, 0.2) }]}>
              <Text style={[styles.statusText, { color: isCompleted ? COLORS.success : COLORS.warning }]}>
                {isCompleted ? 'Selesai' : 'Berjalan'}
              </Text>
            </View>
          </View>
          <Text style={styles.dentistText}>Oleh drg. {plan.dentist_name}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabelText}>Progres</Text>
            <Text style={styles.progressValueText}>{plan.progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${plan.progress}%`, backgroundColor: progressColor }
              ]} 
            />
          </View>
        </View>

        <View style={styles.costContainer}>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Estimasi</Text>
            <Text style={styles.costValue}>Rp {(plan.estimated_cost || 0).toLocaleString('id-ID')}</Text>
          </View>
          <View style={[styles.costItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.costLabel}>Terpakai</Text>
            <Text style={[styles.costValue, { color: COLORS.textPrimary }]}>
              Rp {(plan.actual_cost || 0).toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        {plan.items && plan.items.length > 0 && (
          <View style={styles.itemsList}>
            <Text style={styles.itemsTitle}>Tindakan</Text>
            {plan.items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemBulletContainer}>
                  <View style={[styles.itemBullet, { backgroundColor: item.status === 'completed' ? COLORS.success : COLORS.border }]} />
                  {index !== plan.items.length - 1 && <View style={styles.itemLine} />}
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, item.status === 'completed' && styles.itemCompletedText]}>
                    {item.name}
                  </Text>
                  {item.completed_date && (
                    <Text style={styles.itemDate}>
                      Selesai: {new Date(item.completed_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                </View>
                {item.status === 'completed' && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                )}
              </View>
            ))}
          </View>
        )}
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
        ) : plans.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Belum Ada Rencana</Text>
            <Text style={styles.emptySubtitle}>Dokter akan menyusun rencana perawatan setelah pemeriksaan.</Text>
          </View>
        ) : (
          plans.map(renderPlanCard)
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
  planCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  planHeader: {
    marginBottom: 16,
  },
  planTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitleText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  dentistText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabelText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressValueText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  costContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  costItem: {
    flex: 1,
  },
  costLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  costValue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  itemsTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemBulletContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 20,
  },
  itemBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  itemLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  itemCompletedText: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  itemDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
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

export default TreatmentPlanScreen;
