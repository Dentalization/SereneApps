import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Linking, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SAMPLE_ARTICLES } from '../data/articles';

const { width } = Dimensions.get('window');
const SIDE = 20;
const GAP = 16;
const CARD_W = width - SIDE * 2; // konsisten center seperti FeaturedDoctors
const SNAP_INTERVAL = CARD_W + GAP;

export const formatArticleRelativeTime = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSeconds = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} minggu lalu`;
  const diffMonths = Math.floor(diffWeeks / 4);
  if (diffMonths < 12) return `${diffMonths} bulan lalu`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} tahun lalu`;
};

export default function Article({ title='Artikel kesehatan gigi', subtitle='Kumpulan sumber tepercaya untuk Anda', articles=[], onOpen, onSeeAll }) {
  const theme = useTheme();
  const data = useMemo(() => (articles.length ? articles : SAMPLE_ARTICLES), [articles]);
  const [activeIndex, setActiveIndex] = useState(0);
  const open = (url, item)=>{ if(url){ try{ Linking.openURL(url); } catch(e){} } onOpen?.(url, item); };
  const handleMomentumEnd = (e)=>{ const offset = e.nativeEvent.contentOffset.x; const idx = Math.round(offset / SNAP_INTERVAL); setActiveIndex(Math.max(0, Math.min(idx, data.length-1))); };

  return (
    <View style={{ paddingHorizontal:SIDE, marginBottom:24 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <View><Text style={{ fontSize:22, fontWeight:'bold', color:'#1F2937', marginBottom:4 }}>{title}</Text><Text style={{ fontSize:14, color:'#6B7280', fontWeight:'500' }}>{subtitle}</Text></View>
        <TouchableOpacity
          onPress={() => onSeeAll?.(data)}
          style={{ backgroundColor:'#F3F4F6', borderRadius:12, padding:8 }}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight:SIDE }}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {data.map((a, idx)=>(
          <TouchableOpacity key={a.id || idx} activeOpacity={0.9} onPress={()=>open(a.url, a)} style={{ width:CARD_W, marginRight:GAP }}>
            <View style={{ borderRadius:20, overflow:'hidden', backgroundColor:'#EEE' }}>
              <Image source={{ uri:a.image }} style={{ width:'100%', height:180 }} resizeMode="cover" />
              <LinearGradient colors={['rgba(0,0,0,0)','rgba(0,0,0,0.65)']} start={{x:0,y:0}} end={{x:0,y:1}} style={{ position:'absolute', left:0, right:0, bottom:0, height:120 }} />
              {a.category ? <View style={{ position:'absolute', top:12, left:12, backgroundColor:'rgba(255,255,255,0.9)', paddingHorizontal:10, paddingVertical:6, borderRadius:14 }}><Text style={{ fontSize:12, fontWeight:'600', color:theme.colors.primary }}>{a.category}</Text></View> : null}
              <View style={{ position:'absolute', top:12, right:12, backgroundColor:'rgba(255,255,255,0.9)', width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' }}><MaterialCommunityIcons name="open-in-new" size={18} color={theme.colors.primary} /></View>
              <View style={{ position:'absolute', left:16, right:16, bottom:14 }}>
                <Text numberOfLines={2} style={{ fontSize:16, fontWeight:'700', color:'#FFF', marginBottom:6 }}>{a.title}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', opacity:0.9 }}>
                  <MaterialCommunityIcons name="newspaper-variant-outline" size={14} color="#FFF" />
                  <Text style={{ marginLeft:6, fontSize:12, color:'#FFF' }}>{a.source || 'Sumber'}</Text>
                  <View style={{ width:4, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.8)', marginHorizontal:8 }} />
                  <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#FFF" />
                  <Text style={{ marginLeft:6, fontSize:12, color:'#FFF' }}>{formatArticleRelativeTime(a.publishedAt)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flexDirection:'row', justifyContent:'center', marginTop:12 }}>
        {data.map((a, idx)=>(
          <View key={`${a.id || idx}-dot`} style={{ width:idx===activeIndex?18:8, height:8, borderRadius:4, marginHorizontal:4, backgroundColor:idx===activeIndex?theme.colors.primary:'#E5E7EB' }} />
        ))}
      </View>
    </View>
  );
}
