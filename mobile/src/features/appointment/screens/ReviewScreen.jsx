import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, StatusBar, ScrollView, TextInput, Alert, Animated
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../services/api';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const StarPicker = ({ value, onChange }) => {
  const scaleAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const handlePress = (star) => {
    onChange(star);
    // Pop animation (ANIM-005)
    Animated.sequence([
      Animated.timing(scaleAnims[star - 1], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[star - 1], {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View 
      style={{ flexDirection: 'row', gap: 8 }}
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel="Pilih rating bintang dari 1 hingga 5"
    >
      {[1, 2, 3, 4, 5].map((star, index) => (
        <Animated.View key={star} style={{ transform: [{ scale: scaleAnims[index] }] }}>
          <TouchableOpacity
            onPress={() => handlePress(star)}
            activeOpacity={0.7}
            accessibilityLabel={`${star} dari 5 bintang`}
            accessibilityRole="radio"
            accessibilityState={{ checked: star === value, selected: star <= value }}
          >
            <MaterialCommunityIcons
              name={star <= value ? 'star' : 'star-outline'}
              size={36}
              color={star <= value ? COLORS.warning : COLORS.border}
            />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
};

const ratingLabels = {
  1: 'Sangat Buruk',
  2: 'Buruk',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik 🌟',
};

const ReviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    appointmentId,
    dentistId,
    dentistName = 'Dokter Gigi',
    dentistTitle = 'drg.',
    clinicBranchId = null,
  } = route.params || {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Penilaian Diperlukan', 'Silakan berikan bintang sebelum mengirim ulasan.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        appointmentId,
        dentistId,
        clinicBranchId,
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert(
        'Terima kasih! 🙏',
        'Ulasan Anda telah dikirim dan membantu pasien lain menemukan dokter terpercaya.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert('Gagal', 'Gagal mengirim ulasan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Two-letter initials from dentist name
  const initials = dentistName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 28,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: withOpacity(COLORS.white, 0.2),
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            accessibilityLabel="Kembali"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.surfaceElevated} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.caption }}>Kunjungan Selesai</Text>
            <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.h3 }}>Beri Ulasan</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dentist info card */}
        <View
          style={{
            alignItems: 'center',
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: COLORS.textPrimary,
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: withOpacity(COLORS.primary, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.primary }}>
              {initials}
            </Text>
          </View>
          <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary }}>
            {dentistTitle} {dentistName}
          </Text>
          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 4 }}>
            Bagaimana pengalaman Anda?
          </Text>
        </View>

        {/* Star rating card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 24,
            marginBottom: 16,
            alignItems: 'center',
            shadowColor: COLORS.textPrimary,
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary, marginBottom: 16 }}>
            Penilaian Anda
          </Text>
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 && (
            <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '700', color: COLORS.warning }}>
              {ratingLabels[rating]}
            </Text>
          )}
        </View>

        {/* Comment card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            shadowColor: COLORS.textPrimary,
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary, marginBottom: 12 }}>
            Komentar (opsional)
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            placeholder="Bagikan pengalaman Anda dengan dokter ini..."
            placeholderTextColor={COLORS.textMuted}
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 14,
              padding: 14,
              fontSize: 14,
              color: COLORS.textPrimary,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          activeOpacity={0.85}
          style={{
            backgroundColor: (submitting || rating === 0) ? COLORS.border : COLORS.primary,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
          }}
          accessibilityLabel={submitting ? 'Mengirim...' : 'Kirim Ulasan'}
          accessibilityRole="button"
        >
          <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.bodyLarge, fontWeight: '700' }}>
            {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 14, padding: 12, alignItems: 'center' }}
          activeOpacity={0.7}
          accessibilityLabel="Lewati Ulasan"
          accessibilityRole="button"
        >
          <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>Lewati Ulasan</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ReviewScreen;
