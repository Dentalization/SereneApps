import React, { useState, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
  HelperText,
  SegmentedButtons,
  useTheme,
  Chip,
  Menu,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ValidationToast from '../components/ValidationToast';
import { updateProfile, updateUser } from '../../../store/slices/authSlice';
import { getInitials } from '../../../utils/formatters';
import { updatePatientProfile, uploadPatientAvatar } from '../../../services/patientService';

const EditProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user, patientProfile } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    // Personal Info
    dateOfBirth: patientProfile?.dateOfBirth 
      ? (() => {
          // Convert YYYY-MM-DD to DD/MM/YYYY for display
          const date = new Date(patientProfile.dateOfBirth);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        })()
      : '',
    gender: patientProfile?.gender || 'female',
    
    // Address (JSONB field in database)
    addressLine1: patientProfile?.address?.line1 || '',
    addressLine2: patientProfile?.address?.line2 || '',
    city: patientProfile?.address?.city || '',
    province: patientProfile?.address?.province || '',
    postalCode: patientProfile?.address?.postalCode || '',
    
    // Medical Details (JSONB field in database)
    allergies: patientProfile?.medicalDetails?.allergies || [],
    chronicConditions: patientProfile?.medicalDetails?.chronicConditions || [],
    medications: patientProfile?.medicalDetails?.medications || [],
    medicalNotes: patientProfile?.medicalDetails?.notes || '',
    
    // Emergency Contact (JSONB field in database)
    emergencyContactName: patientProfile?.emergencyContact?.name || '',
    emergencyContactPhone: patientProfile?.emergencyContact?.phone || '',
    emergencyContactRelationship: patientProfile?.emergencyContact?.relationship || '',
    
    // Insurance (separate columns in database: insurance_provider, insurance_number, insurance_member_id)
    insuranceProvider: patientProfile?.insurance_provider || '',
    insuranceNumber: patientProfile?.insurance_number || '',
    insuranceMemberId: patientProfile?.insurance_member_id || '',
    
    // Preferred Language
    preferredLanguage: patientProfile?.preferred_language || 'id',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', status: 'info' });
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [avatarUri, setAvatarUri] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  
  // Temporary input states for adding items to arrays
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');

  const handlePickImage = async (useCamera = false) => {
    setAvatarMenuVisible(false);
    
    try {
      const { status } = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setSnackbar({ 
          visible: true, 
          message: 'Izin akses foto atau kamera diperlukan untuk mengubah avatar', 
          status: 'warning' 
        });
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setAvatarUri(imageUri);
        
        // Prepare file for upload
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        setAvatarFile({
          uri: imageUri,
          name: filename,
          type: type,
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('⚠️ Image picker error:', error.message);
      }
      setSnackbar({ 
        visible: true, 
        message: 'Gagal memilih gambar. Silakan coba lagi', 
        status: 'error' 
      });
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarMenuVisible(false);
    setAvatarUri(null);
    setAvatarFile(null);
  };

  const handleChange = (field, value) => {
    // Auto-format date of birth input
    if (field === 'dateOfBirth') {
      const digits = value.replace(/\D/g, '');
      let formatted = digits;
      if (digits.length >= 2) {
        formatted = digits.slice(0, 2);
        if (digits.length >= 4) {
          formatted += '/' + digits.slice(2, 4);
          if (digits.length >= 5) {
            formatted += '/' + digits.slice(4, 8);
          }
        } else if (digits.length > 2) {
          formatted += '/' + digits.slice(2);
        }
      }
      setForm((prev) => ({ ...prev, [field]: formatted }));
      return;
    }
    
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addToArray = (field, value, setValue) => {
    if (!value.trim()) return;
    
    if (form[field].includes(value.trim())) {
      setSnackbar({ 
        visible: true, 
        message: 'Item sudah ada dalam daftar', 
        status: 'warning' 
      });
      return;
    }
    
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    setValue('');
  };

  const removeFromArray = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    // Validate dateOfBirth if provided
    if (form.dateOfBirth.trim()) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(form.dateOfBirth.trim())) {
        nextErrors.dateOfBirth = 'Format tanggal tidak valid. Gunakan DD/MM/YYYY';
      } else {
        const parts = form.dateOfBirth.trim().split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        
        if (
          isNaN(date.getTime()) ||
          date.getDate() !== day ||
          date.getMonth() !== month ||
          date.getFullYear() !== year
        ) {
          nextErrors.dateOfBirth = 'Tanggal tidak valid';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date > today) {
            nextErrors.dateOfBirth = 'Tanggal lahir tidak boleh di masa depan';
          }
          const age = (today - date) / (1000 * 60 * 60 * 24 * 365.25);
          if (age > 150) {
            nextErrors.dateOfBirth = 'Tanggal lahir tidak valid';
          }
        }
      }
    }

    return nextErrors;
  };

  const handleSave = async () => {
    const validationResult = validateForm();
    setErrors(validationResult);

    if (Object.keys(validationResult).length > 0) {
      setSnackbar({ 
        visible: true, 
        message: 'Mohon perbaiki kesalahan pada form', 
        status: 'warning' 
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Upload avatar first if changed
      let avatarUrl = user?.avatar_url;
      if (avatarFile) {
        const uploadResult = await uploadPatientAvatar(avatarFile);
        
        if (uploadResult.success) {
          avatarUrl = uploadResult.data.avatar_url;
          console.log('✅ Avatar uploaded:', avatarUrl);
          
          // Update user in Redux with new avatar
          dispatch(updateUser({ avatar_url: avatarUrl }));
        } else {
          if (__DEV__) {
            console.log('⚠️ Avatar upload failed:', uploadResult.message);
          }
          
          // Show specific error message based on error type
          let errorMessage = 'Avatar gagal diupload';
          if (uploadResult.needsReauth) {
            errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali';
          } else if (uploadResult.message) {
            errorMessage = uploadResult.message;
          }
          
          setSnackbar({ 
            visible: true, 
            message: errorMessage,
            status: uploadResult.needsReauth ? 'error' : 'warning'
          });
          
          // Don't continue if authentication failed
          if (uploadResult.needsReauth) {
            setLoading(false);
            return;
          }
        }
      }

      // 2. Convert DD/MM/YYYY to YYYY-MM-DD for backend
      let dateOfBirth = null;
      if (form.dateOfBirth.trim()) {
        const parts = form.dateOfBirth.trim().split('/');
        dateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // 3. Prepare profile data for BACKEND (snake_case for database columns)
      const profileDataForBackend = {
        // Direct columns in patient_profiles table (snake_case)
        date_of_birth: dateOfBirth,
        gender: form.gender.toLowerCase(),
        insurance_provider: form.insuranceProvider.trim() || null,
        insurance_number: form.insuranceNumber.trim() || null,
        insurance_member_id: form.insuranceMemberId.trim() || null,
        preferred_language: form.preferredLanguage || 'id',
        
        // JSONB fields (backend expects these exact structures)
        address: {
          line1: form.addressLine1.trim() || null,
          line2: form.addressLine2.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          postalCode: form.postalCode.trim() || null,
        },
        medical_details: {
          allergies: form.allergies.length > 0 ? form.allergies : [],
          chronicConditions: form.chronicConditions.length > 0 ? form.chronicConditions : [],
          medications: form.medications.length > 0 ? form.medications : [],
          notes: form.medicalNotes.trim() || null,
        },
        emergency_contact: form.emergencyContactName.trim() ? {
          name: form.emergencyContactName.trim(),
          phone: form.emergencyContactPhone.trim(),
          relationship: form.emergencyContactRelationship.trim(),
        } : null,
      };

      console.log('📤 Sending to backend:', profileDataForBackend);

      // 4. Call backend API to update profile
      let backendSuccess = false;
      
      try {
        const result = await updatePatientProfile(profileDataForBackend);
        
        if (result.success) {
          console.log('✅ Backend updated successfully!');
          backendSuccess = true;
        } else {
          console.warn('⚠️ Backend update failed:', result.message);
          console.warn('⚠️ Continuing with local update only...');
        }
      } catch (backendError) {
        console.warn('⚠️ Backend endpoint not ready:', backendError.message);
        console.warn('⚠️ Saving to local Redux only. Please implement backend endpoint:');
        console.warn('   PUT /v1/patient/profile');
        // Continue to save locally even if backend fails
      }

      // 5. Prepare data for REDUX (camelCase format)
      const profileDataForRedux = {
        dateOfBirth: dateOfBirth,
        gender: form.gender.toLowerCase(),
        insurance_provider: form.insuranceProvider.trim() || null,
        insurance_number: form.insuranceNumber.trim() || null,
        insurance_member_id: form.insuranceMemberId.trim() || null,
        preferred_language: form.preferredLanguage || 'id',
        address: {
          line1: form.addressLine1.trim() || null,
          line2: form.addressLine2.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          postalCode: form.postalCode.trim() || null,
        },
        medicalDetails: {
          allergies: form.allergies.length > 0 ? form.allergies : [],
          chronicConditions: form.chronicConditions.length > 0 ? form.chronicConditions : [],
          medications: form.medications.length > 0 ? form.medications : [],
          notes: form.medicalNotes.trim() || null,
        },
        emergencyContact: form.emergencyContactName.trim() ? {
          name: form.emergencyContactName.trim(),
          phone: form.emergencyContactPhone.trim(),
          relationship: form.emergencyContactRelationship.trim(),
        } : null,
      };

      // 6. Update Redux store
      dispatch(updateProfile(profileDataForRedux));

      const successMessage = backendSuccess 
        ? 'Profil berhasil diperbarui!' 
        : 'Profil tersimpan di aplikasi (belum sinkron ke server)';

      setSnackbar({ 
        visible: true, 
        message: successMessage,
        status: backendSuccess ? 'success' : 'warning'
      });

      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
      if (__DEV__) {
        console.log('⚠️ Profile update error:', error.message);
      }
      setSnackbar({ 
        visible: true, 
        message: error.message || 'Gagal memperbarui profil. Silakan coba lagi.',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderChipList = (items, field, color) => {
    if (items.length === 0) {
      return (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 16 }}>
          Belum ada data
        </Text>
      );
    }

    return (
      <View style={styles.chipContainer}>
        {items.map((item, index) => (
          <Chip
            key={index}
            mode="flat"
            style={[styles.chip, { backgroundColor: color }]}
            onClose={() => removeFromArray(field, index)}
          >
            {item}
          </Chip>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Back Button Header */}
      <SafeAreaView style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.topHeader}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text variant="titleLarge" style={styles.topHeaderTitle}>
            Edit Profil
          </Text>
          <View style={{ width: 48 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, theme?.shadows?.md]}>
          <Card.Content>
            {/* Avatar Upload Section */}
            <View style={styles.avatarSection}>
              <Menu
                visible={avatarMenuVisible}
                onDismiss={() => setAvatarMenuVisible(false)}
                anchor={
                  <TouchableOpacity 
                    onPress={() => setAvatarMenuVisible(true)}
                    style={styles.avatarContainer}
                  >
                    {avatarUri ? (
                      <Avatar.Image size={100} source={{ uri: avatarUri }} />
                    ) : (
                      <Avatar.Text 
                        size={100} 
                        label={getInitials(user?.name || 'User')}
                        style={{ backgroundColor: theme.colors.primaryContainer }}
                      />
                    )}
                    <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary }]}>
                      <MaterialCommunityIcons name="camera" size={20} color="white" />
                    </View>
                  </TouchableOpacity>
                }
              >
                <Menu.Item 
                  leadingIcon="camera" 
                  onPress={() => handlePickImage(true)} 
                  title="Ambil Foto" 
                />
                <Menu.Item 
                  leadingIcon="image" 
                  onPress={() => handlePickImage(false)} 
                  title="Pilih dari Galeri" 
                />
                {avatarUri && (
                  <Menu.Item 
                    leadingIcon="delete" 
                    onPress={handleRemoveAvatar} 
                    title="Hapus Foto" 
                  />
                )}
              </Menu>
              <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
                {user?.name || 'Pasien Serene'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Ketuk avatar untuk mengubah foto
              </Text>
            </View>

            <View style={styles.divider} />

            {/* PERSONAL INFORMATION */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Informasi Pribadi
            </Text>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Tanggal lahir"
                placeholder="15/08/1995"
                value={form.dateOfBirth}
                onChangeText={(text) => handleChange('dateOfBirth', text)}
                keyboardType="number-pad"
                maxLength={10}
                left={<TextInput.Icon icon="calendar" />}
                error={Boolean(errors.dateOfBirth)}
              />
              <HelperText type="info" visible={!errors.dateOfBirth && !form.dateOfBirth}>
                Format: DD/MM/YYYY (contoh: 15/08/1995)
              </HelperText>
              <HelperText type="error" visible={Boolean(errors.dateOfBirth)}>
                {errors.dateOfBirth}
              </HelperText>
            </View>

            <Text variant="labelLarge" style={styles.label}>
              Jenis Kelamin
            </Text>
            <SegmentedButtons
              value={form.gender}
              onValueChange={(value) => handleChange('gender', value)}
              buttons={[
                { value: 'female', label: 'Perempuan', icon: 'gender-female' },
                { value: 'male', label: 'Laki-laki', icon: 'gender-male' },
                { value: 'other', label: 'Lainnya', icon: 'gender-transgender' },
              ]}
              style={styles.segmented}
            />

            {/* ADDRESS */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Alamat Lengkap
            </Text>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Alamat Jalan"
                placeholder="Jl. Merdeka No. 123"
                value={form.addressLine1}
                onChangeText={(text) => handleChange('addressLine1', text)}
                left={<TextInput.Icon icon="home" />}
              />
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Alamat Tambahan (Opsional)"
                placeholder="Apt 5B, Lt. 2"
                value={form.addressLine2}
                onChangeText={(text) => handleChange('addressLine2', text)}
                left={<TextInput.Icon icon="home-city" />}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldSpacing, { flex: 1, marginRight: 8 }]}>
                <TextInput
                  mode="outlined"
                  label="Kota"
                  placeholder="Jakarta"
                  value={form.city}
                  onChangeText={(text) => handleChange('city', text)}
                  left={<TextInput.Icon icon="city" />}
                />
              </View>

              <View style={[styles.fieldSpacing, { flex: 1, marginLeft: 8 }]}>
                <TextInput
                  mode="outlined"
                  label="Provinsi"
                  placeholder="DKI Jakarta"
                  value={form.province}
                  onChangeText={(text) => handleChange('province', text)}
                  left={<TextInput.Icon icon="map" />}
                />
              </View>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Kode Pos"
                placeholder="12720"
                value={form.postalCode}
                onChangeText={(text) => handleChange('postalCode', text)}
                keyboardType="number-pad"
                maxLength={5}
                left={<TextInput.Icon icon="mailbox" />}
              />
            </View>

            {/* MEDICAL DETAILS */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Informasi Medis
            </Text>

            <Text variant="labelLarge" style={styles.label}>
              Alergi
            </Text>
            {renderChipList(form.allergies, 'allergies', 'rgba(239, 68, 68, 0.1)')}
            <View style={styles.addItemRow}>
              <TextInput
                mode="outlined"
                label="Tambah alergi"
                placeholder="contoh: Penisilin"
                value={newAllergy}
                onChangeText={setNewAllergy}
                style={{ flex: 1, marginRight: 8 }}
                left={<TextInput.Icon icon="alert" />}
              />
              <Button
                mode="contained"
                onPress={() => addToArray('allergies', newAllergy, setNewAllergy)}
                disabled={!newAllergy.trim()}
              >
                Tambah
              </Button>
            </View>

            <Text variant="labelLarge" style={styles.label}>
              Kondisi Kronis
            </Text>
            {renderChipList(form.chronicConditions, 'chronicConditions', 'rgba(251, 146, 60, 0.1)')}
            <View style={styles.addItemRow}>
              <TextInput
                mode="outlined"
                label="Tambah kondisi"
                placeholder="contoh: Diabetes"
                value={newCondition}
                onChangeText={setNewCondition}
                style={{ flex: 1, marginRight: 8 }}
                left={<TextInput.Icon icon="heart-pulse" />}
              />
              <Button
                mode="contained"
                onPress={() => addToArray('chronicConditions', newCondition, setNewCondition)}
                disabled={!newCondition.trim()}
              >
                Tambah
              </Button>
            </View>

            <Text variant="labelLarge" style={styles.label}>
              Obat Rutin
            </Text>
            {renderChipList(form.medications, 'medications', 'rgba(59, 130, 246, 0.1)')}
            <View style={styles.addItemRow}>
              <TextInput
                mode="outlined"
                label="Tambah obat"
                placeholder="contoh: Metformin 500mg"
                value={newMedication}
                onChangeText={setNewMedication}
                style={{ flex: 1, marginRight: 8 }}
                left={<TextInput.Icon icon="pill" />}
              />
              <Button
                mode="contained"
                onPress={() => addToArray('medications', newMedication, setNewMedication)}
                disabled={!newMedication.trim()}
              >
                Tambah
              </Button>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Catatan Medis"
                placeholder="Informasi medis tambahan yang perlu diketahui dokter"
                value={form.medicalNotes}
                onChangeText={(text) => handleChange('medicalNotes', text)}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="notebook" />}
              />
            </View>

            {/* EMERGENCY CONTACT */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Kontak Darurat
            </Text>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nama Kontak Darurat"
                placeholder="Sarah Putri"
                value={form.emergencyContactName}
                onChangeText={(text) => handleChange('emergencyContactName', text)}
                left={<TextInput.Icon icon="account-heart" />}
              />
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nomor Telepon Kontak Darurat"
                placeholder="+6281234567890"
                value={form.emergencyContactPhone}
                onChangeText={(text) => handleChange('emergencyContactPhone', text)}
                keyboardType="phone-pad"
                left={<TextInput.Icon icon="phone" />}
              />
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Hubungan"
                placeholder="Suami/Istri, Orang Tua, Saudara, dll"
                value={form.emergencyContactRelationship}
                onChangeText={(text) => handleChange('emergencyContactRelationship', text)}
                left={<TextInput.Icon icon="account-group" />}
              />
            </View>

            {/* INSURANCE */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Informasi Asuransi
            </Text>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Provider Asuransi"
                placeholder="BPJS Kesehatan, Prudential, dll"
                value={form.insuranceProvider}
                onChangeText={(text) => handleChange('insuranceProvider', text)}
                left={<TextInput.Icon icon="shield-home" />}
              />
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nomor Polis"
                placeholder="00011223344"
                value={form.insuranceNumber}
                onChangeText={(text) => handleChange('insuranceNumber', text)}
                left={<TextInput.Icon icon="card-text-outline" />}
              />
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Member ID"
                placeholder="PLAT-9912"
                value={form.insuranceMemberId}
                onChangeText={(text) => handleChange('insuranceMemberId', text)}
                left={<TextInput.Icon icon="identifier" />}
              />
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={[styles.button, { flex: 1, marginRight: 8 }]}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={[styles.button, { flex: 1, marginLeft: 8 }]}
              >
                Simpan
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <ValidationToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '', status: 'info' })}
        status={snackbar.status}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topHeaderTitle: {
    fontWeight: '700',
  },
  content: {
    paddingVertical: 16,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 28,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
  },
  fieldSpacing: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  segmented: {
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  button: {
    borderRadius: 12,
  },
});

export default EditProfileScreen;
