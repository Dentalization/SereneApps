import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Image, Platform, Animated } from 'react-native';
import { ActivityIndicator, Text, Chip, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { getDentistById, getDentistAvailableSlots } from '../../../services/dentistService';
import { getClinicById } from '../../../services/clinicService';
import { DENTISTS, SLOT_AVAILABILITY } from '../data/appointments';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { useI18n } from '../../../hooks/useI18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const getUpcomingDates = (days = 14) => {
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

// ISSUE-007: generateDefaultSlots removed — no more fake slot data

const BookingSlotScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dentistId = route.params?.dentistId || DENTISTS[0].id;
  const isLiveDentistId = /^\d+$/.test(dentistId?.toString?.() || '');
  const initialDentist = route.params?.dentist;
  const routeClinicContext = route.params?.clinicContext || route.params?.dentist?.clinicContext;
  const clinicIdForInfo = route.params?.clinicId || routeClinicContext?.profileId;
  const clinicBranchParam = route.params?.clinicBranchId || routeClinicContext?.branchId;
  const rebookingFromAppointmentId = route.params?.rebookingFromAppointmentId || null;
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

  const dateOptions = useMemo(() => getUpcomingDates(14), []);

  // ANIM-001: Slot selection spring bounce
  const slotScaleAnim = useRef(new Animated.Value(1)).current;
  const animateSlotSelect = () => {
    slotScaleAnim.setValue(0.92);
    Animated.spring(slotScaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };
  const [selectedDate, setSelectedDate] = useState(route.params?.date || dateOptions[0]);
  const [slotType, setSlotType] = useState(route.params?.type || 'onsite');
  const [durationMinutes, setDurationMinutes] = useState(route.params?.durationMinutes || 30);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const selectedBarAnim = useRef(new Animated.Value(60)).current;

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotError, setSlotError] = useState(null);
  const [slotCounts, setSlotCounts] = useState({});
  const [slotCountsLoading, setSlotCountsLoading] = useState(false);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const { toast, showToast, hideToast } = useToast();
  const { t } = useI18n();

  const insets = useSafeAreaInsets();
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(300);

  // 1. Load Dentist Detail
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

          const isIndependent = data.dentist_type === 'independent' ||
            (!primaryClinic && !fallbackClinicContext);

          setDentist({
            id: data.id?.toString?.() || data.userId?.toString?.() || dentistId,
            name: data.name || data.fullName,
            specialty: data.specialization || data.primary_specialization,
            avatarUrl: buildAvatarUrl(fallbackAvatar, data.id || dentistId),
            rating: data.rating || 4.8,
            clinicContext,
            consultationFee: data.consultationFee || data.consultation_fee || 0,
            distance: data.distance || data.distanceKm,
            dentistType: data.dentist_type || (isIndependent ? 'independent' : 'clinic'),
            clinicName: data.clinic_name,
            clinicAddress: data.clinic_address,
            phoneNumber: data.phone_number,
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

  // 2. Load Services
  useEffect(() => {
    let ignore = false;
    const loadServices = async () => {
      const clinicProfileRef =
        clinicIdForInfo || dentist?.clinicContext?.profileId || dentist?.clinics?.[0]?.id;
      const isLiveClinicRef = clinicProfileRef && /^\d+$/.test(clinicProfileRef.toString());
      if (!clinicProfileRef || !isLiveClinicRef) {
        setServices([]);
        setSelectedService(null);
        return;
      }
      try {
        setServicesLoading(true);
        const clinic = await getClinicById(clinicProfileRef);
        const mapped = (clinic?.services || []).map((s) => ({
          id: s.id || s.serviceId,
          name: s.name,
          description: s.description,
          price: s.price ?? s.base_price ?? 0,
          durationMinutes: s.duration_minutes ?? s.durationMinutes ?? 60,
          category: s.category,
        })).filter((s) => s.price !== null && s.price !== undefined);
        if (!ignore) {
          setServices(mapped);
          if (slotType === 'onsite' && mapped.length > 0) {
            setSelectedService(mapped[0]);
          }
        }
      } catch (err) {
        console.log('🔍 [BookingSlot] Failed to load services:', err.message);
        if (!ignore) {
          setServices([]);
          setSelectedService(null);
        }
      } finally {
        if (!ignore) setServicesLoading(false);
      }
    };

    loadServices();
    return () => { ignore = true; };
  }, [clinicIdForInfo, dentist?.clinicContext?.profileId, slotType]);

  // 3. Load Slots (Consolidated Logic)
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
      const clinicBranchRef = clinicBranchParam || dentist?.clinicContext?.branchId;

      const isLiveClinicRef = /^\d+$/.test((clinicProfileRef || '').toString());

      if (__DEV__) console.log('📅 [BookingSlot] Loading slots for:', {
        dentistId,
        selectedDate,
        clinicIdForInfo,
        clinicProfileRef,
        clinicBranchRef,
      });

      // Fallback if no valid clinic ID for live dentist
      if (!clinicProfileRef || !isLiveClinicRef) {
        if (__DEV__) console.log('📍 [BookingSlot] No live clinic ID, using seed data only');
        const fallback = SLOT_AVAILABILITY.find(
          (entry) => entry.dentistId === dentistId && entry.date === selectedDate
        );
        const fallbackSlots = fallback?.slots?.length
          ? fallback.slots.map(normalizeSlot)
          : []; // ISSUE-007: No fake slots — show empty state instead

        if (!ignore) {
          setSlots(fallbackSlots);
          if (fallbackSlots.length && !selectedSlot) {
            setSelectedSlot(fallbackSlots[0]);
          }
          setSlotError(fallbackSlots.length === 0 ? 'Tidak ada jadwal tersedia untuk tanggal ini.' : null);
          setSlotsLoading(false);
        }
        return;
      }

      try {
        if (!isLiveDentistId) {
          throw new Error('Using fallback data for demo dentist');
        }
        if (__DEV__) console.log('🌐 [BookingSlot] Calling API getDentistAvailableSlots...');
        const response = await getDentistAvailableSlots(dentistId, selectedDate, clinicProfileRef);
        if (__DEV__) console.log('✅ [BookingSlot] Got slots response:', response);
        const data = response?.data || response;
        const available = data?.slots || data?.availableSlots || [];

        if (!ignore) {
          const normalizedSlots = available.map(normalizeSlot);
          setSlots(normalizedSlots);
          setSlotError(normalizedSlots.length === 0 ? 'Tidak ada jadwal tersedia untuk tanggal ini.' : null);
        }
      } catch (err) {
        if (__DEV__) console.log('🔍 [BookingSlot] Failed to fetch slots:', err.message);
        if (!ignore) {
          if (isLiveDentistId) {
            showToast('Gagal memuat jadwal. Coba pilih tanggal lain.', 'warning');
          }
          const fallback = SLOT_AVAILABILITY.find((entry) => entry.dentistId === dentistId && entry.date === selectedDate);
          const fallbackSlots = fallback?.slots?.length
            ? fallback.slots.map(normalizeSlot)
            : [];
          setSlots(fallbackSlots);
          setSlotError(fallbackSlots.length === 0 ? 'Gagal memuat jadwal. Silakan coba lagi.' : null);
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
  }, [dentistId, selectedDate, clinicIdForInfo, dentist?.clinicContext?.profileId, isLiveDentistId]); // Closed correctly

  useEffect(() => {
    Animated.timing(selectedBarAnim, {
      toValue: selectedSlot ? 0 : 60,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [selectedBarAnim, selectedSlot]);

  useEffect(() => {
    let ignore = false;
    const clinicProfileRef =
      clinicIdForInfo ||
      dentist?.clinicContext?.profileId ||
      dentist?.clinics?.[0]?.id ||
      dentist?.primaryClinicId;
    const isLiveClinicRef = /^\d+$/.test((clinicProfileRef || '').toString());
    if (!isLiveDentistId || !clinicProfileRef || !isLiveClinicRef) return undefined;

    setSlotCountsLoading(true);
    Promise.all(dateOptions.slice(0, 7).map(async (date) => {
      try {
        const response = await getDentistAvailableSlots(dentistId, date, clinicProfileRef);
        const data = response?.data || response;
        const available = data?.slots || data?.availableSlots || [];
        return [date, available.filter((slot) => normalizeSlot(slot).isAvailable).length];
      } catch (_error) {
        return [date, null];
      }
    })).then((entries) => {
      if (!ignore) setSlotCounts(Object.fromEntries(entries));
    }).finally(() => {
      if (!ignore) setSlotCountsLoading(false);
    });

    return () => { ignore = true; };
  }, [clinicIdForInfo, dateOptions, dentist?.clinicContext?.profileId, dentistId, isLiveDentistId]);

  const filteredSlots = useMemo(() => {
    const hasEnoughDuration = (slot) => {
      if (slotType !== 'virtual') return true;
      if (slot.duration === durationMinutes) return true;
      const startsAt = slot.raw?.startsAt ? new Date(slot.raw.startsAt) : null;
      const endsAt = slot.raw?.endsAt ? new Date(slot.raw.endsAt) : null;
      if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return slot.duration >= durationMinutes;
      }
      return (endsAt.getTime() - startsAt.getTime()) / 60000 >= durationMinutes;
    };
    return slots.filter((slot) => slot.type === slotType && slot.isAvailable && hasEnoughDuration(slot));
  }, [durationMinutes, slots, slotType]);

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
    if (slotType === 'onsite' && services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
    navigation.navigate('BookingConfirm', {
      dentist,
      slot: selectedSlot,
      date: selectedDate,
      type: slotType,
      service: slotType === 'virtual' ? null : selectedService,
      fee: slotType === 'virtual' ? (dentist?.consultationFee || selectedSlot?.raw?.fee || 0) : selectedService?.price,
      durationMinutes,
      metadata: {
        ...(rebookingFromAppointmentId ? { rebookingFromAppointmentId } : {}),
        durationMinutes,
      },
    });
  };

  const nearestAvailableDate = useMemo(() => (
    dateOptions.find((date) => date !== selectedDate && (slotCounts[date] || 0) > 0)
  ), [dateOptions, selectedDate, slotCounts]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle='light-content' backgroundColor="transparent" translucent />

      <View
        onLayout={handleHeaderLayout}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 20,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: COLORS.textPrimary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityLabel="Kembali"
              accessibilityRole="button"
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: withOpacity(COLORS.white, 0.2), alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='arrow-left' size={22} color={COLORS.surfaceElevated} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: withOpacity(COLORS.white, 0.8), ...TYPOGRAPHY.caption }}>Langkah 1/3</Text>
              <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.h3, marginTop: 4 }}>Pilih Jadwal</Text>
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
              accessibilityLabel="Detail Klinik"
              accessibilityRole="button"
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: withOpacity(COLORS.white, 0.2), alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='information-outline' size={20} color={COLORS.surfaceElevated} />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: withOpacity(COLORS.white, 0.15), borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: COLORS.surfaceElevated,
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
                <MaterialCommunityIcons name='account-heart' size={30} color={COLORS.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.surfaceElevated }}>{dentist?.name || 'Dokter'}</Text>
              <Text style={{ color: withOpacity(COLORS.white, 0.8), fontWeight: '600', marginTop: 2, ...TYPOGRAPHY.bodySmall }}>
                {dentist?.specialty}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <MaterialCommunityIcons name='map-marker' size={14} color={withOpacity(COLORS.white, 0.7)} />
                <Text style={{ color: withOpacity(COLORS.white, 0.7), marginLeft: 4, ...TYPOGRAPHY.caption }}>
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
        {rebookingFromAppointmentId && (
          <View style={{ marginHorizontal: 20, marginTop: 18, borderRadius: 20, overflow: 'hidden' }}>
            <LinearGradient
              colors={[withOpacity(COLORS.primary, 0.16), withOpacity(COLORS.primaryLight, 0.1)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16, borderWidth: 1, borderColor: withOpacity(COLORS.primary, 0.24), borderRadius: 20 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <MaterialCommunityIcons name="calendar-refresh" size={22} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '800', color: COLORS.textPrimary }}>Pesan lagi dengan dokter yang sama</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 3 }}>
                    Kami langsung membawa Anda ke pilihan jadwal tanpa mencari ulang.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={{ marginLeft: 20, ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 }}>
            Pilih tanggal
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
            {dateOptions.map((date) => {
              const count = slotCounts[date];
              const isUnknown = count === null || count === undefined;
              const disabled = count === 0 && date !== selectedDate && !slotCountsLoading;
              const dotColor = isUnknown
                ? COLORS.textMuted
                : count > 5
                  ? COLORS.success
                  : count > 0
                    ? COLORS.warning
                    : COLORS.border;
              return (
                <TouchableOpacity
                  key={date}
                  onPress={() => {
                    if (disabled) return;
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selectedDate === date, disabled }}
                  accessibilityLabel={isUnknown
                    ? `Tanggal ${new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}. ${t('mobile.booking.availabilityUnknown', { fallbackText: 'Ketersediaan belum dapat dipastikan. Ketuk untuk mencoba memuat jadwal.' })}`
                    : `Tanggal ${new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 18,
                    backgroundColor: selectedDate === date ? COLORS.primary : COLORS.surfaceElevated,
                    borderWidth: 1,
                    borderColor: selectedDate === date ? COLORS.primary : COLORS.border,
                    marginRight: 12,
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  <Text style={{ color: selectedDate === date ? COLORS.surfaceElevated : COLORS.textSecondary, fontWeight: '600' }}>
                    {new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  <View style={{ alignItems: 'center', height: 8, marginTop: 5 }}>
                    {slotCountsLoading && count === undefined ? (
                      <ActivityIndicator animating size={8} color={selectedDate === date ? COLORS.surfaceElevated : COLORS.primary} />
                    ) : count > 0 || count === null ? (
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dotColor }} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {(slotCounts[selectedDate] === null) && (
            <Text style={{ marginHorizontal: 20, marginTop: 8, ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>
              {t('mobile.booking.availabilityUnknown', { fallbackText: 'Ketersediaan belum dapat dipastikan. Ketuk untuk mencoba memuat jadwal.' })}
            </Text>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={{ marginLeft: 20, ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 }}>
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
                  if (option.key === 'virtual') {
                    setSelectedService(null);
                  } else if (services.length > 0) {
                    setSelectedService(services[0]);
                  }
                }}
                accessibilityLabel={`Tipe Sesi ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: slotType === option.key }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 18,
                  marginRight: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: slotType === option.key ? withOpacity(COLORS.primary, 0.1) : COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: slotType === option.key ? COLORS.primary : COLORS.border,
                }}
              >
                <MaterialCommunityIcons name={option.icon} size={18} color={slotType === option.key ? COLORS.primary : COLORS.textMuted} />
                <Text style={{ marginLeft: 8, fontWeight: '600', color: slotType === option.key ? COLORS.primary : COLORS.textSecondary }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {slotType === 'onsite' && (
          <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 }}>
              Pilih layanan
            </Text>
            {servicesLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                <ActivityIndicator animating color={COLORS.primary} />
                <Text style={{ marginLeft: 8, color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>Memuat layanan klinik...</Text>
              </View>
            ) : services.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, ...TYPOGRAPHY.bodySmall }}>Klinik belum menambahkan layanan.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {services.map((svc) => {
                  const active = selectedService?.id === svc.id;
                  return (
                    <TouchableOpacity
                      key={svc.id || svc.name}
                      onPress={() => setSelectedService(svc)}
                      accessibilityLabel={`Layanan ${svc.name}, Harga ${svc.price?.toLocaleString('id-ID')}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 14,
                        marginRight: 12,
                        backgroundColor: active ? withOpacity(COLORS.primary, 0.1) : COLORS.surfaceElevated,
                        borderWidth: 1,
                        borderColor: active ? COLORS.primary : COLORS.border,
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: active ? COLORS.primary : COLORS.textPrimary }}>{svc.name}</Text>
                      <Text style={{ color: COLORS.textSecondary, marginTop: 4, ...TYPOGRAPHY.bodySmall }}>Rp {svc.price?.toLocaleString('id-ID')}</Text>
                      <Text style={{ color: COLORS.textMuted, ...TYPOGRAPHY.caption }}>{svc.durationMinutes || 60} menit</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {slotType === 'virtual' && (
          <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 }}>
              Durasi konsultasi
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[15, 30, 45, 60].map((minutes) => {
                const active = durationMinutes === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    onPress={() => {
                      setDurationMinutes(minutes);
                      setSelectedSlot(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Durasi ${minutes} menit`}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 16,
                      marginRight: 10,
                      backgroundColor: active ? withOpacity(COLORS.primary, 0.12) : COLORS.surfaceElevated,
                      borderWidth: 1,
                      borderColor: active ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text style={{ color: active ? COLORS.primary : COLORS.textSecondary, fontWeight: '800' }}>{minutes} mnt</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {slotError ? (
            <Text style={{ color: COLORS.error, marginBottom: 8, ...TYPOGRAPHY.bodySmall }}>{slotError}</Text>
          ) : null}

          {slotsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <ActivityIndicator animating color={COLORS.primary} />
              <Text style={{ marginTop: 8, color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>Memuat jadwal...</Text>
            </View>
          ) : null}

          {!slotsLoading && !filteredSlots.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 20, backgroundColor: COLORS.surfaceElevated, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16 }}>
              <MaterialCommunityIcons name='calendar-remove' size={48} color={withOpacity(COLORS.primary, 0.2)} />
              <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginTop: 12 }}>Belum ada jadwal</Text>
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, ...TYPOGRAPHY.bodySmall }}>
                {nearestAvailableDate ? 'Kami menemukan jadwal terdekat untuk dokter ini.' : 'Belum ada slot dalam 7 hari ke depan. Coba dokter lain atau ubah tipe sesi.'}
              </Text>
              {nearestAvailableDate ? (
                <TouchableOpacity
                  onPress={() => setSelectedDate(nearestAvailableDate)}
                  style={{ marginTop: 14, borderRadius: 14, backgroundColor: withOpacity(COLORS.primary, 0.12), paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih tanggal slot terdekat"
                >
                  <MaterialCommunityIcons name="calendar-search" size={18} color={COLORS.primary} />
                  <Text style={{ marginLeft: 8, color: COLORS.primary, fontWeight: '800' }}>
                    Pilih {new Date(nearestAvailableDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 14 }} accessibilityRole="button" accessibilityLabel="Coba dokter lain">
                  <Text style={{ color: COLORS.primary, fontWeight: '800' }}>Coba dokter lain</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {groupedSlots.map((group) => (
            <View key={group.key} style={{ marginBottom: 24 }}>
              <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>{group.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {group.data.map((slot) => {
                  const active = selectedSlot?.id === slot.id;
                  return (
                    <Animated.View
                      key={slot.id}
                      style={{ width: '31%', transform: active ? [{ scale: slotScaleAnim }] : [] }}
                    >
                      <TouchableOpacity
                        onPress={() => { setSelectedSlot(slot); animateSlotSelect(); }}
                        accessibilityLabel={`Pukul ${slot.time}, Durasi ${slot.duration} menit`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={{
                          marginBottom: 12,
                          paddingVertical: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: active ? COLORS.primary : COLORS.border,
                          backgroundColor: active ? withOpacity(COLORS.primary, 0.1) : COLORS.surfaceElevated,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: active ? COLORS.primary : COLORS.textPrimary }}>{slot.time}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{slot.duration} menit</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}>
        {selectedSlot ? (
          <Animated.View style={{ transform: [{ translateY: selectedBarAnim }], marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: withOpacity(COLORS.primary, 0.2), backgroundColor: withOpacity(COLORS.primary, 0.08), padding: 12, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name={slotType === 'virtual' ? 'video-outline' : 'hospital-building'} size={20} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>Pilihan Anda</Text>
              <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '800' }}>
                {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} · {selectedSlot.time} WIB · {slotType === 'virtual' ? `${durationMinutes} mnt virtual` : 'tatap muka'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedSlot(null)} accessibilityRole="button" accessibilityLabel="Hapus pilihan jadwal">
              <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}
        <Button
          mode='contained'
          icon='check'
          onPress={handleContinue}
          disabled={!selectedSlot}
          buttonColor={COLORS.primary}
          labelStyle={{ fontWeight: '700' }}
          accessibilityLabel="Lanjutkan Konfirmasi"
        >
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
    backgroundColor: withOpacity(COLORS.white, 0.15),
    marginRight: 12,
  }}>
    <MaterialCommunityIcons name={icon} size={16} color={COLORS.white} />
    <Text style={{ marginLeft: 6, fontWeight: '600', color: COLORS.white, ...TYPOGRAPHY.bodySmall }}>{label}</Text>
  </View>
);

export default BookingSlotScreen;
