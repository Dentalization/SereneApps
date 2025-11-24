import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, TextInput, Animated, StatusBar, Linking, Platform } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getInitials } from '../../../utils/formatters';
import { resolveMediaUrl } from '../../../utils/media';
import { SAMPLE_ARTICLES } from '../data/articles';
import { SAMPLE_NOTIFICATIONS } from '../data/notifications';

// --- interop shims: tahan semua variasi export (default / named / CJS) ---
import * as FeaturedDoctorsMod from '../components/featuredDoctors';
import * as NearbyDentistsMod from '../components/nearbyDentists';
import * as QuickActionsMod from '../components/quickActions';
import * as NearbyClinicsMod from '../components/nearbyClinics';
import * as ArticleMod from '../components/article';
const FeaturedDoctors = FeaturedDoctorsMod.default || FeaturedDoctorsMod;
const NearbyDentists = NearbyDentistsMod.default || NearbyDentistsMod;
const QuickActions = QuickActionsMod.default || QuickActionsMod;
const NearbyClinics = NearbyClinicsMod.default || NearbyClinicsMod;
const Article = ArticleMod.default || ArticleMod;

const DashboardScreen = () => {
  const theme = useTheme(); 
  const navigation = useNavigation(); 
  const { user } = useSelector((s) => s.auth);
  
  // Get avatar from user (users.avatar_url in database) and resolve to full URL
  const avatarUrl = resolveMediaUrl(user?.avatar_url || null);
  const [refreshing, setRefreshing] = useState(false); const [searchText, setSearchText] = useState(''); const [selectedCategory, setSelectedCategory] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current; const [fadeAnim] = useState(new Animated.Value(0)); const [isScrolled, _setIsScrolled] = useState(false); const lastScrollFlag = useRef(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // ukur header → paddingTop konten supaya gap rapi & scroll stabil
  const headerHRef = useRef(220); const [headerH, setHeaderH] = useState(headerHRef.current);
  const onHeaderLayout = (e) => { const h = Math.round(e.nativeEvent.layout.height); if (h && h !== headerHRef.current) { headerHRef.current = h; setHeaderH(h); } };
  const SECTION_GAP = 24, FEATURED_TOP_MARGIN = 16, paddingTop = Math.max(headerH + SECTION_GAP - FEATURED_TOP_MARGIN, 0);

  const onRefresh = React.useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }, []);
  useEffect(() => { Animated.timing(fadeAnim,{toValue:1,duration:800,useNativeDriver:true}).start(); setUpcomingAppointments([]); }, []);

  const categories = [
    { id:'all', label:'Semua', icon:'check-circle' },
    { id:'orthodontic', label:'Ortodontik', icon:'tooth-outline' },
    { id:'periodontic', label:'Periodontik', icon:'heart-pulse' },
    { id:'endodontic', label:'Endodontik', icon:'medical-bag' },
  ];

  const quickActions = [
    {
      key: 'dentists',
      label: 'Dentist',
      icon: 'tooth-outline',
      tint: 'rgba(14,165,233,0.18)',
      onPress: () => navigation.navigate('DentistDirectory'),
    },
    {
      key: 'book',
      label: 'Buat Janji',
      icon: 'calendar-plus',
      tint: 'rgba(249, 115, 22, 0.2)',
      onPress: () => navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' }),
    },
    {
      key: 'ai',
      label: 'AI Scan Gigi',
      icon: 'camera',
      tint: 'rgba(16, 185, 129, 0.22)',
      iconColor: '#064E3B',
      onPress: () => navigation.navigate('AITab', { screen: 'AIHome' }),
    },
    {
      key: 'myAppointments',
      label: 'Janji Saya',
      icon: 'clipboard-text',
      tint: 'rgba(168, 85, 247, 0.2)',
      onPress: () => navigation.navigate('AppointmentTab', { screen: 'AppointmentList' }),
    },
    {
      key: 'medicalHistory',
      label: 'Riwayat Medis',
      icon: 'file-document',
      tint: 'rgba(59, 130, 246, 0.22)',
      onPress: () => navigation.navigate('SettingsTab', { screen: 'DataManagement' }),
    },
    {
      key: 'shop',
      label: 'Belanja',
      icon: 'shopping',
      tint: 'rgba(250, 204, 21, 0.25)',
      iconColor: '#78350F',
      onPress: () => navigation.navigate('ShopTab', { screen: 'ShopHome' }),
    },
    {
      key: 'help',
      label: 'Bantuan',
      icon: 'lifebuoy',
      tint: 'rgba(148, 163, 184, 0.2)',
      onPress: () => navigation.navigate('SettingsTab', { screen: 'HelpCenter' }),
    },
  ];

  const articles = SAMPLE_ARTICLES;
  const notifications = SAMPLE_NOTIFICATIONS;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const handleMainScroll = Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false, listener:(e)=>{ const flag = e.nativeEvent.contentOffset.y > 50; if (flag !== lastScrollFlag.current) { lastScrollFlag.current = flag; _setIsScrolled(flag); } }});
  const appendClinicParams = (d = {}) => ({
    clinicContext: d?.clinicContext,
    clinicId: d?.clinicContext?.profileId,
    clinicBranchId: d?.clinicContext?.branchId,
  });
  const handleDoctorPress = (d) =>
    navigation.navigate('DentistDetail', {
      dentistId: d.id,
      dentist: d,
      ...appendClinicParams(d),
    });
  const handleJoinCall = (d) =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: d.id, dentist: d, ...appendClinicParams(d) },
    });
  const handleBook = (d) =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: d.id, dentist: d, ...appendClinicParams(d) },
    });
  const handleClinicPress = (clinic) =>
    navigation.navigate('ClinicDetail', { clinicId: clinic?.id, clinic });
  const handleClinicBook = (clinic) =>
    navigation.navigate('AppointmentTab', {
      screen: 'ClinicDetail',
      params: { clinicId: clinic?.id, clinic },
    });
  const handleArticleOpen = (url) => { if(url) { try { Linking.openURL(url); } catch(e) {} } };
  const handleSeeAllArticles = () => navigation.navigate('ArticleList', { articles });
  const handleNotificationPress = () => navigation.navigate('Notifications', { notifications });
  const handleSeeAllDentists = () =>
    navigation.navigate('NearbyDentists', { maxDistanceKm: 8 });
  const handleSeeAllClinics = () =>
    navigation.navigate('NearbyClinics', { maxDistanceKm: 6 });

  return (
    <View style={{ flex:1, backgroundColor:'#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* HEADER */}
      <Animated.View onLayout={onHeaderLayout} style={{ position:'absolute', top:0, left:0, right:0, zIndex:1000, opacity:scrollY.interpolate({ inputRange:[0,50,100], outputRange:[1,0.95,0.9], extrapolate:'clamp' }) }}>
        <LinearGradient colors={isScrolled ? ['rgba(98,16,159,0.95)','rgba(98,16,159,0.85)'] : ((theme.gradients&&theme.gradients.primary)||[theme.colors.primary, theme.colors.primary])} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={{ paddingTop: 64, paddingHorizontal:20, paddingBottom:12, shadowColor:'#000', shadowOffset:{ width:0, height:4 }, shadowOpacity:0.1, shadowRadius:8, elevation:4, borderBottomLeftRadius:isScrolled?0:24, borderBottomRightRadius:isScrolled?0:24 }}>
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:16 }}>
            <View style={{ flex:1, flexDirection:'row', alignItems:'center' }}>
              <View style={{ marginRight:12 }}>
                {avatarUrl ? (
                  <Avatar.Image size={48} source={{ uri: avatarUrl }} />
                ) : user ? (
                  <Avatar.Text size={48} label={getInitials(user.name)} style={{ backgroundColor:'rgba(255,255,255,0.3)' }} />
                ) : (
                  <Avatar.Icon size={48} icon="account" style={{ backgroundColor:'rgba(255,255,255,0.3)' }} />
                )}
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>Selamat Datang Kembali</Text>
                <Text style={{ fontSize:20, fontWeight:'bold', color:'#FFFFFF' }}>{user?.name || 'Tamu'} 👋</Text>
              </View>
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
              <TextInput style={{ flex:1, fontSize:14, color:'#333', marginLeft:8 }} placeholder="Cari dokter atau apapun..." value={searchText} onChangeText={setSearchText} placeholderTextColor="#9CA3AF" />
            </View>
            <TouchableOpacity style={{ width:44, height:44, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:22, justifyContent:'center', alignItems:'center' }}><MaterialCommunityIcons name="tune-variant" size={20} color="white" /></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight:20 }} style={{ marginBottom:16 }}>
            {categories.map((c)=>{ const active=selectedCategory===c.id; return (
              <TouchableOpacity key={c.id} onPress={()=>setSelectedCategory(c.id)} style={{ backgroundColor:active?'white':'rgba(255,255,255,0.2)', borderRadius:16, paddingHorizontal:16, paddingVertical:8, flexDirection:'row', alignItems:'center', marginRight:8, borderWidth:active?0:1, borderColor:'rgba(255,255,255,0.3)' }}>
                <MaterialCommunityIcons name={c.icon} size={16} color={active?theme.colors.primary:'white'} />
                {c.id!=='all' && <Text style={{ fontSize:14, fontWeight:'600', color:active?'#62109F':'white', marginLeft:6 }}>{c.label}</Text>}
              </TouchableOpacity>
            );})}
          </ScrollView>
        </LinearGradient>
      </Animated.View>

      {/* CONTENT */}
      <Animated.ScrollView
        style={{ flex:1, backgroundColor:'#F8FAFC', opacity:fadeAnim }}
        contentContainerStyle={{ paddingTop, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        
        <FeaturedDoctors appointments={upcomingAppointments} onDoctorPress={handleDoctorPress} onJoinCall={handleJoinCall} />
        <QuickActions actions={quickActions} />
        <NearbyClinics
          onClinicPress={handleClinicPress}
          onBook={handleClinicBook}
          onSeeAll={handleSeeAllClinics}
        />
        <NearbyDentists
          onDoctorPress={handleDoctorPress}
          onMessage={() => {}}
          onBook={handleBook}
          onSeeAll={handleSeeAllDentists}
        />
        <Article articles={articles} onOpen={handleArticleOpen} onSeeAll={handleSeeAllArticles} />
      </Animated.ScrollView>
    </View>
  );
};

export default DashboardScreen;
