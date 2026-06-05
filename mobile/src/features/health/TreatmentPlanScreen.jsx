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
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  approveTreatmentPlan,
  getPatientTreatmentPlans,
  rejectTreatmentPlan,
} from '../../services/treatmentPlanService';
import { colors as COLORS, withOpacity } from '../../theme/colors';
import { typography as TYPOGRAPHY } from '../../theme/dimensions';

const { width } = Dimensions.get('window');

const TreatmentPlanScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingPlanId, setSubmittingPlanId] = useState(null);

  const fetchPlans = async () => {
    try {
      const data = await getPatientTreatmentPlans();
      setPlans(data);
    } catch (error) {
      console.error('[TreatmentPlan] Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [route.params?.refreshedAt]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  const normalizeStatus = (status) => String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  const isApproved = (plan) => normalizeStatus(plan.status) === 'APPROVED';
  const isSent = (plan) => ['SENT', 'PATIENT_REVIEW'].includes(normalizeStatus(plan.status));
  const isCompleted = (status) => ['DONE', 'COMPLETED'].includes(normalizeStatus(status));
  const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

  const getStatusLabel = (status) => {
    switch (normalizeStatus(status)) {
      case 'DRAFT': return 'Draft';
      case 'SENT':
      case 'PATIENT_REVIEW': return 'Perlu ditinjau';
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak';
      case 'IN_PROGRESS': return 'Berjalan';
      case 'COMPLETED': return 'Selesai';
      case 'CANCELLED': return 'Dibatalkan';
      default: return status || 'Rencana';
    }
  };

  const upsertPlan = (updatedPlan) => {
    setPlans((prev) => prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)));
  };

  const handleApprove = async (plan) => {
    try {
      setSubmittingPlanId(plan.id);
      const updated = await approveTreatmentPlan(plan.id);
      upsertPlan(updated);
    } catch (error) {
      Alert.alert('Gagal menyetujui', error.response?.data?.error?.message || 'Silakan coba lagi.');
    } finally {
      setSubmittingPlanId(null);
    }
  };

  const handleReject = async (plan) => {
    Alert.alert('Tolak rencana?', 'Dokter akan melihat status penolakan ini.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tolak',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmittingPlanId(plan.id);
            const updated = await rejectTreatmentPlan(plan.id);
            upsertPlan(updated);
          } catch (error) {
            Alert.alert('Gagal menolak', error.response?.data?.error?.message || 'Silakan coba lagi.');
          } finally {
            setSubmittingPlanId(null);
          }
        },
      },
    ]);
  };

  const handlePay = (plan) => {
    const invoice = plan.invoice || (Array.isArray(plan.invoices) ? plan.invoices[0] : null);
    if (!invoice) {
      Alert.alert('Invoice belum tersedia', 'Minta dokter mengirim ulang rencana perawatan.');
      return;
    }
    navigation.navigate('Payment', {
      appointmentId: plan.appointmentId || invoice.appointmentId,
      treatmentPlanId: plan.id,
      invoiceId: invoice.id || invoice.invoiceId,
      source: 'treatment_plan',
      planTitle: plan.title,
      fee: invoice.grandTotal || invoice.total || plan.estimatedTotal || plan.estimated_cost || 0,
      date: plan.createdAt || new Date().toISOString(),
      slot: { time: '—' },
      type: 'treatment_plan',
      paymentMethod: 'midtrans',
    });
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
    const completed = normalizeStatus(plan.status) === 'COMPLETED';
    const progressColor = completed ? COLORS.success : COLORS.primary;
    const dentistName = plan.dentist?.name || plan.dentist_name || 'Dokter gigi';
    const estimatedTotal = plan.estimatedTotal ?? plan.estimated_cost ?? plan.estimatedCost ?? 0;
    const actualCost = plan.actualCost ?? plan.actual_cost ?? 0;
    const invoice = plan.invoice || (Array.isArray(plan.invoices) ? plan.invoices[0] : null);
    const items = Array.isArray(plan.items) ? plan.items : (plan.treatments || []);
    const canReview = isSent(plan);
    const canPay = isApproved(plan) && invoice && (invoice.grandTotal > 0 || invoice.total > 0) && !['paid', 'settled'].includes(invoice.paymentStatus || invoice.status);

    return (
      <View 
        key={plan.id} 
        style={styles.planCard}
        accessibilityLabel={`Rencana ${plan.title}, Oleh drg. ${dentistName}, Progres ${plan.progress}%`}
      >
        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planTitleText}>{plan.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: completed || isApproved(plan) ? withOpacity(COLORS.success, 0.2) : withOpacity(COLORS.warning, 0.2) }]}>
              <Text style={[styles.statusText, { color: completed || isApproved(plan) ? COLORS.success : COLORS.warning }]}>
                {getStatusLabel(plan.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.dentistText}>Oleh drg. {dentistName}</Text>
          {!!plan.patientFriendlySummary && (
            <Text style={styles.summaryText}>{plan.patientFriendlySummary}</Text>
          )}
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
            <Text style={styles.costValue}>{formatCurrency(estimatedTotal)}</Text>
          </View>
          <View style={[styles.costItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.costLabel}>Terpakai</Text>
            <Text style={[styles.costValue, { color: COLORS.textPrimary }]}>
              {formatCurrency(actualCost)}
            </Text>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.itemsList}>
            <Text style={styles.itemsTitle}>Tindakan</Text>
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemBulletContainer}>
                  <View style={[styles.itemBullet, { backgroundColor: isCompleted(item.status) ? COLORS.success : COLORS.border }]} />
                  {index !== items.length - 1 && <View style={styles.itemLine} />}
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, isCompleted(item.status) && styles.itemCompletedText]}>
                    {item.procedureName || item.name}
                  </Text>
                  {!!item.toothNumber && (
                    <Text style={styles.itemDate}>Gigi {item.toothNumber}</Text>
                  )}
                  {item.completedDate || item.completed_date ? (
                    <Text style={styles.itemDate}>
                      Selesai: {new Date(item.completedDate || item.completed_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </Text>
                  ) : null}
                </View>
                {isCompleted(item.status) && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                )}
              </View>
            ))}
          </View>
        )}

        {canReview && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryAction, submittingPlanId === plan.id && styles.disabledAction]}
              disabled={submittingPlanId === plan.id}
              onPress={() => handleReject(plan)}
            >
              <Text style={styles.secondaryActionText}>Tolak</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryAction, submittingPlanId === plan.id && styles.disabledAction]}
              disabled={submittingPlanId === plan.id}
              onPress={() => handleApprove(plan)}
            >
              <Text style={styles.primaryActionText}>{submittingPlanId === plan.id ? 'Memproses...' : 'Setujui'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {canPay && (
          <TouchableOpacity style={styles.payButton} onPress={() => handlePay(plan)}>
            <MaterialCommunityIcons name="credit-card-check" size={18} color={COLORS.surfaceElevated} />
            <Text style={styles.payButtonText}>Bayar {formatCurrency(invoice.grandTotal || invoice.total)}</Text>
          </TouchableOpacity>
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
  summaryText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    marginTop: 10,
    lineHeight: 20,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.surfaceElevated,
    fontWeight: '800',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    fontWeight: '800',
  },
  payButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  payButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.surfaceElevated,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.55,
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
