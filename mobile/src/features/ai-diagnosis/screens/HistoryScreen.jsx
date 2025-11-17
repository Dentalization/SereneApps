import React from 'react';
import { View, ScrollView, StatusBar } from 'react-native';
import { Text, Button, Chip, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import EmptyState from '../../../components/shared/EmptyState';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const HistoryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const historyItems = route.params?.history ?? [];
  const completedThisMonth = historyItems.filter((item) => item.status === 'completed').length;
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(220);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header anchored */}
      <View onLayout={handleHeaderLayout} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <LinearGradient
          colors={[theme.colors.primary, '#7F1DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 64, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          {/* Header minimalis tanpa icon */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Riwayat Diagnosis</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                Pantau progres kesehatan gigi Anda
              </Text>
            </View>
          </View>

          {/* Stats compact */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 14,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 12,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{historyItems.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>Total pemindaian</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{completedThisMonth}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>Bulan ini</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>92%</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>Akurasi rata-rata</Text>
            </View>
          </View>

          {/* Tombol full-width di tengah */}
          <Button
            mode="contained"
            icon="camera"
            onPress={() => navigation.navigate('Camera')}
            style={{ marginTop: 16, borderRadius: 16, alignSelf: 'center', width: '100%' }}
            contentStyle={{ paddingVertical: 8 }}
            labelStyle={{ fontWeight: '700', fontSize: 13 }}
          >
            Mulai scan baru
          </Button>
        </LinearGradient>
      </View>

      {/* Konten scroll */}
      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 12, paddingBottom: 60, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {historyItems.length === 0 ? (
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
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#0F172A',
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 16 }}>{item.title}</Text>
                  <Text style={{ color: '#475569', marginTop: 4 }}>{item.date}</Text>
                </View>
                <Chip mode="flat" style={{ backgroundColor: '#DBEAFE' }} textStyle={{ color: '#1D4ED8' }}>
                  {item.status === 'completed' ? 'Selesai' : 'Draf'}
                </Chip>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <MaterialCommunityIcons name="flag-outline" size={18} color="#475569" />
                <Text style={{ marginLeft: 6, color: '#475569' }}>{item.findings}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Button
                  mode="text"
                  onPress={() => item.result && navigation.navigate('Result', { result: item.result })}
                  disabled={!item.result}
                >
                  Lihat detail
                </Button>
                <Button mode="outlined" compact icon="share-variant">
                  Bagikan
                </Button>
              </View>
            </View>
          ))
        )}

        <View style={{ marginTop: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
            Tips menjaga konsistensi
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <MaterialCommunityIcons name="calendar-check" size={22} color={theme.colors.primary} />
            <Text style={{ marginLeft: 12, color: '#475569', flex: 1 }}>
              Jadwalkan pengingat bulanan untuk melakukan scan ulang.
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
              shadowColor: '#0F172A',
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <MaterialCommunityIcons name="account-heart" size={22} color={theme.colors.primary} />
            <Text style={{ marginLeft: 12, color: '#475569', flex: 1 }}>
              Bagikan hasil AI ke dokter mitra untuk rekomendasi personal.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HistoryScreen;
