import React, { useMemo, useState } from 'react';
import AdminSideBar from '../../ui/sidebar-admin';
import AppIcon from '../../../../components/AppIcon';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import { authHttp } from '../../../../utils/httpClient';
import ModalPortal from '../../../../components/ui/ModalPortal';

const CreateClinic = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Geolocation state
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Indonesian Cities with coordinates (same as Register.jsx)
  const indonesianCities = [
    // DKI Jakarta
    { name: 'Jakarta Pusat', province: 'DKI Jakarta', lat: -6.1944, lng: 106.8229 },
    { name: 'Jakarta Selatan', province: 'DKI Jakarta', lat: -6.2424, lng: 106.7991 },
    { name: 'Jakarta Utara', province: 'DKI Jakarta', lat: -6.1555, lng: 106.8994 },
    { name: 'Jakarta Barat', province: 'DKI Jakarta', lat: -6.1867, lng: 106.7674 },
    { name: 'Jakarta Timur', province: 'DKI Jakarta', lat: -6.1783, lng: 106.9364 },
    // Major Cities
    { name: 'Surabaya', province: 'Jawa Timur', lat: -7.2754, lng: 112.7378 },
    { name: 'Bandung', province: 'Jawa Barat', lat: -6.9175, lng: 107.6191 },
    { name: 'Medan', province: 'Sumatera Utara', lat: 3.5952, lng: 98.6722 },
    { name: 'Semarang', province: 'Jawa Tengah', lat: -6.9667, lng: 110.4167 },
    { name: 'Makassar', province: 'Sulawesi Selatan', lat: -5.1477, lng: 119.4327 },
    { name: 'Palembang', province: 'Sumatera Selatan', lat: -2.9761, lng: 104.7754 },
    { name: 'Tangerang', province: 'Banten', lat: -6.1783, lng: 106.6319 },
    { name: 'Depok', province: 'Jawa Barat', lat: -6.4025, lng: 106.7942 },
    { name: 'Bekasi', province: 'Jawa Barat', lat: -6.2383, lng: 106.9756 },
    { name: 'Yogyakarta', province: 'DI Yogyakarta', lat: -7.7956, lng: 110.3695 },
    { name: 'Malang', province: 'Jawa Timur', lat: -7.9666, lng: 112.6326 },
    { name: 'Denpasar', province: 'Bali', lat: -8.6705, lng: 115.2126 },
    { name: 'Balikpapan', province: 'Kalimantan Timur', lat: -1.2379, lng: 116.8529 },
    { name: 'Batam', province: 'Kepulauan Riau', lat: 1.1304, lng: 104.0530 },
    { name: 'Bandar Lampung', province: 'Lampung', lat: -5.4292, lng: 105.2619 },
  ];

  // Handle city selection - auto-fill province and GPS
  const handleCityChange = (e) => {
    const selectedCityName = e.target.value;
    setCity(selectedCityName);
    
    const selectedCity = indonesianCities.find(c => c.name === selectedCityName);
    if (selectedCity) {
      setProvince(selectedCity.province);
      setLatitude(selectedCity.lat.toString());
      setLongitude(selectedCity.lng.toString());
    }
  };

  // GPS Validation
  const validateGPSCoordinates = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast.error('Latitude harus antara -90 dan 90', 5000);
      return false;
    }
    
    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast.error('Longitude harus antara -180 dan 180', 5000);
      return false;
    }
    
    return true;
  };

  const fieldLabels = useMemo(
    () => ({
      legalName: t('admin.clinicManagement.create.form.fields.legalName.label'),
      facilityType: t('admin.clinicManagement.create.form.fields.facilityType.label'),
      streetAddress: t('admin.clinicManagement.create.form.fields.streetAddress.label'),
      city: t('admin.clinicManagement.create.form.fields.city.label'),
      province: t('admin.clinicManagement.create.form.fields.province.label'),
      postalCode: t('admin.clinicManagement.create.form.fields.postalCode.label'),
      phone: t('admin.clinicManagement.create.form.fields.phone.label'),
      email: t('admin.clinicManagement.create.form.fields.email.label'),
      ownerName: t('admin.clinicManagement.create.form.fields.ownerName.label'),
      ownerEmail: t('admin.clinicManagement.create.form.fields.ownerEmail.label'),
      ownerNik: t('admin.clinicManagement.create.form.fields.ownerNik.label'),
      ownerPosition: t('admin.clinicManagement.create.form.fields.ownerPosition.label'),
      ownerWhatsapp: t('admin.clinicManagement.create.form.fields.ownerWhatsapp.label'),
      nibNumber: t('admin.clinicManagement.create.form.fields.nibNumber.label'),
      npwpNumber: t('admin.clinicManagement.create.form.fields.npwpNumber.label')
    }),
    [t]
  );

  const fileLabels = useMemo(
    () => ({
      ktpFile: t('admin.clinicManagement.create.form.files.ktp'),
      ktpSelfie: t('admin.clinicManagement.create.form.files.ktpSelfie'),
      nibFile: t('admin.clinicManagement.create.form.files.nib'),
      npwpFile: t('admin.clinicManagement.create.form.files.npwp'),
      operationalLicense: t('admin.clinicManagement.create.form.files.operationalLicense'),
      additionalLicenses: t('admin.clinicManagement.create.form.files.additionalLicenses')
    }),
    [t]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const form = e.target;

      // Basic client-side validation for required fields
      const requiredFields = [
        'legalName','facilityType','streetAddress','postalCode','phone','email',
        'ownerName','ownerEmail','ownerNik','ownerPosition','ownerWhatsapp','nibNumber','npwpNumber'
      ];

      const missing = [];
      for (const key of requiredFields) {
        const el = form.elements?.[key];
        const val = el ? el.value : null;
        if (!val || (typeof val === 'string' && !val.trim())) {
          missing.push(fieldLabels[key] || key);
        }
      }
      
      // Validate geolocation fields
      if (!city) missing.push('Kota');
      if (!district) missing.push('Kecamatan');
      if (!province) missing.push('Provinsi');
      if (!latitude) missing.push('Latitude');
      if (!longitude) missing.push('Longitude');
      
      if (missing.length > 0) {
        const errorMsg = t('admin.clinicManagement.create.errors.requiredFields', { fields: missing.join(', ') });
        setError(errorMsg);
        toast.error(errorMsg, 7000);
        setLoading(false);
        return;
      }

      // Validate GPS coordinates
      if (!validateGPSCoordinates()) {
        setLoading(false);
        return;
      }

      // Ensure required files are present
      const requiredFiles = ['ktpFile','nibFile','npwpFile','operationalLicense'];
      const missingFiles = [];
      for (const f of requiredFiles) {
        const fileInput = form.elements?.[f];
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          missingFiles.push(fileLabels[f] || f);
        }
      }
      if (missingFiles.length > 0) {
        const errorMsg = t('admin.clinicManagement.create.errors.requiredFiles', { files: missingFiles.join(', ') });
        setError(errorMsg);
        toast.error(errorMsg, 7000);
        setLoading(false);
        return;
      }

      const formData = new FormData(form);
      
      // Add geolocation data
      formData.set('city', city);
      formData.set('district', district);
      formData.set('province', province);
      formData.set('latitude', latitude);
      formData.set('longitude', longitude);

      // Normalize checkboxes to 'true'/'false' strings expected by server
      if (form.elements?.termsAccepted) formData.set('termsAccepted', form.elements.termsAccepted.checked ? 'true' : 'false');
      if (form.elements?.privacyAccepted) formData.set('privacyAccepted', form.elements.privacyAccepted.checked ? 'true' : 'false');

      // Build operating hours from form inputs
      const weekdayHours = form.elements.weekdayHours?.value || '08:00-17:00';
      const saturdayHours = form.elements.saturdayHours?.value || '08:00-14:00';
      const sundayHours = form.elements.sundayHours?.value || 'closed';
      
      const operatingHours = {
        monday: weekdayHours,
        tuesday: weekdayHours,
        wednesday: weekdayHours,
        thursday: weekdayHours,
        friday: weekdayHours,
        saturday: saturdayHours,
        sunday: sundayHours
      };
      formData.set('operatingHours', JSON.stringify(operatingHours));

      // branches can be sent as JSON string; default to a single main branch if none provided
      if (!formData.get('branches')) {
        const defaultBranch = [{
          branchName: t('admin.clinicManagement.create.defaults.branchName'),
          branchCode: 'MAIN',
          isMainBranch: true,
          streetAddress: form.elements.streetAddress?.value || '',
          city: city,
          district: district,
          province: province,
          postalCode: form.elements.postalCode?.value || '',
          latitude: latitude,
          longitude: longitude,
          phone: form.elements.phone?.value || '',
          treatmentRoomsCount: 1,
          hasSterlization: 'false',
          hasRadiography: 'false',
          operatingHours: JSON.stringify(operatingHours)
        }];
        formData.set('branches', JSON.stringify(defaultBranch));
      }

      // Use authHttp (axios) so token is attached automatically
      const { data } = await authHttp.post('/clinic/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!data) {
        const errorMsg = t('admin.clinicManagement.create.errors.createFailed');
        setError(errorMsg);
        toast.error(errorMsg, 7000);
      } else {
        setSuccess(t('admin.clinicManagement.create.success.message'));
        toast.success('Klinik berhasil dibuat!', 5000);
        // show temporary password to admin so they can share it with the owner
        if (data.tempPassword) setTempPassword(data.tempPassword);
        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('CreateClinic error', err);
      const errorMsg = err.message || t('admin.clinicManagement.create.errors.unexpected');
      setError(errorMsg);
      toast.error(errorMsg, 7000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-3xl mx-auto bg-surface border border-border/40 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-muted">
                <AppIcon name="ChevronLeft" size={18} />
              </button>
              <h1 className="text-2xl font-semibold text-primary">{t('admin.clinicManagement.create.title')}</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">
            {/* Clinic Information Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-2xl p-6 border-2 border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <AppIcon name="Building2" size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-primary">Informasi Klinik</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.legalName.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="legalName"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder={t('admin.clinicManagement.create.form.fields.legalName.placeholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.brandName.label')}
                  </label>
                  <input
                    name="brandName"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder={t('admin.clinicManagement.create.form.fields.brandName.placeholder')}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.facilityType.label')} <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="facilityType" 
                    required 
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="">{t('admin.clinicManagement.create.form.fields.facilityType.placeholder')}</option>
                    <option value="klinik_gigi">{t('admin.clinicManagement.create.form.fields.facilityType.options.klinikGigi')}</option>
                    <option value="rsgm">{t('admin.clinicManagement.create.form.fields.facilityType.options.rsgm')}</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('admin.clinicManagement.create.form.fields.facilityType.hint')}
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.streetAddress.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="streetAddress"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder={t('admin.clinicManagement.create.form.fields.streetAddress.placeholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.phone.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.phone.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.email.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.email.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Geolocation Section */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-6 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <AppIcon name="MapPin" size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-primary">Lokasi & Geolokasi</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Kota <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={handleCityChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="">Pilih Kota</option>
                    {indonesianCities.map((cityObj) => (
                      <option key={cityObj.name} value={cityObj.name}>
                        {cityObj.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Memilih kota akan otomatis mengisi Provinsi dan GPS
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Kecamatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="Contoh: Menteng"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Provinsi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="Otomatis terisi"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Kode Pos <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="postalCode"
                    type="text"
                    required
                    placeholder="10110"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="-6.1944"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Otomatis terisi dari kota, atau cari di{' '}
                    <a 
                      href="https://www.google.com/maps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Google Maps
                    </a>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="106.8229"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Klik kanan lokasi klinik di Google Maps → Copy koordinat
                  </p>
                </div>
                
                {/* GPS Help Section */}
                <div className="md:col-span-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AppIcon name="Info" size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Cara Mendapatkan Koordinat GPS Akurat:
                      </h4>
                      <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                        <li>Buka <strong>Google Maps</strong> di browser</li>
                        <li>Cari dan zoom ke lokasi klinik Anda</li>
                        <li><strong>Klik kanan</strong> tepat di lokasi klinik</li>
                        <li>Pilih koordinat yang muncul (contoh: -6.1944, 106.8229)</li>
                        <li>Koordinat akan tersalin otomatis</li>
                        <li>Paste ke field Latitude dan Longitude di atas</li>
                      </ol>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
                        ℹ️ Koordinat akurat membantu pasien menemukan klinik Anda lebih mudah
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Information Section */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-600 rounded-xl">
                  <AppIcon name="User" size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-primary">Informasi Pemilik/Pengelola</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ownerName.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="ownerName"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.ownerName.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ownerEmail.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="ownerEmail"
                    type="email"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.ownerEmail.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ownerPosition.label')} <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="ownerPosition" 
                    defaultValue="owner" 
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="owner">{t('admin.clinicManagement.create.form.fields.ownerPosition.options.owner')}</option>
                    <option value="manager">{t('admin.clinicManagement.create.form.fields.ownerPosition.options.manager')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ownerWhatsapp.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="ownerWhatsapp"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.ownerWhatsapp.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ownerNik.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="ownerNik"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.ownerNik.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.nibNumber.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="nibNumber"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.nibNumber.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.npwpNumber.label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="npwpNumber"
                    required
                    placeholder={t('admin.clinicManagement.create.form.fields.npwpNumber.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-6 border-2 border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-600 rounded-xl">
                  <AppIcon name="FileText" size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-primary">Dokumen Legal</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ktpFile.label')} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="ktpFile" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    required 
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:border-amber-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.ktpSelfie.label')}
                  </label>
                  <input 
                    name="ktpSelfie" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:border-amber-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('admin.clinicManagement.create.form.fields.ktpSelfie.hint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.nibFile.label')} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="nibFile" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    required 
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:border-amber-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.npwpFile.label')} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="npwpFile" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    required 
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:border-amber-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.operationalLicense.label')} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="operationalLicense" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    required 
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:border-amber-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.additionalLicenses.label')}
                  </label>
                  <input 
                    name="additionalLicenses" 
                    type="file" 
                    accept="image/*,application/pdf" 
                    multiple 
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:border-amber-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('admin.clinicManagement.create.form.fields.additionalLicenses.hint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.fields.dataProtectionContact.label')}
                  </label>
                  <input
                    name="dataProtectionContact"
                    type="email"
                    placeholder={t('admin.clinicManagement.create.form.fields.dataProtectionContact.placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-amber-500 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('admin.clinicManagement.create.form.fields.dataProtectionContact.hint')}
                  </p>
                </div>
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-2xl p-6 border-2 border-cyan-200 dark:border-cyan-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-600 rounded-xl">
                  <AppIcon name="Clock" size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-primary">{t('admin.clinicManagement.create.form.operatingHours.title')}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.operatingHours.weekdayLabel')}
                  </label>
                  <input
                    name="weekdayHours"
                    type="text"
                    defaultValue="08:00-17:00"
                    placeholder={t('admin.clinicManagement.create.form.operatingHours.weekdayPlaceholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.operatingHours.saturdayLabel')}
                  </label>
                  <input
                    name="saturdayHours"
                    type="text"
                    defaultValue="08:00-14:00"
                    placeholder={t('admin.clinicManagement.create.form.operatingHours.saturdayPlaceholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.clinicManagement.create.form.operatingHours.sundayLabel')}
                  </label>
                  <input
                    name="sundayHours"
                    type="text"
                    defaultValue="closed"
                    placeholder={t('admin.clinicManagement.create.form.operatingHours.sundayPlaceholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {t('admin.clinicManagement.create.form.operatingHours.hint')}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <AppIcon name="X" size={16} />
                {t('admin.clinicManagement.create.form.actions.cancel')}
              </button>
              
              <button 
                disabled={loading} 
                type="submit" 
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('admin.clinicManagement.create.form.actions.creating')}</span>
                  </>
                ) : (
                  <>
                    <AppIcon name="Plus" size={16} />
                    <span>{t('admin.clinicManagement.create.form.actions.submit')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Terms & Conditions */}
            <div className="pt-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  name="termsAccepted" 
                  type="checkbox" 
                  required 
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer" 
                />
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {t('admin.clinicManagement.create.form.agreement.prefix')}{' '}
                  <a target="_blank" rel="noreferrer" href="/terms" className="text-indigo-600 hover:text-indigo-700 underline font-semibold">
                    {t('admin.clinicManagement.create.form.agreement.terms')}
                  </a>{' '}
                  {t('admin.clinicManagement.create.form.agreement.connector')}{' '}
                  <a target="_blank" rel="noreferrer" href="/privacy" className="text-indigo-600 hover:text-indigo-700 underline font-semibold">
                    {t('admin.clinicManagement.create.form.agreement.privacy')}
                  </a>
                  {t('admin.clinicManagement.create.form.agreement.suffix')}
                </div>
              </label>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AppIcon name="AlertCircle" size={20} className="text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border p-6"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
              <AppIcon name="CheckCircle2" size={24} className="text-emerald-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-primary text-center mb-2">
              {t('admin.clinicManagement.create.success.title')}
            </h2>
            
            <p className="text-sm text-secondary text-center mb-6">
              {t('admin.clinicManagement.create.success.subtitle')}
            </p>

            {tempPassword && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-2 mb-3">
                  <AppIcon name="ShieldAlert" size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {t('admin.clinicManagement.create.success.tempPassword.title')}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      {t('admin.clinicManagement.create.success.tempPassword.subtitle')}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-base font-mono font-semibold text-primary">
                      {tempPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title={t('admin.clinicManagement.create.success.tempPassword.copyTooltip')}
                    >
                      <AppIcon name="Copy" size={16} className="text-secondary" />
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                  {t('admin.clinicManagement.create.success.tempPassword.warning')}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  toast.success('Berhasil kembali ke direktori klinik', 3000);
                  setTimeout(() => {
                    navigate('/admin/clinic-management', { replace: true });
                  }, 300);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
              >
                <AppIcon name="ArrowLeft" size={16} />
                <span>{t('admin.clinicManagement.create.success.actions.backToDirectory')}</span>
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default CreateClinic;
