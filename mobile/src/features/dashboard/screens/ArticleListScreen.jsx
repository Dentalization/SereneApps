import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Linking, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import { formatArticleRelativeTime } from '../components/article';
import { SAMPLE_ARTICLES } from '../data/articles';

const ArticleListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // 2. Panggil hook ini agar variabel 'insets' tersedia
  const insets = useSafeAreaInsets(); 

  const articles = useMemo(
    () => (route.params?.articles?.length ? route.params.articles : SAMPLE_ARTICLES),
    [route.params?.articles]
  );

  const handleOpen = (item) => {
    if (item?.url) {
      Linking.openURL(item.url).catch(() => {});
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View
        style={{
          backgroundColor: theme.colors.primary,
          // 3. Sekarang baris ini akan berjalan normal
          paddingTop: insets.top + 2, 
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        {/* ... sisa kode sama persis ... */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons name="arrow-left" color="white" size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Artikel terbaru</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Wawasan kesehatan gigi pilihan untuk Anda</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}>
        {articles.map((item, index) => (
          <TouchableOpacity
            key={item.id || index}
            onPress={() => handleOpen(item)}
            activeOpacity={0.9}
            style={{
              marginBottom: 20,
              backgroundColor: 'white',
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#4C1D95',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={{ width: '100%', height: 190 }} resizeMode="cover" />
            ) : null}
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {item.category ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(98,16,159,0.08)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 14,
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>{item.category}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                  <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#9CA3AF" />
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 6 }}>
                    {formatArticleRelativeTime(item.publishedAt)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>{item.title}</Text>
              {item.description ? (
                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 12 }}>{item.description}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="newspaper-variant-outline" size={16} color="#6B7280" />
                  <Text style={{ marginLeft: 8, color: '#6B7280', fontWeight: '600' }}>{item.source || 'Berita Kesehatan'}</Text>
                </View>
                <MaterialCommunityIcons name="open-in-new" size={18} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default ArticleListScreen;
