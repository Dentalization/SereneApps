import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, TextInput, Animated, StatusBar, Linking } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getInitials } from '../../../utils/formatters';
import { SAMPLE_ARTICLES } from '../data/articles';
import { SAMPLE_NOTIFICATIONS } from '../data/notifications';
import { NEARBY_DENTISTS } from '../data/dentists';

// --- interop shims: tahan semua variasi export (default / named / CJS) ---
import * as FeaturedDoctorsMod from '../components/featuredDoctors';
import * as NearbyDentistsMod from '../components/nearbyDentists';
import * as ArticleMod from '../components/article';
const FeaturedDoctors = FeaturedDoctorsMod.default || FeaturedDoctorsMod;
const NearbyDentists = NearbyDentistsMod.default || NearbyDentistsMod;
const Article = ArticleMod.default || ArticleMod;

const DashboardScreen = () => {
  const theme = useTheme(); const navigation = useNavigation(); const { user } = useSelector((s) => s.auth);
  const [refreshing, setRefreshing] = useState(false); const [searchText, setSearchText] = useState(''); const [selectedCategory, setSelectedCategory] = useState('All');
  const scrollY = useRef(new Animated.Value(0)).current; const [fadeAnim] = useState(new Animated.Value(0)); const [isScrolled, _setIsScrolled] = useState(false); const lastScrollFlag = useRef(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // ukur header → paddingTop konten supaya gap rapi & scroll stabil
  const headerHRef = useRef(220); const [headerH, setHeaderH] = useState(headerHRef.current);
  const onHeaderLayout = (e) => { const h = Math.round(e.nativeEvent.layout.height); if (h && h !== headerHRef.current) { headerHRef.current = h; setHeaderH(h); } };
  const SECTION_GAP = 24, FEATURED_TOP_MARGIN = 16, paddingTop = Math.max(headerH + SECTION_GAP - FEATURED_TOP_MARGIN, 0);

  const onRefresh = React.useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }, []);
  useEffect(() => { Animated.timing(fadeAnim,{toValue:1,duration:800,useNativeDriver:true}).start(); setUpcomingAppointments([]); }, []);

  const categories = [{ id:'all', name:'All', icon:'check-circle' },{ id:'orthodontic', name:'Orthodontic', icon:'tooth-outline' },{ id:'periodontic', name:'Periodontic', icon:'heart-pulse' },{ id:'endodontic', name:'Endodontic', icon:'medical-bag' }];

  const topDoctors = NEARBY_DENTISTS.slice(0, 3);

  const articles = SAMPLE_ARTICLES;
  const notifications = SAMPLE_NOTIFICATIONS;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const handleMainScroll = Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false, listener:(e)=>{ const flag = e.nativeEvent.contentOffset.y > 50; if (flag !== lastScrollFlag.current) { lastScrollFlag.current = flag; _setIsScrolled(flag); } }});
  const handleDoctorPress = (d) => navigation.navigate('DentistDetail', { dentistId: d.id, dentist: d });
  const handleJoinCall   = (d) => navigation.navigate('AppointmentTab',{ screen:'BookingSlot',  params:{ dentistId:d.id } });
  const handleBook       = (d) => navigation.navigate('AppointmentTab',{ screen:'BookingSlot',  params:{ dentistId:d.id } });
  const handleArticleOpen = (url) => { if(url) { try { Linking.openURL(url); } catch(e) {} } };
  const handleSeeAllArticles = () => navigation.navigate('ArticleList', { articles });
  const handleNotificationPress = () => navigation.navigate('Notifications', { notifications });
  const handleSeeAllDentists = () => navigation.navigate('NearbyDentists', { dentists: NEARBY_DENTISTS, maxDistanceKm: 5 });

  return (
    <View style={{ flex:1, backgroundColor:'#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* HEADER */}
      <Animated.View onLayout={onHeaderLayout} style={{ position:'absolute', top:0, left:0, right:0, zIndex:1000, opacity:scrollY.interpolate({ inputRange:[0,50,100], outputRange:[1,0.95,0.9], extrapolate:'clamp' }) }}>
        <LinearGradient colors={isScrolled ? ['rgba(98,16,159,0.95)','rgba(98,16,159,0.85)'] : ((theme.gradients&&theme.gradients.primary)||[theme.colors.primary, theme.colors.primary])} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={{ paddingTop:64, paddingHorizontal:20, paddingBottom:12, shadowColor:'#000', shadowOffset:{ width:0, height:4 }, shadowOpacity:0.1, shadowRadius:8, elevation:4, borderBottomLeftRadius:isScrolled?0:24, borderBottomRightRadius:isScrolled?0:24 }}>
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:16 }}>
            <View style={{ flex:1, flexDirection:'row', alignItems:'center' }}>
              <View style={{ marginRight:12 }}>{user ? <Avatar.Text size={48} label={getInitials(user.name)} style={{ backgroundColor:'rgba(255,255,255,0.3)' }} /> : <Avatar.Icon size={48} icon="account" style={{ backgroundColor:'rgba(255,255,255,0.3)' }} />}</View>
              <View style={{ flex:1 }}><Text style={{ fontSize:14, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>Welcome Back</Text><Text style={{ fontSize:20, fontWeight:'bold', color:'#FFFFFF' }}>{user?.name || 'Guest'} 👋</Text></View>
            </View>
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={{ width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center' }}
            >
              <MaterialCommunityIcons name="bell-outline" size={24} color="white" />
              {unreadNotifications > 0 && (
                <View style={{ position:'absolute', top:4, right:4, minWidth:16, height:16, borderRadius:8, backgroundColor:'#F97316', justifyContent:'center', alignItems:'center', paddingHorizontal:3 }}>
                  <Text style={{ color:'white', fontSize:10, fontWeight:'700' }}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection:'row', marginBottom:16, alignItems:'center' }}>
            <View style={{ flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'white', borderRadius:20, paddingHorizontal:16, paddingVertical:10, marginRight:12 }}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
              <TextInput style={{ flex:1, fontSize:14, color:'#333', marginLeft:8 }} placeholder="Search doctor or anything..." value={searchText} onChangeText={setSearchText} placeholderTextColor="#9CA3AF" />
            </View>
            <TouchableOpacity style={{ width:44, height:44, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:22, justifyContent:'center', alignItems:'center' }}><MaterialCommunityIcons name="tune-variant" size={20} color="white" /></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight:20 }} style={{ marginBottom:16 }}>
            {categories.map((c)=>{ const active=selectedCategory===c.name; return (
              <TouchableOpacity key={c.id} onPress={()=>setSelectedCategory(c.name)} style={{ backgroundColor:active?'white':'rgba(255,255,255,0.2)', borderRadius:16, paddingHorizontal:16, paddingVertical:8, flexDirection:'row', alignItems:'center', marginRight:8, borderWidth:active?0:1, borderColor:'rgba(255,255,255,0.3)' }}>
                <MaterialCommunityIcons name={c.icon} size={16} color={active?theme.colors.primary:'white'} />
                {c.name!=='All' && <Text style={{ fontSize:14, fontWeight:'600', color:active?'#62109F':'white', marginLeft:6 }}>{c.name}</Text>}
              </TouchableOpacity>
            );})}
          </ScrollView>
        </LinearGradient>
      </Animated.View>

      {/* CONTENT */}
      <Animated.ScrollView
        style={{ flex:1, backgroundColor:'#F8FAFC', opacity:fadeAnim }}
        contentContainerStyle={{ paddingTop, paddingBottom:100 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <FeaturedDoctors appointments={upcomingAppointments} onDoctorPress={handleDoctorPress} onJoinCall={handleJoinCall} />
        <NearbyDentists
          dentists={topDoctors}
          onDoctorPress={handleDoctorPress}
          onMessage={()=>{}}
          onBook={handleBook}
          onSeeAll={handleSeeAllDentists}
        />
        <Article articles={articles} onOpen={handleArticleOpen} onSeeAll={handleSeeAllArticles} />
      </Animated.ScrollView>
    </View>
  );
};

export default DashboardScreen;
