import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Platform } from 'react-native'; // Hapus SafeAreaView
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
import { updateProfile, updateUser, loginSuccess } from '../../../store/slices/authSlice';
import { getInitials } from '../../../utils/formatters';
import { updatePatientProfile, uploadPatientAvatar, getPatientProfile } from '../../../services/patientService';
import { resolveMediaUrl } from '../../../utils/media';

const EditProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user, patientProfile } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    // Personal Info
    dateOfBirth: patientProfile?.dateOfBirth 
      ? (() => {
          if (typeof patientProfile.dateOfBirth === 'string' && patientProfile.dateOfBirth.includes('-')) {
            const parts = patientProfile.dateOfBirth.split('T')[0].split('-');
            if (parts.length === 3) {
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }
          const date = new Date(patientProfile.dateOfBirth);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        })()
      : '',
    gender: patientProfile?.gender || 'female',
    
    // Address
    addressLine1: patientProfile?.address?.line1 || '',
    addressLine2: patientProfile?.address?.line2 || '',
    city: patientProfile?.address?.city || '',
    province: patientProfile?.address?.province || '',
    postalCode: patientProfile?.address?.postalCode || '',
    
    // Medical Details
    allergies: patientProfile?.medicalDetails?.allergies || [],
    chronicConditions: patientProfile?.medicalDetails?.chronicConditions || [],
    medications: patientProfile?.medicalDetails?.medications || [],
    medicalNotes: patientProfile?.medicalDetails?.notes || '',
    
    // Emergency Contact
    emergencyContactName: patientProfile?.emergencyContact?.name || '',
    emergencyContactPhone: patientProfile?.emergencyContact?.phone || '',
    emergencyContactRelationship: patientProfile?.emergencyContact?.relationship || '',
    
    // Insurance
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
  const [avatarUri, setAvatarUri] = useState(resolveMediaUrl(user?.avatar_url || null));
  const [avatarFile, setAvatarFile] = useState(null);
  
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
          message: 'Izin akses foto atau kamera diperlukan', 
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
      if (__DEV__) console.log('⚠️ Image picker error:', error.message);
      setSnackbar({ visible: true, message: 'Gagal memilih gambar.', status: 'error' });
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarMenuVisible(false);
    setAvatarUri(null);
    setAvatarFile(null);
  };

  const handleChange = (field, value) => {
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
      setSnackbar({ visible: true, message: 'Item sudah ada', status: 'warning' });
      return;
    }
    setForm((prev) => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    setValue('');
  };

  const removeFromArray = (field, index) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const validateForm = () => {
    const nextErrors = {};
    if (form.dateOfBirth.trim()) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(form.dateOfBirth.trim())) {
        nextErrors.dateOfBirth = 'Format tanggal tidak valid. Gunakan DD/MM/YYYY';
      }
    }
    return nextErrors;
  };

  const handleSave = async () => {
    const validationResult = validateForm();
    setErrors(validationResult);

    if (Object.keys(validationResult).length > 0) {
      setSnackbar({ visible: true, message: 'Mohon perbaiki kesalahan pada form', status: 'warning' });
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = user?.avatar_url;
      if (avatarFile) {
        const uploadResult = await uploadPatientAvatar(avatarFile);
        if (uploadResult.success) {
          avatarUrl = uploadResult.avatarUrl || uploadResult.data?.avatar_url;
          dispatch(updateUser({ avatar_url: avatarUrl }));
          try { setAvatarUri(resolveMediaUrl(avatarUrl)); } catch (e) {}
        } else {
          setSnackbar({ visible: true, message: 'Avatar gagal diupload', status: 'warning' });
        }
      }

      let dateOfBirth = null;
      if (form.dateOfBirth.trim()) {
        const parts = form.dateOfBirth.trim().split('/');
        dateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      const profileDataForBackend = {
        date_of_birth: dateOfBirth,
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
        medical_details: {
          allergies: form.allergies,
          chronicConditions: form.chronicConditions,
          medications: form.medications,
          notes: form.medicalNotes.trim() || null,
        },
        emergency_contact: form.emergencyContactName.trim() ? {
          name: form.emergencyContactName.trim(),
          phone: form.emergencyContactPhone.trim(),
          relationship: form.emergencyContactRelationship.trim(),
        } : null,
      };

      let backendSuccess = false;
      try {
        const result = await updatePatientProfile(profileDataForBackend);
        if (result.success) {
          backendSuccess = true;
          const profileResult = await getPatientProfile();
          if (profileResult.success && profileResult.data) {
            dispatch(loginSuccess({ 
              user: { ...user, avatar_url: avatarUrl },
              patientProfile: profileResult.data,
              tokens: { accessToken: null, refreshToken: null }
            }));
          }
        }
      } catch (backendError) {
        // Fallback local update
      }

      // Local Redux update fallback
      dispatch(updateProfile({
        ...profileDataForBackend,
        medicalDetails: profileDataForBackend.medical_details,
        emergencyContact: profileDataForBackend.emergency_contact
      }));

      setSnackbar({ 
        visible: true, 
        message: backendSuccess ? 'Profil berhasil diperbarui!' : 'Profil tersimpan di aplikasi',
        status: backendSuccess ? 'success' : 'warning'
      });

      setTimeout(() => { navigation.goBack(); }, 1500);

    } catch (error) {
      setSnackbar({ visible: true, message: 'Gagal memperbarui profil.', status: 'error' });
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
      
      {/* PERBAIKAN UTAMA:
         Gunakan View biasa dengan paddingTop manual dari insets.top
         Header akan turun dengan aman di bawah notch/status bar.
      */}
      <View style={{ backgroundColor: theme.colors.background, paddingTop: insets.top }}>
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
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, theme?.shadows?.md]}>
          <Card.Content>
            {/* Avatar Section */}
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
                <Menu.Item leadingIcon="camera" onPress={() => handlePickImage(true)} title="Ambil Foto" />
                <Menu.Item leadingIcon="image" onPress={() => handlePickImage(false)} title="Pilih dari Galeri" />
                {avatarUri && <Menu.Item leadingIcon="delete" onPress={handleRemoveAvatar} title="Hapus Foto" />}
              </Menu>
              <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
                {user?.name || 'Pasien Serene'}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* PERSONAL INFO */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Informasi Pribadi</Text>
            
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
              <HelperText type="error" visible={Boolean(errors.dateOfBirth)}>{errors.dateOfBirth}</HelperText>
            </View>

            <Text variant="labelLarge" style={styles.label}>Jenis Kelamin</Text>
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
            <Text variant="titleMedium" style={styles.sectionTitle}>Alamat Lengkap</Text>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Alamat Jalan"
                value={form.addressLine1}
                onChangeText={(text) => handleChange('addressLine1', text)}
                left={<TextInput.Icon icon="home" />}
              />
            </View>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Alamat Tambahan"
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
                  value={form.city}
                  onChangeText={(text) => handleChange('city', text)}
                  left={<TextInput.Icon icon="city" />}
                />
              </View>
              <View style={[styles.fieldSpacing, { flex: 1, marginLeft: 8 }]}>
                <TextInput
                  mode="outlined"
                  label="Provinsi"
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
                value={form.postalCode}
                onChangeText={(text) => handleChange('postalCode', text)}
                keyboardType="number-pad"
                left={<TextInput.Icon icon="mailbox" />}
              />
            </View>

            {/* MEDICAL */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Informasi Medis</Text>
            
            <Text variant="labelLarge" style={styles.label}>Alergi</Text>
            {renderChipList(form.allergies, 'allergies', 'rgba(239, 68, 68, 0.1)')}
            <View style={styles.addItemRow}>
              <TextInput
                mode="outlined"
                label="Tambah alergi"
                value={newAllergy}
                onChangeText={setNewAllergy}
                style={{ flex: 1, marginRight: 8 }}
                left={<TextInput.Icon icon="alert" />}
              />
              <Button mode="contained" onPress={() => addToArray('allergies', newAllergy, setNewAllergy)} disabled={!newAllergy.trim()}>Tambah</Button>
            </View>

            <Text variant="labelLarge" style={styles.label}>Kondisi Kronis</Text>
            {renderChipList(form.chronicConditions, 'chronicConditions', 'rgba(251, 146, 60, 0.1)')}
            <View style={styles.addItemRow}>
              <TextInput
                mode="outlined"
                label="Tambah kondisi"
                value={newCondition}
                onChangeText={setNewCondition}
                style={{ flex: 1, marginRight: 8 }}
                left={<TextInput.Icon icon="heart-pulse" />}
              />
              <Button mode="contained" onPress={() => addToArray('chronicConditions', newCondition, setNewCondition)} disabled={!newCondition.trim()}>Tambah</Button>
            </View>

            <Text variant="labelLarge" style={styles.label}>Obat Rutin</Text>
            {renderChipList(form.medications, 'medications', 'rgba(59, 130, 246, 0.1)')}
            <View style={styles.addItemRow}>
              <TextInput
                mode="outlined"
                label="Tambah obat"
                value={newMedication}
                onChangeText={setNewMedication}
                style={{ flex: 1, marginRight: 8 }}
                left={<TextInput.Icon icon="pill" />}
              />
              <Button mode="contained" onPress={() => addToArray('medications', newMedication, setNewMedication)} disabled={!newMedication.trim()}>Tambah</Button>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Catatan Medis"
                value={form.medicalNotes}
                onChangeText={(text) => handleChange('medicalNotes', text)}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="notebook" />}
              />
            </View>

            {/* EMERGENCY CONTACT */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Kontak Darurat</Text>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nama Kontak"
                value={form.emergencyContactName}
                onChangeText={(text) => handleChange('emergencyContactName', text)}
                left={<TextInput.Icon icon="account-heart" />}
              />
            </View>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nomor Telepon"
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
                value={form.emergencyContactRelationship}
                onChangeText={(text) => handleChange('emergencyContactRelationship', text)}
                left={<TextInput.Icon icon="account-group" />}
              />
            </View>

            {/* INSURANCE */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Informasi Asuransi</Text>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Provider Asuransi"
                value={form.insuranceProvider}
                onChangeText={(text) => handleChange('insuranceProvider', text)}
                left={<TextInput.Icon icon="shield-home" />}
              />
            </View>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nomor Polis"
                value={form.insuranceNumber}
                onChangeText={(text) => handleChange('insuranceNumber', text)}
                left={<TextInput.Icon icon="card-text-outline" />}
              />
            </View>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Member ID"
                value={form.insuranceMemberId}
                onChangeText={(text) => handleChange('insuranceMemberId', text)}
                left={<TextInput.Icon icon="identifier" />}
              />
            </View>

            {/* BUTTONS */}
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