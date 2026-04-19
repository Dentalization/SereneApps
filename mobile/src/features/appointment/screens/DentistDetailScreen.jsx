import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar, Linking } from 'react-native';
import { Text, useTheme, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDentistById } from '../../../services/dentistService';
import { API_BASE_URL } from '../../../services/api';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const formatRupiah = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const Section = ({ title, children, action, style }) => (
  <View
    style={[
      {
        marginBottom: 24,
      },
      style,
    ]}
  >
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary }}>{title}</Text>
      {action || null}
    </View>
    {children}
  </View>
);

const DICEBEAR_BG = encodeURIComponent('8B5CF6,A78BFA,C4B5FD,DDD6FE');
const API_BASE = API_BASE_URL.replace(/\/$/, '');

const normalizeDicebear = (url = '', fallbackSeed) => {
  if (!url || typeof url !== 'string') {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed || 'dentist'}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  if (!url.includes('dicebear.com')) {
    return url;
  }
  return url.replace('/svg', '/png').replace('format=svg', 'format=png');
};

const resolveAvatar = (path, fallbackSeed) => {
  if (!path || typeof path !== 'string') {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed || 'dentist'}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  if (/^https?:\/\//i.test(path)) {
    return normalizeDicebear(path, fallbackSeed);
  }
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE}/${normalized}`;
};

const DentistDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const initialDentist = route.params?.dentist || null;
  const [dentist, setDentist] = useState(initialDentist);
  const [loading, setLoading] = useState(!initialDentist);
  const [error, setError] = useState(null);

  const { toast, showToast, hideToast } = useToast();

  const dentistId = route.params?.dentistId || initialDentist?.id;
  const isLiveDentistId = /^\d+$/.test(dentistId?.toString?.() || '');

  useEffect(() => {
    let ignore = false;
    const fetchDentistDetail = async () => {
      if (!dentistId) {
        setError('ID dokter tidak ditemukan');
        setLoading(false);
        return;
      }

      if (!isLiveDentistId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🦷 [DentistDetail] Fetching dentist:', dentistId);
        const response = await getDentistById(dentistId);
        console.log('🦷 [DentistDetail] Response:', response);

        // Backend returns { success: true, data: {...} }
        const dentistData = response?.data || response;

        if (!dentistData) {
          throw new Error('Data dokter tidak ditemukan');
        }

        // Parse working hours if it's a string
        let workingHours = dentistData.clinic_working_hours;
        if (typeof workingHours === 'string') {
          try {
            workingHours = JSON.parse(workingHours);
          } catch (e) {
            workingHours = null;
          }
        }

        // Map backend data to component format
        const clinicsList = Array.isArray(dentistData.clinics) ? dentistData.clinics : [];
        const primaryClinic = clinicsList.find((c) => c.is_active) || clinicsList[0];
        const clinicContext = primaryClinic
          ? {
              profileId: primaryClinic.id?.toString?.(),
              branchId:
                (primaryClinic.assigned_branch_id ||
                  primaryClinic.branch_id ||
                  primaryClinic.branchId ||
                  primaryClinic.assignedBranchId)?.toString?.() || null,
              name: primaryClinic.branch_name || primaryClinic.name || dentistData.clinic_name,
              address: primaryClinic.branch_address || primaryClinic.address || dentistData.clinic_address,
              phone: primaryClinic.branch_phone || primaryClinic.phone_number,
            }
          : dentistData.clinic_name
          ? {
              profileId: dentistData.clinic_profile_id?.toString?.() || dentistData.clinic_id?.toString?.() || null,
              branchId: null,
              name: dentistData.clinic_name,
              address: dentistData.clinic_address,
            }
          : null;
        const resolvedClinicContext =
          clinicContext ||
          initialDentist?.clinicContext ||
          (dentistData.clinic_id
            ? {
                profileId: dentistData.clinic_id?.toString?.() || null,
                branchId: null,
                name: dentistData.clinic_name,
                address: dentistData.clinic_address,
              }
            : null);

        const mappedDentist = {
          id: dentistData.id || dentistData.user_id,
          name: dentistData.name,
          specialty: dentistData.specialization,
          title: dentistData.title,
          image: resolveAvatar(dentistData.avatarUrl || dentistData.avatar_url, dentistData.id),
          rating: 4.8, // TODO: Get from reviews table
          reviews: 0, // TODO: Get from reviews table
          experience: `${dentistData.years_of_experience || 0} tahun`,
          languages: ['Bahasa Indonesia', 'English'], // TODO: Add to backend
          bio: `Dokter gigi profesional dengan spesialisasi ${dentistData.specialization}. Berpengalaman ${
            dentistData.years_of_experience || 0
          } tahun dalam memberikan perawatan gigi berkualitas.`,
          specialties: dentistData.services_offered || [],
          services: (dentistData.services_offered || []).map((service) => ({
            name: service,
            price: dentistData.consultation_fee,
          })),
          availability: workingHours
            ? Object.entries(workingHours).map(([day, hours]) => ({
                day: day.charAt(0).toUpperCase() + day.slice(1),
                slots: hours === 'Tutup' ? [] : [hours.split('-')[0]],
              }))
            : [],
          achievements: dentistData.is_verified
            ? [
                {
                  title: 'Dokter Terverifikasi',
                  year: new Date(dentistData.verification_date || dentistData.created_at).getFullYear(),
                },
              ]
            : [],
          stories: [], // TODO: Get from reviews
          gallery: [], // TODO: Add to backend
          contact: {
            phone: dentistData.phone_number,
            email: dentistData.email,
            address: dentistData.clinic_address,
          },
          clinic: resolvedClinicContext?.name || dentistData.clinic_name,
          clinicAddress: dentistData.clinic_address,
          clinicContext: resolvedClinicContext,
          price: dentistData.consultation_fee,
          consultationTypes: dentistData.consultation_types || [],
          acceptsInsurance: dentistData.accepts_insurance,
          acceptsBpjs: dentistData.accepts_bpjs,
          emergencyAvailable: dentistData.emergency_availability,
          isVerified: dentistData.is_verified,
          licenseNumber: dentistData.license_number,
          registrationNumber: dentistData.registration_number,
          patientsHelped: Math.floor(Math.random() * 1000) + 500, // TODO: Add to backend
          responseTime: '2 jam', // TODO: Add to backend
        };

        if (!ignore) {
          setDentist(mappedDentist);
          setError(null);
        }
      } catch (err) {
        console.log('🔍 [DentistDetail] Error fetching dentist:', err.message);
        if (!ignore) {
          setError(err.message || 'Gagal memuat detail dokter');
          showToast('Gagal memuat data dokter', 'error');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchDentistDetail();
    return () => {
      ignore = true;
    };
  }, [dentistId, isLiveDentistId]);

  const distanceText =
    route.params?.dentist?.distance ??
    (typeof route.params?.dentist?.distanceKm === 'number'
      ? `${route.params.dentist.distanceKm.toFixed(1)} km`
      : typeof dentist?.clinicContext?.distance === 'number'
      ? `${dentist.clinicContext.distance.toFixed(1)} km`
      : dentist?.clinicContext?.distance || null);

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(360);

  const appendClinicContext = {
    clinicContext: dentist?.clinicContext,
    clinicId: dentist?.clinicContext?.profileId,
    clinicBranchId: dentist?.clinicContext?.branchId,
  };

  const handleBook = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist?.id, dentist, ...appendClinicContext },
    });

  const handleMessage = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist?.id, dentist, ...appendClinicContext },
    });

  const handleCall = () => {
    if (dentist?.contact?.phone) {
      Linking.openURL(`tel:${dentist.contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (dentist?.contact?.email) {
      Linking.openURL(`mailto:${dentist.contact.email}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ ...TYPOGRAPHY.bodySmall, marginTop: 12, color: COLORS.textSecondary }}>Memuat detail dokter...</Text>
      </View>
    );
  }

  if (error || !dentist) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.surface,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={{ marginTop: 16, ...TYPOGRAPHY.h3, color: COLORS.textPrimary }}>
          Gagal Memuat Data
        </Text>
        <Text style={{ marginTop: 8, color: COLORS.textSecondary, textAlign: 'center', ...TYPOGRAPHY.bodySmall }}>
          {error || 'Data dokter tidak ditemukan'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 20,
            backgroundColor: COLORS.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statCard = (label, value, icon) => (
    <View
      key={label}
      style={{
        flex: 1,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: 18,
        padding: 14,
        marginRight: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: withOpacity(COLORS.primary, 0.1),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 2,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: withOpacity(COLORS.white, 0.2),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={{ color: COLORS.white, ...TYPOGRAPHY.h3 }}>Profil Dokter</Text>
            <TouchableOpacity
              onPress={handleMessage}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: withOpacity(COLORS.white, 0.25),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="message-text" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={{ uri: dentist.image }}
              style={{ width: 96, height: 96, borderRadius: 28, marginRight: 16 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.white, ...TYPOGRAPHY.h2 }}>{dentist.name}</Text>
              <Text style={{ color: withOpacity(COLORS.white, 0.85), ...TYPOGRAPHY.body, marginTop: 4 }}>
                {dentist.specialty}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <MaterialCommunityIcons name="star" color={COLORS.warning} size={18} />
                <Text style={{ color: COLORS.white, marginLeft: 6, fontWeight: '600', ...TYPOGRAPHY.bodySmall }}>
                  {(dentist.rating || 0).toFixed(1)} · {dentist.reviews || 0} ulasan
                </Text>
              </View>
              {distanceText ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <MaterialCommunityIcons name="map-marker-distance" color={COLORS.white} size={16} />
                  <Text style={{ color: COLORS.white, marginLeft: 4, ...TYPOGRAPHY.caption }}>
                    {distanceText} • {dentist.clinic}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <TouchableOpacity
              onPress={handleBook}
              style={{
                flex: 1,
                backgroundColor: COLORS.white,
                paddingVertical: 12,
                borderRadius: 20,
                alignItems: 'center',
                marginRight: 10,
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="calendar-check" size={20} color={COLORS.primary} />
              <Text style={{ marginLeft: 8, fontWeight: '700', color: COLORS.primary, ...TYPOGRAPHY.body }}>
                Pesan Jadwal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMessage}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: withOpacity(COLORS.white, 0.25),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="phone" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            {[
              statCard('Pengalaman', dentist.experience || '—', 'medal-outline'),
              statCard('Pasien terbantu', dentist.patientsHelped || '1.200+', 'account-group'),
              statCard('Respon rata-rata', dentist.responseTime || '<2 jam', 'clock-fast'),
            ]}
          </ScrollView>

          <Section title="Tentang Dokter" style={{ marginTop: 24 }}>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, lineHeight: 22 }}>{dentist.bio}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
              {dentist.languages?.map((lang) => (
                <Chip key={lang} style={{ marginRight: 8, marginBottom: 8 }} textStyle={{ fontWeight: '600' }}>
                  {lang}
                </Chip>
              ))}
            </View>
          </Section>

          <Section title="Spesialisasi">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {dentist.specialties?.map((item) => (
                <View
                  >
                  <Text style={{ color: COLORS.primary, fontWeight: '600', ...TYPOGRAPHY.bodySmall }}>{item}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Layanan">
            {dentist.services?.map((service) => (
              <View
                key={service.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ fontWeight: '600', color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall }}>{service.name}</Text>
                <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>{formatRupiah(service.price)}</Text>
              </View>
            ))}
          </Section>

          <Section title="Ketersediaan Jadwal">
              <View
                key={slot.day}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontWeight: '600', color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall }}>{slot.day}</Text>
                <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>{slot.slots.join(' • ')}</Text>
              </View>
            ))}
          </Section>

          <Section title="Pencapaian">
            {dentist.achievements?.map((ach) => (
              <View key={ach.title} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <MaterialCommunityIcons name="trophy" size={18} color={COLORS.warning} />
                <Text style={{ marginLeft: 10, fontWeight: '600', color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall }}>{ach.title}</Text>
                <Text style={{ marginLeft: 6, color: COLORS.textMuted, ...TYPOGRAPHY.caption }}>{ach.year}</Text>
              </View>
            ))}
          </Section>

          <Section title="Cerita Pasien">
            {dentist.stories?.map((story) => (
              <View
                key={story.patient}
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: COLORS.textPrimary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name="account-circle" size={26} color={COLORS.textMuted} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontWeight: '600', color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall }}>{story.patient}</Text>
                    <Text style={{ color: COLORS.warning, fontWeight: '600', ...TYPOGRAPHY.caption }}>{story.rating} ★</Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>{story.summary}</Text>
              </View>
            ))}
          </Section>

          <Section title="Galeri">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dentist.gallery?.map((url, index) => (
                <Image
                  key={`${url}-${index}`}
                  source={{ uri: url }}
                  style={{ width: 160, height: 120, borderRadius: 16, marginRight: 12 }}
                />
              ))}
            </ScrollView>
          </Section>

          <Section title="Kontak">
            <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 18, padding: 16 }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <MaterialCommunityIcons name="phone" size={18} color={COLORS.primary} />
                <Text style={{ marginLeft: 8, color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>{dentist.contact?.phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <MaterialCommunityIcons name="email" size={18} color={COLORS.primary} />
                <Text style={{ marginLeft: 8, color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>{dentist.contact?.email}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.primary} />
                <Text style={{ marginLeft: 8, color: COLORS.textSecondary, flex: 1, ...TYPOGRAPHY.bodySmall }}>{dentist.contact?.address}</Text>
              </View>
            </View>
          </Section>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
              padding: 20,
          backgroundColor: withOpacity(COLORS.surface, 0.95),
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: COLORS.textPrimary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textMuted, ...TYPOGRAPHY.caption }}>Konsultasi mulai dari</Text>
            <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary }}>
              {formatRupiah(dentist.price)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleBook}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.primary,
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 24,
            }}
          >
            <MaterialCommunityIcons name="calendar-plus" size={20} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontWeight: '700', marginLeft: 8, ...TYPOGRAPHY.body }}>Pesan sekarang</Text>
          </TouchableOpacity>
        </View>
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

export default DentistDetailScreen;
