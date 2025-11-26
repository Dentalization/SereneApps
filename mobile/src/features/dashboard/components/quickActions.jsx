import React, { useState, useMemo } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  PixelRatio, 
  LayoutAnimation, 
  UIManager,
  StyleSheet
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

// Aktifkan LayoutAnimation untuk Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
// -------------------------

const QuickActions = ({ actions = [] }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Tentukan batas maksimal item sebelum muncul tombol "Lainnya"
  const MAX_VISIBLE_ITEMS = 5; 

  // Hitung item yang akan ditampilkan
  const itemsToRender = useMemo(() => {
    if (actions.length <= 6) {
      return actions;
    }

    if (expanded) {
      return [
        ...actions,
        {
          key: 'collapse_control',
          label: 'Tutup',
          icon: 'chevron-up',
          isControl: true,
          tint: 'rgba(15,23,42,0.05)',
          iconColor: '#0F172A'
        }
      ];
    } else {
      const firstFive = actions.slice(0, MAX_VISIBLE_ITEMS);
      return [
        ...firstFive,
        {
          key: 'expand_control',
          label: 'Lainnya',
          icon: 'dots-horizontal',
          isControl: true,
          tint: 'rgba(15,23,42,0.05)',
          iconColor: '#0F172A'
        }
      ];
    }
  }, [actions, expanded]);

  const handlePress = (action) => {
    if (action.isControl) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded((prev) => !prev);
    } else if (action.onPress) {
      action.onPress();
    }
  };

  if (!actions.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitleLabel}>
              Quick actions
            </Text>
            <Text style={styles.titleText}>
              Akses Kilat
            </Text>
            <Text style={styles.descriptionText}>
              Mulai perawatanmu dalam sekali sentuh
            </Text>
          </View>
        </View>

        {/* Actions Grid */}
        <View style={styles.gridContainer}>
          {itemsToRender.map((action, index) => (
            <TouchableOpacity
              key={action.key || index}
              onPress={() => handlePress(action)}
              activeOpacity={0.7}
              style={styles.itemContainer}
            >
              <View
                style={[
                  styles.iconBox,
                  { 
                    backgroundColor: action.tint || 'rgba(15,23,42,0.03)',
                    borderColor: action.isControl ? 'transparent' : 'rgba(148,163,184,0.4)'
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={normalize(22)}
                  color={action.iconColor || theme.colors.primary}
                />
              </View>
              <Text
                style={styles.itemLabel}
                numberOfLines={2}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Spacer untuk layout grid */}
          {itemsToRender.length % 3 !== 0 && <View style={styles.spacer} />}
          {itemsToRender.length % 3 === 1 && <View style={styles.spacer} />} 
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20, 
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F8FAFC', // Kembali ke warna background original
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: normalize(16),
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)', // Border original
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(14),
  },
  subtitleLabel: {
    color: '#64748B',
    fontSize: normalize(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  titleText: {
    color: '#0F172A',
    fontSize: normalize(16),
    fontWeight: '700',
  },
  descriptionText: {
    color: '#94A3B8',
    marginTop: 2,
    fontSize: normalize(11),
    maxWidth: '90%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemContainer: {
    width: '30%', 
    alignItems: 'center',
    marginBottom: normalize(16),
  },
  iconBox: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, // Border pada icon kembali
    borderColor: 'rgba(148,163,184,0.4)',
  },
  itemLabel: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: normalize(11),
    marginTop: 8,
    textAlign: 'center',
    lineHeight: normalize(16),
  },
  spacer: {
    width: '30%',
  }
});

export default QuickActions;