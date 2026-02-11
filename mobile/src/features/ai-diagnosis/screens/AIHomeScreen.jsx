import React from 'react';
import { View, ScrollView, StatusBar, Dimensions, TouchableOpacity, Platform, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Article from '../../../features/dashboard/components/article.jsx';

// --- UTILS & CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Titik mulai sheet (dikurangi sedikit agar tombol tidak terlalu mepet)
const HEADER_HEIGHT_EXPANDED = SCREEN_HEIGHT * 0.28; 

// --- DATA ---
const FEATURES = [
  { icon: 'tooth-outline', color: '#6366F1', title: 'Cek Karies', desc: 'Deteksi lubang.' },
  { icon: 'water-outline', color: '#EC4899', title: 'Gusi Sehat', desc: 'Cek radang.' },
  { icon: 'file-document-outline', color: '#8B5CF6', title: 'Laporan', desc: 'Hasil medis.' },
];

const GUIDE_STEPS = [
  { id: 1, text: 'Cari tempat dengan cahaya terang & merata.' },
  { id: 2, text: 'Buka mulut lebar agar gigi terlihat jelas.' },
  { id: 3, text: 'Pegang HP stabil, hindari foto buram.' },
];

const ARTICLES = [
  { id: 1, title: '5 Makanan Penguat Gigi', icon: 'food-apple-outline', color: '#10B981' },
  { id: 2, title: 'Cara Flossing Benar', icon: 'dental-floss', color: '#3B82F6' },
  { id: 3, title: 'Gejala Gigi Sensitif', icon: 'alert-circle-outline', color: '#F59E0B' },
];

const AIHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleArticleOpen = (url, article) => {
    console.log('Article opened:', article?.title);
  };

  const handleSeeAllArticles = (articles) => {
    console.log('See all articles pressed');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- LAYER 1: GRADIENT BACKGROUND --- */}
      <LinearGradient
        colors={['#4338ca', '#7e22ce']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* --- LAYER 2: TOP BAR (Fixed) --- */}
      <View style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, 
        zIndex: 50, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        paddingHorizontal: 20, 
        paddingTop: insets.top + 8 
      }}>
        <View>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 16, 
            alignSelf: 'flex-start', 
            marginBottom: 6, 
            borderWidth: 1, 
            borderColor: 'rgba(255,255,255,0.1)' 
          }}>
            <MaterialCommunityIcons name="star-four-points" size={10} color="#FBBF24" />
            <Text style={{ 
              color: '#FBBF24', 
              fontSize: 10, 
              fontWeight: '700', 
              marginLeft: 4, 
              letterSpacing: 0.5 
            }}>AI-Powered</Text>
          </View>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '800', 
            color: 'white', 
            letterSpacing: 0.3 
          }}>Dental Scan</Text>
        </View>
        <TouchableOpacity 
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderWidth: 1, 
            borderColor: 'rgba(255,255,255,0.1)' 
          }}
          onPress={() => navigation.navigate('History')}
        >
          <MaterialCommunityIcons name="history" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* --- LAYER 3: HEADER CONTENT --- */}
      <View style={{ 
        paddingHorizontal: 20, 
        width: '100%', 
        zIndex: 10, 
        marginTop: insets.top + 60 
      }}>
        <Text style={{ 
          fontSize: 14, 
          color: 'rgba(255,255,255,0.9)', 
          lineHeight: 20, 
          marginBottom: 12, 
          maxWidth: '90%' 
        }}>
          Skrining gigi profesional dalam hitungan detik.
        </Text>

        {/* Stats Card */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          borderRadius: 18, 
          padding: 12, 
          marginBottom: 16, 
          borderWidth: 1, 
          borderColor: 'rgba(255,255,255,0.15)', 
          justifyContent: 'space-around', 
          alignItems: 'center' 
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>94%</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Akurasi</Text>
          </View>
          <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>24/7</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Instant</Text>
          </View>
          <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>12k+</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>User</Text>
          </View>
        </View>

        {/* Main CTA Button */}
        <TouchableOpacity 
          style={{ 
            width: '100%', 
            borderRadius: 18, 
            shadowColor: '#4F46E5', 
            shadowOffset: { width: 0, height: 6 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 10, 
            elevation: 8 
          }}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#ffffff', '#f3f4f6']}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingVertical: 14, 
              borderRadius: 18 
            }}
          >
            <MaterialCommunityIcons name="camera-iris" size={22} color="#4F46E5" />
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '700', 
              color: '#4F46E5', 
              marginLeft: 8 
            }}>Mulai Scan Baru</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* --- LAYER 4: BOTTOM SHEET (Scrollable) --- */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        // GAP FIX: Menambah margin top dari titik header agar ada jarak visual
        top: HEADER_HEIGHT_EXPANDED + 24, 
        backgroundColor: '#F8FAFC', 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        overflow: 'hidden', 
        zIndex: 20 
      }}>
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
        >
          {/* Handle Indicator */}
          <View style={{ 
            width: 40, 
            height: 4, 
            backgroundColor: '#E2E8F0', 
            borderRadius: 2, 
            alignSelf: 'center', 
            marginBottom: 24 
          }} />

          {/* 1. Section: Features Grid */}
          <Text style={{ 
            fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12, letterSpacing: 0.2 
          }}>Kapabilitas AI</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
            {FEATURES.map((item, index) => (
              <View 
                key={index} 
                style={{ 
                  width: (SCREEN_WIDTH - 40 - 20) / 3, 
                  backgroundColor: 'white', 
                  borderRadius: 16, 
                  padding: 12, 
                  alignItems: 'center', 
                  shadowColor: '#94A3B8', 
                  shadowOffset: { width: 0, height: 3 }, 
                  shadowOpacity: 0.08, 
                  shadowRadius: 8, 
                  elevation: 2 
                }}
              >
                <View style={{ 
                  width: 40, height: 40, borderRadius: 12, 
                  alignItems: 'center', justifyContent: 'center', marginBottom: 8, 
                  backgroundColor: item.color + '15' 
                }}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 2 }}>{item.title}</Text>
                <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center', lineHeight: 12 }}>{item.desc}</Text>
              </View>
            ))}
          </View>

          {/* 2. Section: Panduan Scan */}
          <Text style={{ 
            fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12, letterSpacing: 0.2 
          }}>Panduan Scan</Text>
          <View style={{ 
            backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 30,
            shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 
          }}>
            {GUIDE_STEPS.map((step, index) => (
              <View key={step.id} style={{ 
                flexDirection: 'row', alignItems: 'center', paddingVertical: 10, 
                borderBottomWidth: index !== GUIDE_STEPS.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' 
              }}>
                <View style={{ 
                  width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', 
                  alignItems: 'center', justifyContent: 'center', marginRight: 14 
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#4F46E5' }}>{step.id}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: '500', lineHeight: 18 }}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* 3. Section: Artikel Pilihan (NEW CONTENT) */}
          <Article articles={ARTICLES} onOpen={handleArticleOpen} onSeeAll={handleSeeAllArticles} />

          

          {/* 4. Section: Fakta Unik (NEW CONTENT) */}
          <View style={{ 
            backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, marginBottom: 24,
            borderWidth: 1, borderColor: '#FFEDD5'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#EA580C" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#C2410C', marginLeft: 6 }}>Tahukah Anda?</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#9A3412', lineHeight: 20 }}>
              Email gigi adalah zat terkeras dalam tubuh manusia, bahkan lebih keras daripada tulang Anda!
            </Text>
          </View>

          {/* 5. Section: Trust/Privacy */}
          <View style={{ 
            flexDirection: 'row', alignItems: 'flex-start', 
            backgroundColor: '#ECFDF5', padding: 14, borderRadius: 14, 
            borderWidth: 1, borderColor: '#A7F3D0' 
          }}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color="#059669" />
            <Text style={{ flex: 1, marginLeft: 10, fontSize: 12, color: '#065F46', lineHeight: 16 }}>
              Data Anda dienkripsi end-to-end dan hanya untuk keperluan medis.
            </Text>
          </View>

          {/* Bottom Padding Extra */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </View>
  );
};

export default AIHomeScreen;