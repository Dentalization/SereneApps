import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { ActivityIndicator, Text, Chip, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { getDentistById, getDentistAvailableSlots } from '../../../services/dentistService';
import { DENTISTS, SLOT_AVAILABILITY } from '../data/appointments';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getUpcomingDates = (days = 5) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const d = new Date(today);
    d.setDate(d.getDate() + index);
    return d.toISOString().split('T')[0];
  });
};

const buildAvatarUrl = (rawUrl, seed) => {
  if (!rawUrl) {
    const fallbackSeed = seed || 'dentist';
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed}&backgroundColor=8B5CF6`;
  }

  if (rawUrl.includes('dicebear.com')) {
    return rawUrl.replace('/svg', '/png');
  }

  return rawUrl;
};

const formatTime = (isoOrTime) => {
  if (!isoOrTime) return '';
  if (isoOrTime.includes(':') && isoOrTime.length <= 5) return isoOrTime;
  const date = new Date(isoOrTime);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const normalizeSlot = (slot) => {
  const type =
    slot.appointmentType || slot.type || (slot.isVirtual || slot.mode === 'virtual' ? 'virtual' : 'onsite');
  return {
    id: slot.id || `${slot.startsAt || slot.time}-${type}`,
    time: slot.time || formatTime(slot.startsAt),
    duration: slot.durationMinutes || slot.duration || 30,
    type,
    isAvailable: slot.isAvailable !== false,
    raw: slot,
  };
};

const BookingSlotScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dentistId = route.params?.dentistId || DENTISTS[0].id;
  const isLiveDentistId = /^\d+$/.test(dentistId?.toString?.() || '');
  const initialDentist = route.params?.dentist;
  const clinicIdForInfo = route.params?.clinicId;
  const fallbackDentist =
    initialDentist ||
    DENTISTS.find((doc) => doc.id === dentistId) ||
    null;

  const [dentist, setDentist] = useState(
    fallbackDentist
      ? {
          ...fallbackDentist,
          avatarUrl: buildAvatarUrl(fallbackDentist.avatarUrl || fallbackDentist.avatar, fallbackDentist.id),
        }
      : null,
  );
  const [dentistLoading, setDentistLoading] = useState(!initialDentist);
  const [dentistError, setDentistError] = useState(null);

  const dateOptions = useMemo(() => getUpcomingDates(5), []);
  const [selectedDate, setSelectedDate] = useState(route.params?.date || dateOptions[0]);
  const [slotType, setSlotType] = useState(route.params?.type || 'onsite');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotError, setSlotError] = useState(null);

  const { toast, showToast, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(300);

  useEffect(() => {
    let ignore = false;
    const fetchDentistDetail = async () => {
      if (!isLiveDentistId) {
        setDentistLoading(false);
        return;
      }
      try {
        setDentistLoading(true);
        const response = await getDentistById(dentistId);
        const data = response?.data || response?.dentist || response;
        
        console.log('🦷 [BookingSlot] Fetched dentist data:', JSON.stringify(data, null, 2).substring(0, 500));
        
        if (!ignore && data) {
          // Get primary clinic (first active clinic or first clinic)
          const primaryClinic = Array.isArray(data.clinics) && data.clinics.length > 0
            ? data.clinics.find(c => c.is_active) || data.clinics[0]
            : null;
          
          console.log('🏥 [BookingSlot] Primary clinic:', primaryClinic);

          const fallbackClinicContext = data.clinic_branch_id || data.clinic_id || data.clinic_profile_id;
          const clinicContext = primaryClinic
            ? {
                profileId: primaryClinic.id?.toString?.(),
                branchId:
                  (primaryClinic.assigned_branch_id ||
                    primaryClinic.branch_id ||
                    primaryClinic.branchId)?.toString?.() || null,
                name: primaryClinic.branch_name || primaryClinic.name || data.clinic_name,
                address: primaryClinic.branch_address || primaryClinic.address || data.clinic_address,
                distance: data.distance || data.distanceKm,
              }
            : fallbackClinicContext
            ? {
                profileId: data.clinic_profile_id?.toString?.() || data.clinic_id?.toString?.() || null,
                branchId: data.clinic_branch_id?.toString?.() || null,
                name: data.clinic_name,
                address: data.clinic_address,
                distance: data.distance || data.distanceKm,
              }
            : null;

          const fallbackAvatar =
            data.avatar_url || data.avatarUrl || data.profile_picture || data.photo_url || data.avatar;
          setDentist({
            id: data.id?.toString?.() || data.userId?.toString?.() || dentistId,
            name: data.name || data.fullName,
            specialty: data.specialization || data.primary_specialization,
            avatarUrl: buildAvatarUrl(fallbackAvatar, data.id || dentistId),
            rating: data.rating || 4.8,
            clinicContext,
            consultationFee: data.consultationFee || data.consultation_fee || 0,
            distance: data.distance || data.distanceKm,
          });
          setDentistError(null);
        }
      } catch (err) {
        console.log('🔍 [BookingSlot] Failed to load dentist detail:', err.message);
        if (!ignore) {
          setDentistError('Tidak dapat memuat detail dokter.');
          showToast('Gagal memuat data dokter, gunakan data contoh', 'warning');
        }
      } finally {
        if (!ignore) {
          setDentistLoading(false);
        }
      }
    };

    fetchDentistDetail();
    return () => {
      ignore = true;
    };
  }, [dentistId, isLiveDentistId, initialDentist]);

  useEffect(() => {
    let ignore = false;
    const loadSlots = async () => {
      setSlotsLoading(true);
      setSlotError(null);
      setSelectedSlot(null);
      const clinicProfileRef =
        clinicIdForInfo ||
        dentist?.clinicContext?.profileId ||
        dentist?.clinics?.[0]?.id ||
        dentist?.primaryClinicId;
      const clinicBranchRef = dentist?.clinicContext?.branchId;

      const isLiveClinicRef = /^\d+$/.test((clinicProfileRef || '').toString());
      
      console.log('📅 [BookingSlot] Loading slots for:', {
        dentistId,
        selectedDate,
        clinicIdForInfo,
        clinicProfileRef,
        clinicBranchRef,
        'clinicContext.profileId': dentist?.clinicContext?.profileId,
        'clinicContext.branchId': dentist?.clinicContext?.branchId,
      });
      
      if (!clinicProfileRef || !isLiveClinicRef) {
        // Silently use fallback without user-facing warning
        console.log('📍 [BookingSlot] Using fallback slots (clinic ID not available)');
        const fallback = SLOT_AVAILABILITY.find(
          (entry) => entry.dentistId === dentistId && entry.date === selectedDate
        );
          const fallbackSlots = (fallback?.slots || []).map(normalizeSlot);
          setSlots(fallbackSlots);
          if (fallbackSlots.length && !selectedSlot) {
            setSelectedSlot(fallbackSlots[0]);
          }
        setSlotError(null); // Don't show error to user
        setSlotsLoading(false);
        return;
      }
      try {
        if (!isLiveDentistId || !isLiveClinicRef) {
          throw new Error('Using fallback data for demo dentist');
        }
        console.log('🌐 [BookingSlot] Calling API getDentistAvailableSlots...');
        const response = await getDentistAvailableSlots(dentistId, selectedDate, clinicProfileRef);
        console.log('✅ [BookingSlot] Got slots response:', response);
        const data = response?.data || response;
        const available = data?.slots || data?.availableSlots || [];
        if (!ignore) {
          setSlots(available.map(normalizeSlot));
          setSlotError(null);
        }
      } catch (err) {
        console.log('🔍 [BookingSlot] Failed to fetch slots:', err.message);
        if (!ignore) {
          // Show toast for real API errors, not for fallback scenarios
          if (isLiveDentistId) {
            showToast('Gagal memuat jadwal, menggunakan jadwal contoh', 'warning');
          }
          setSlotError(null); // Don't show inline error
          // fallback to sample data
          const fallback = SLOT_AVAILABILITY.find((entry) => entry.dentistId === dentistId && entry.date === selectedDate);
          const fallbackSlots = (fallback?.slots || []).map(normalizeSlot);
          setSlots(fallbackSlots);
          // Auto-select closest available slot to mimic live behavior
          if (fallbackSlots.length && !selectedSlot) {
            setSelectedSlot(fallbackSlots[0]);
          }
        }
      } finally {
        if (!ignore) {
          setSlotsLoading(false);
        }
      }
    };

    loadSlots();
    return () => {
      ignore = true;
    };
  }, [clinicIdForInfo, dentist?.clinicContext?.profileId, dentistId, selectedDate, isLiveDentistId, selectedSlot]);

  const filteredSlots = useMemo(
    () => slots.filter((slot) => slot.type === slotType && slot.isAvailable),
    [slots, slotType]
  );

  const groupedSlots = useMemo(() => {
    const buckets = { morning: [], afternoon: [], evening: [] };
    filteredSlots.forEach((slot) => {
      const hour = parseInt(slot.time.split(':')[0], 10);
      if (hour < 12) buckets.morning.push(slot);
      else if (hour < 17) buckets.afternoon.push(slot);
      else buckets.evening.push(slot);
    });
    return [
      { key: 'morning', label: 'Sesi pagi', data: buckets.morning },
      { key: 'afternoon', label: 'Sesi siang', data: buckets.afternoon },
      { key: 'evening', label: 'Sesi malam', data: buckets.evening },
    ].filter((group) => group.data.length > 0);
  }, [filteredSlots]);

  const handleContinue = () => {
    if (!selectedSlot) return;
    navigation.navigate('BookingConfirm', {
      dentist,
      slot: selectedSlot,
      date: selectedDate,
      type: slotType,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle='light-content' backgroundColor='#7C3AED' />

      <View onLayout={handleHeaderLayout} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10, paddingTop: insets.top }}>
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 2, paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Langkah 1/2</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 4 }}>Pilih Jadwal</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const targetClinicId = dentist?.clinicContext?.branchId || dentist?.clinicContext?.profileId;
                if (targetClinicId) {
                  navigation.navigate('ClinicDetail', {
                    clinicId: targetClinicId,
                    clinic: {
                      id: targetClinicId,
                      name: dentist?.clinicContext?.name,
                      address: dentist?.clinicContext?.address,
                    },
                  });
                }
              }}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='share-variant' size={20} color='white' />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
                overflow: 'hidden',
              }}
            >
              {dentist?.avatarUrl ? (
                <Image
                  source={{ uri: dentist.avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode='cover'
                />
              ) : (
                <MaterialCommunityIcons name='account-heart' size={30} color='#6366F1' />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>{dentist?.name || 'Dokter'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 }}>
                {dentist?.specialty}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <MaterialCommunityIcons name='map-marker' size={14} color='rgba(255,255,255,0.7)' />
                <Text style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>
                  {dentist?.clinicContext?.address || dentist?.clinic?.address}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <InfoPill icon='star' label={`Rating ${((dentist?.rating || 4.8)).toFixed(1)}`} />
            <InfoPill icon='map-marker-distance' label={dentist?.clinicContext?.distance || dentist?.distance || '—'} />
            <InfoPill icon='calendar' label={`${filteredSlots.length} jadwal tersedia`} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 8 }}>
          <Text style={{ marginLeft: 20, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
            Pilih tanggal
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
            {dateOptions.map((date) => (
              <TouchableOpacity
                key={date}
                onPress={() => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 18,
                  backgroundColor: selectedDate === date ? '#7C3AED' : 'white',
                  borderWidth: 1,
                  borderColor: selectedDate === date ? '#7C3AED' : '#E2E8F0',
                  marginRight: 12,
                }}
              >
                <Text style={{ color: selectedDate === date ? 'white' : '#475569', fontWeight: '600' }}>
                  {new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={{ marginLeft: 20, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
            Jenis sesi
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
            {[
              { key: 'onsite', label: 'Tatap muka', icon: 'hospital-building' },
              { key: 'virtual', label: 'Virtual visit', icon: 'laptop' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => {
                  setSlotType(option.key);
                  setSelectedSlot(null);
                }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 18,
                  marginRight: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: slotType === option.key ? '#EEF2FF' : 'white',
                  borderWidth: 1,
                  borderColor: slotType === option.key ? '#7C3AED' : '#E2E8F0',
                }}
              >
                <MaterialCommunityIcons name={option.icon} size={18} color={slotType === option.key ? '#7C3AED' : '#94A3B8'} />
                <Text style={{ marginLeft: 8, fontWeight: '600', color: slotType === option.key ? '#7C3AED' : '#475569' }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {slotError ? (
            <Text style={{ color: '#B91C1C', marginBottom: 8 }}>{slotError}</Text>
          ) : null}

          {slotsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <ActivityIndicator animating color={theme.colors.primary} />
              <Text style={{ marginTop: 8, color: '#475569' }}>Memuat jadwal...</Text>
            </View>
          ) : null}

          {!slotsLoading && !filteredSlots.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <MaterialCommunityIcons name='calendar-remove' size={48} color='#CBD5F5' />
              <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 12 }}>Belum ada jadwal</Text>
              <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
                Pilih tanggal lain atau ubah tipe sesi untuk melihat pilihan lain.
              </Text>
            </View>
          ) : null}

          {groupedSlots.map((group) => (
            <View key={group.key} style={{ marginBottom: 24 }}>
              <Text style={{ fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>{group.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {group.data.map((slot) => {
                  const active = selectedSlot?.id === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      onPress={() => setSelectedSlot(slot)}
                      style={{
                        width: '30%',
                        marginRight: '3%',
                        marginBottom: 12,
                        paddingVertical: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: active ? '#7C3AED' : '#E2E8F0',
                        backgroundColor: active ? '#EEF2FF' : 'white',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: active ? '#7C3AED' : '#0F172A' }}>{slot.time}</Text>
                      <Text style={{ fontSize: 12, color: '#94A3B8' }}>{slot.duration} menit</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}>
        <Button mode='contained' icon='check' onPress={handleContinue} disabled={!selectedSlot}>
          Lanjutkan
        </Button>
      </View>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

const InfoPill = ({ icon, label }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 12,
  }}>
    <MaterialCommunityIcons name={icon} size={16} color='white' />
    <Text style={{ marginLeft: 6, fontWeight: '600', color: 'white' }}>{label}</Text>
  </View>
);

export default BookingSlotScreen;
