import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  PixelRatio,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;
const normalize = (size) => {
  const newSize = size * scale;
  return Platform.OS === 'ios'
    ? Math.round(PixelRatio.roundToNearestPixel(newSize))
    : Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

const STORAGE_KEY = '@serene_quick_actions_selected';
const MAX_PINNED = 3;

export const ALL_QUICK_ACTIONS = [
  { key: 'dentists',    label: 'Cari Dokter',  icon: 'doctor',               tint: '#E0F2FE', iconColor: '#0284C7' },
  { key: 'book',        label: 'Booking',       icon: 'calendar-check',       tint: '#FFF7ED', iconColor: '#EA580C' },
  { key: 'ai',          label: 'AI Scan',       icon: 'scan-helper',          tint: '#ECFDF5', iconColor: '#059669' },
  { key: 'shop',        label: 'Toko',          icon: 'shopping-outline',     tint: '#FEFCE8', iconColor: '#CA8A04' },
  { key: 'history',     label: 'Riwayat',       icon: 'clipboard-text-clock', tint: '#F3F4F6', iconColor: '#6B7280' },
  { key: 'payment',     label: 'Pembayaran',    icon: 'credit-card-outline',  tint: '#FDF2F8', iconColor: '#C026D3' },
  { key: 'chat',        label: 'Konsultasi',    icon: 'chat-processing-outline', tint: '#FFFBEB', iconColor: '#D97706' },
  { key: 'nearby',      label: 'Klinik Dekat', icon: 'map-marker-outline',   tint: '#FFE4E6', iconColor: '#E11D48' },
  { key: 'promo',       label: 'Promo',         icon: 'tag-outline',          tint: '#F0FDF4', iconColor: '#16A34A' },
  { key: 'emergency',   label: 'Darurat',       icon: 'ambulance',            tint: '#FFF1F2', iconColor: '#DC2626' },
];

const DEFAULT_SELECTED_KEYS = ['dentists', 'book', 'ai'];

// ─── Hook publik: dipakai DashboardScreen untuk load pilihan ─────────────────
export const useSelectedQuickActions = () => {
  const [selected, setSelected] = useState(DEFAULT_SELECTED_KEYS);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelected(parsed);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return { selected, reload: load };
};

// ─── Modal Component ──────────────────────────────────────────────────────────
const QuickActionsManagerModal = ({ visible, onClose, selectedKeys, onSave }) => {
  const [localSelected, setLocalSelected] = useState([...selectedKeys]);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setLocalSelected([...selectedKeys]);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, selectedKeys]);

  const toggleAction = (key) => {
    setLocalSelected((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_PINNED) {
        // Hapus yang pertama, tambah yang baru di akhir
        return [...prev.slice(1), key];
      }
      return [...prev, key];
    });
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localSelected));
    } catch (_) {}
    onSave(localSelected);
    onClose();
  };

  const handleReset = () => {
    setLocalSelected([...DEFAULT_SELECTED_KEYS]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Bottom Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Atur Quick Actions</Text>
            <Text style={styles.sheetSubtitle}>
              Pilih hingga {MAX_PINNED} aksi yang tampil di dashboard
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <MaterialCommunityIcons name="refresh" size={18} color="#6B7280" />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Pinned Preview */}
        <View style={styles.pinnedRow}>
          {Array.from({ length: MAX_PINNED }).map((_, i) => {
            const key = localSelected[i];
            const action = ALL_QUICK_ACTIONS.find((a) => a.key === key);
            return (
              <View key={i} style={styles.pinnedSlot}>
                {action ? (
                  <>
                    <View style={[styles.pinnedIcon, { backgroundColor: action.tint }]}>
                      <MaterialCommunityIcons name={action.icon} size={20} color={action.iconColor} />
                    </View>
                    <Text style={styles.pinnedLabel} numberOfLines={1}>{action.label}</Text>
                  </>
                ) : (
                  <View style={styles.pinnedEmpty}>
                    <MaterialCommunityIcons name="plus" size={20} color="#CBD5E1" />
                  </View>
                )}
              </View>
            );
          })}
          {/* Always-pinned "Lainnya" */}
          <View style={styles.pinnedSlot}>
            <View style={[styles.pinnedIcon, { backgroundColor: '#F1F5F9' }]}>
              <MaterialCommunityIcons name="dots-grid" size={20} color="#64748B" />
            </View>
            <Text style={styles.pinnedLabel}>Lainnya</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Semua Actions Grid */}
        <Text style={styles.sectionLabel}>Semua Fitur</Text>
        <ScrollView
          style={styles.gridScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
        >
          <View style={styles.grid}>
            {ALL_QUICK_ACTIONS.map((action) => {
              const isPinned = localSelected.includes(action.key);
              const pinnedIndex = localSelected.indexOf(action.key);
              return (
                <TouchableOpacity
                  key={action.key}
                  style={[styles.actionCell, isPinned && styles.actionCellPinned]}
                  onPress={() => toggleAction(action.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.tint }]}>
                    <MaterialCommunityIcons name={action.icon} size={normalize(22)} color={action.iconColor} />
                  </View>
                  <Text style={styles.actionLabel} numberOfLines={2}>{action.label}</Text>

                  {/* Badge urutan */}
                  {isPinned && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pinnedIndex + 1}</Text>
                    </View>
                  )}

                  {/* Checkmark */}
                  {isPinned && (
                    <View style={styles.checkmark}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <MaterialCommunityIcons name="check" size={20} color="white" />
          <Text style={styles.saveBtnText}>Simpan ({localSelected.length}/{MAX_PINNED})</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: normalize(17),
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: normalize(12),
    color: '#94A3B8',
    marginTop: 3,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  resetText: {
    fontSize: normalize(12),
    color: '#6B7280',
    fontWeight: '600',
  },
  // --- Pinned Preview ---
  pinnedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinnedSlot: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 40) / 4,
  },
  pinnedIcon: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pinnedEmpty: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  pinnedLabel: {
    fontSize: normalize(10),
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: normalize(12),
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  gridScroll: {
    maxHeight: SCREEN_HEIGHT * 0.38,
  },
  gridContent: {
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCell: {
    width: (SCREEN_WIDTH - 40 - 20) / 3, // 3 kolom
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  actionCellPinned: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  actionIcon: {
    width: normalize(46),
    height: normalize(46),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: normalize(11),
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: normalize(15),
  },
  badge: {
    position: 'absolute',
    top: 8, left: 8,
    width: 18, height: 18,
    borderRadius: 9,
    backgroundColor: '#982598',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  checkmark: {
    position: 'absolute',
    top: 8, right: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#982598',
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 14,
    gap: 8,
  },
  saveBtnText: {
    color: 'white',
    fontSize: normalize(15),
    fontWeight: '700',
  },
});

export default QuickActionsManagerModal;
