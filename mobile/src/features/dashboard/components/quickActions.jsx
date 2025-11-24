import React from 'react';
import { View, TouchableOpacity, Dimensions, Platform, PixelRatio } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- UTILS RESPONSIVE (Sama seperti komponen sebelumnya) ---
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
// -----------------------------------------------------------

const QuickActions = ({ actions = [] }) => {
  const theme = useTheme();

  if (!actions.length) return null;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
      <View
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: normalize(16), // Padding vertikal responsif
          borderWidth: 1,
          borderColor: 'rgba(148,163,184,0.25)',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: normalize(14),
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#64748B',
                fontSize: normalize(10), // Font diperkecil sedikit agar rapi
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Quick actions
            </Text>
            <Text
              style={{
                color: '#0F172A',
                fontSize: normalize(16),
                fontWeight: '800',
              }}
            >
              Akses Kilat
            </Text>
            <Text
              style={{
                color: '#94A3B8',
                marginTop: 2,
                fontSize: normalize(11),
                maxWidth: '90%', // Mencegah teks terlalu panjang di layar kecil
              }}
            >
              Mulai perawatanmu dalam sekali sentuh
            </Text>
          </View>
        </View>

        {/* Actions Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between', // Menyebar item secara merata
            marginTop: 8,
          }}
        >
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.key || index}
              onPress={action.onPress}
              activeOpacity={0.7}
              style={{
                // 30% lebih aman daripada 32% untuk layout 3 kolom di layar sempit
                width: '30%', 
                alignItems: 'center',
                marginBottom: normalize(16),
              }}
            >
              <View
                style={{
                  width: normalize(50), // Ukuran box responsif
                  height: normalize(50),
                  borderRadius: normalize(18),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: action.tint || 'rgba(15,23,42,0.03)',
                  borderWidth: 1,
                  borderColor: 'rgba(148,163,184,0.3)', // Border lebih subtle
                }}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={normalize(22)} // Icon ikut membesar/mengecil
                  color={action.iconColor || theme.colors.primary}
                />
              </View>
              <Text
                style={{
                  color: '#0F172A',
                  fontWeight: '600',
                  fontSize: normalize(11),
                  marginTop: 8,
                  textAlign: 'center',
                  lineHeight: normalize(16),
                }}
                numberOfLines={2} // Maksimal 2 baris agar layout tidak rusak
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Trik Layout:
             Jika jumlah item bukan kelipatan 3 (misal ada 4 atau 5 item),
             justifyContent: 'space-between' bisa membuat item terakhir melayang di tengah atau kanan.
             View kosong ini memastikan item terakhir tetap rata kiri jika baris tidak penuh.
          */}
          {actions.length % 3 !== 0 && <View style={{ width: '30%' }} />}
        </View>
      </View>
    </View>
  );
};

export default QuickActions;