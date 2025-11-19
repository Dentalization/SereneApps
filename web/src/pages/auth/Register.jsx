import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ModalPortal from '../../components/ui/ModalPortal';
import { registerApi } from 'services/authService';
import { useAuth } from 'contexts/AuthContext';
import { redirectByRole } from 'utils/auth/redirectByRole';
import Icon from '../../components/AppIcon';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Personal Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [about, setAbout] = useState('');
  
  // Professional Information
  const [title, setTitle] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuingBody, setLicenseIssuingBody] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [primarySpecialization, setPrimarySpecialization] = useState('');
  const [educationQualification, setEducationQualification] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  
  // Clinic Information
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  // Working hours: array of { day, open, close, enabled }
  const defaultWorkingHours = [
    { day: 'Senin', open: '08:00', close: '17:00', enabled: false },
    { day: 'Selasa', open: '08:00', close: '17:00', enabled: false },
    { day: 'Rabu', open: '08:00', close: '17:00', enabled: false },
    { day: 'Kamis', open: '08:00', close: '17:00', enabled: false },
    { day: 'Jumat', open: '08:00', close: '17:00', enabled: false },
    { day: 'Sabtu', open: '08:00', close: '12:00', enabled: false },
    { day: 'Minggu', open: '08:00', close: '12:00', enabled: false },
  ];
  const [workingHours, setWorkingHours] = useState(defaultWorkingHours);
  // For display in input (summary)
  const clinicWorkingHours = workingHours.filter(d => d.enabled)
    .map(d => `${d.day}: ${d.open}-${d.close}`).join(', ');
  const [consultationTypes, setConsultationTypes] = useState([]);
  const [servicesOffered, setServicesOffered] = useState([]);
  
  // Optional Information
  const [consultationFee, setConsultationFee] = useState('');
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [acceptsBPJS, setAcceptsBPJS] = useState(false);
  const [emergencyAvailability, setEmergencyAvailability] = useState(false);
  
  // Authentication
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  
  // File input refs to maintain state
  const sipFileRef = useRef(null);
  const strFileRef = useRef(null);
  const ijazahFileRef = useRef(null);
  const certificationFileRef = useRef(null);
  
  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  
  // Step 2 dokumen state (must be declared before useEffect)
  const [sipFile, setSipFile] = useState(null);
  const [sipFileError, setSipFileError] = useState('');
  const [strFile, setStrFile] = useState(null);
  const [strFileError, setStrFileError] = useState('');
  const [ijazahFiles, setIjazahFiles] = useState([]);
  const [ijazahFilesError, setIjazahFilesError] = useState('');
  const [certificationFiles, setCertificationFiles] = useState([]);
  const [certificationFilesError, setCertificationFilesError] = useState('');
  
  // Persistent file state tracking
  const [fileStates, setFileStates] = useState({
    sipSelected: false,
    strSelected: false,
    ijazahSelected: false,
    certificationSelected: false
  });

  // Effect to update file state display when files change
  useEffect(() => {
    setFileStates({
      sipSelected: !!sipFile,
      strSelected: !!strFile,
      ijazahSelected: ijazahFiles && ijazahFiles.length > 0,
      certificationSelected: certificationFiles && certificationFiles.length > 0
    });
  }, [sipFile, strFile, ijazahFiles, certificationFiles]);

  // Effect to sync input files with state when navigating between steps
  useEffect(() => {
    if (currentStep === 2) {
      // Sync SIP file input with state
      if (sipFileRef.current && sipFile) {
        // Create a new FileList with the current file
        const dt = new DataTransfer();
        dt.items.add(sipFile);
        sipFileRef.current.files = dt.files;
      } else if (sipFileRef.current && !sipFile) {
        sipFileRef.current.value = '';
      }

      // Sync STR file input with state
      if (strFileRef.current && strFile) {
        const dt = new DataTransfer();
        dt.items.add(strFile);
        strFileRef.current.files = dt.files;
      } else if (strFileRef.current && !strFile) {
        strFileRef.current.value = '';
      }

      // Sync Ijazah files input with state
      if (ijazahFileRef.current && ijazahFiles && ijazahFiles.length > 0) {
        const dt = new DataTransfer();
        ijazahFiles.forEach(file => dt.items.add(file));
        ijazahFileRef.current.files = dt.files;
      } else if (ijazahFileRef.current && (!ijazahFiles || ijazahFiles.length === 0)) {
        ijazahFileRef.current.value = '';
      }

      // Sync Certification files input with state
      if (certificationFileRef.current && certificationFiles && certificationFiles.length > 0) {
        const dt = new DataTransfer();
        certificationFiles.forEach(file => dt.items.add(file));
        certificationFileRef.current.files = dt.files;
      } else if (certificationFileRef.current && (!certificationFiles || certificationFiles.length === 0)) {
        certificationFileRef.current.value = '';
      }
    }
  }, [currentStep, sipFile, strFile, ijazahFiles, certificationFiles]);
  
  // Per-field error state (step 1)
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [titleError, setTitleError] = useState('');
  // Step 2 errors
  const [licenseNumberError, setLicenseNumberError] = useState('');
  const [licenseIssuingBodyError, setLicenseIssuingBodyError] = useState('');
  const [licenseExpiryDateError, setLicenseExpiryDateError] = useState('');
  const [registrationNumberError, setRegistrationNumberError] = useState('');
  const [primarySpecializationError, setPrimarySpecializationError] = useState('');
  const [educationQualificationError, setEducationQualificationError] = useState('');
  const [yearsOfExperienceError, setYearsOfExperienceError] = useState('');
  // Step 3 errors
  const [clinicNameError, setClinicNameError] = useState('');
  const [clinicAddressError, setClinicAddressError] = useState('');
  const [clinicWorkingHoursError, setClinicWorkingHoursError] = useState('');
  const [consultationTypesError, setConsultationTypesError] = useState('');
  const [servicesOfferedError, setServicesOfferedError] = useState('');
  const [consultationFeeError, setConsultationFeeError] = useState('');

  // Data options
  const specializations = [
    'Bedah Mulut dan Maksilofasial',
    'Konservasi Gigi',
    'Endodontik',
    'Periodonsia',
    'Prostodontik',
    'Ortodontik',
    'Kedokteran Gigi Anak',
    'Penyakit Mulut',
    'Radiologi Kedokteran Gigi',
    'Kesehatan Gigi Masyarakat',
    'Umum'
  ];

  const educationLevels = [
    'Sarjana Kedokteran Gigi (drg.)',
    'Magister/Spesialis Kedokteran Gigi',
    'Doktor Kedokteran Gigi (Ph.D)'
  ];

  const consultationTypeOptions = [
    'Konsultasi Online',
    'Konsultasi Offline',
    'Konsultasi Darurat',
    'Second Opinion'
  ];

  const serviceOptions = [
    'Pemeriksaan Rutin',
    'Pembersihan Karang Gigi',
    'Penambalan Gigi',
    'Cabut Gigi',
    'Perawatan Saluran Akar',
    'Pembuatan Gigi Tiruan',
    'Pemasangan Behel',
    'Bedah Mulut',
    'Implant Gigi',
    'Veneer Gigi',
    'Bleaching Gigi',
    'Perawatan Gusi'
  ];

  // Validation functions
  const validateName = (fullName) => {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return 'Nama harus terdiri dari nama depan dan belakang';
    if (parts[parts.length - 1].length < 2) return 'Nama belakang minimal 2 karakter';
    return null;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email wajib diisi';
    if (!emailRegex.test(email)) return 'Format email tidak valid';
    return null;
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phone) return 'Nomor telepon wajib diisi';
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) return 'Format nomor telepon tidak valid';
    return null;
  };

  const validatePassword = (password) => {
    if (password.length < 8) return 'Password minimal 8 karakter';
    if (!/[A-Z]/.test(password)) return 'Password harus mengandung minimal 1 huruf besar';
    if (!/[a-z]/.test(password)) return 'Password harus mengandung minimal 1 huruf kecil';
    if (!/[0-9]/.test(password)) return 'Password harus mengandung minimal 1 angka';
    if (!/[!@#$%^&*(),.?":{}|<>\[\]]/.test(password)) return 'Password harus mengandung minimal 1 karakter khusus';
    return null;
  };

  const validateConsultationFee = (fee) => {
    if (!fee) return null; // Optional field
    const numFee = parseInt(fee.replace(/\D/g, ''));
    if (numFee < 10000 || numFee > 10000000) return 'Biaya konsultasi harus antara Rp10.000 - Rp10.000.000';
    return null;
  };

  const validateLicenseDate = (date) => {
    if (!date) return 'Tanggal berakhir SIP wajib diisi';
    const expiryDate = new Date(date);
    const today = new Date();
    if (expiryDate <= today) return 'SIP sudah berakhir atau akan berakhir hari ini';
    return null;
  };

  const formatCurrency = (value) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const number = parseInt(numericValue);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Comprehensive validation (tetap, untuk keamanan)
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phoneNumber);
    const passwordError = validatePassword(password);
    const feeError = validateConsultationFee(consultationFee);
    const licenseError = validateLicenseDate(licenseExpiryDate);

    // Debug validation - check each field individually
    console.log('=== FINAL SUBMISSION CHECK ===');
    console.log('Files status:', {
      sipFile: sipFile ? `✅ ${sipFile.name} (${sipFile.size} bytes)` : '❌ MISSING',
      strFile: strFile ? `✅ ${strFile.name} (${strFile.size} bytes)` : '❌ MISSING',
      ijazahFiles: ijazahFiles?.length ? `✅ ${ijazahFiles.length} files` : '❌ MISSING',
      certificationFiles: certificationFiles?.length ? `✅ ${certificationFiles.length} files` : '⚪ None (optional)'
    });
    console.log('Professional fields:', {
      primarySpecialization: primarySpecialization || '❌ MISSING',
      educationQualification: educationQualification || '❌ MISSING',
      yearsOfExperience: yearsOfExperience || '❌ MISSING',
      consultationTypes: consultationTypes?.length || 0,
      servicesOffered: servicesOffered?.length || 0
    });

    if (nameError) return setError(`Nama: ${nameError}`);
    if (emailError) return setError(`Email: ${emailError}`);
    if (phoneError) return setError(`Telepon: ${phoneError}`);
    if (!title) return setError('Gelar profesional wajib diisi');
    if (!licenseNumber) return setError('Nomor SIP wajib diisi');
    if (!sipFile) return setError('Dokumen SIP wajib diupload');
    if (!licenseIssuingBody) return setError('Lembaga penerbit SIP wajib diisi');
    if (licenseError) return setError(`Tanggal SIP: ${licenseError}`);
    if (!registrationNumber) return setError('Nomor STR wajib diisi');
    if (!strFile) return setError('Dokumen STR wajib diupload');
    if (!primarySpecialization) return setError('Spesialisasi utama wajib dipilih');
    if (!educationQualification) return setError('Kualifikasi pendidikan wajib dipilih');
    if (!ijazahFiles || ijazahFiles.length === 0) return setError('Ijazah wajib diupload minimal 1 file');
    if (!yearsOfExperience || yearsOfExperience < 0 || yearsOfExperience > 60) return setError('Pengalaman harus antara 0-60 tahun');
    if (!clinicName) return setError('Nama klinik wajib diisi');
    if (!clinicAddress) return setError('Alamat klinik wajib diisi');
    if (!clinicWorkingHours) return setError('Jam praktik wajib diatur');
    if (consultationTypes.length === 0) return setError('Minimal pilih 1 jenis konsultasi');
    if (servicesOffered.length === 0) return setError('Minimal pilih 1 layanan yang ditawarkan');
    if (passwordError) return setError(`Password: ${passwordError}`);
    if (password !== confirmPassword) return setError('Konfirmasi password tidak cocok');
    if (feeError) return setError(`Biaya konsultasi: ${feeError}`);
    if (!agree) return setError('Anda harus menyetujui syarat dan ketentuan');

    setSubmitting(true);
    try {
      // Helper function to log FormData contents for debugging
      const logFormData = (fd) => {
        console.log('=== FormData Contents ===');
        for (const [key, value] of fd.entries()) {
          if (value instanceof File) {
            console.log(`${key} -> File{name: ${value.name}, size: ${value.size}}`);
          } else {
            console.log(`${key} -> ${value}`);
          }
        }
      };

      // Gunakan FormData untuk upload file dan data lain
      const formData = new FormData();
      
      // Personal Information
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phoneNumber', phoneNumber);
      formData.append('about', about || '');
      
      // Professional Information - ensure proper formatting
      formData.append('title', title);
      formData.append('licenseNumber', licenseNumber);
      formData.append('licenseIssuingBody', licenseIssuingBody);
      
      // Format date properly for backend
      const formattedExpiryDate = licenseExpiryDate ? new Date(licenseExpiryDate).toISOString().split('T')[0] : '';
      formData.append('licenseExpiryDate', formattedExpiryDate);
      
      formData.append('registrationNumber', registrationNumber);
      formData.append('primarySpecialization', primarySpecialization);
      formData.append('educationQualification', educationQualification);
      
      // Ensure numeric fields are properly formatted
      const numericExperience = parseInt(yearsOfExperience) || 0;
      formData.append('yearsOfExperience', String(numericExperience));
      
      // Clinic Information
      formData.append('clinicName', clinicName);
      formData.append('clinicAddress', clinicAddress);
      formData.append('clinicWorkingHours', JSON.stringify(workingHours));
      
      // Consultation fee - ensure proper numeric formatting
      const numericFee = consultationFee ? parseInt(consultationFee.replace(/\D/g, '')) : 0;
      formData.append('consultationFee', String(numericFee));
      
      // Boolean fields - send as string boolean values
      formData.append('acceptsInsurance', acceptsInsurance ? 'true' : 'false');
      formData.append('acceptsBPJS', acceptsBPJS ? 'true' : 'false');
      formData.append('emergencyAvailability', emergencyAvailability ? 'true' : 'false');
      
      formData.append('password', password);
      
      // Array fields - send as JSON strings instead of indexed fields
      formData.append('consultationTypes', JSON.stringify(consultationTypes));
      formData.append('servicesOffered', JSON.stringify(servicesOffered));
      // Dokumen - pastikan file adalah File objects
      if (sipFile instanceof File) {
        formData.append('sipFile', sipFile);
        console.log('✅ SIP file added to FormData:', sipFile.name);
      } else {
        console.error('❌ SIP file is not a File object:', typeof sipFile, sipFile);
        return setError('❌ SIP file tidak valid, silakan pilih ulang file');
      }
      
      if (strFile instanceof File) {
        formData.append('strFile', strFile);
        console.log('✅ STR file added to FormData:', strFile.name);
      } else {
        console.error('❌ STR file is not a File object:', typeof strFile, strFile);
        return setError('❌ STR file tidak valid, silakan pilih ulang file');
      }
      
      // Add ijazah files - pastikan semua adalah File objects
      if (ijazahFiles && ijazahFiles.length > 0) {
        for (let i = 0; i < ijazahFiles.length; i++) {
          const file = ijazahFiles[i];
          if (file instanceof File) {
            formData.append(`ijazahFiles`, file);
            console.log(`✅ Ijazah file ${i+1} added to FormData:`, file.name);
          } else {
            console.error(`❌ Ijazah file ${i+1} is not a File object:`, typeof file, file);
            return setError(`❌ Ijazah file ${i+1} tidak valid, silakan pilih ulang file`);
          }
        }
      }
      
      // Add certification files - pastikan semua adalah File objects
      if (certificationFiles && certificationFiles.length > 0) {
        for (let i = 0; i < certificationFiles.length; i++) {
          const file = certificationFiles[i];
          if (file instanceof File) {
            formData.append(`certificationFiles`, file);
            console.log(`✅ Certification file ${i+1} added to FormData:`, file.name);
          } else {
            console.error(`❌ Certification file ${i+1} is not a File object:`, typeof file, file);
            return setError(`❌ Certification file ${i+1} tidak valid, silakan pilih ulang file`);
          }
        }
      }

      // Log FormData contents for debugging
      logFormData(formData);

      console.log('🚀 Sending registration request to backend...');
      console.log('Request URL: /auth/register');
      console.log('Request method: POST');
      console.log('FormData ready, sending...');
      
      const registerResponse = await registerApi(formData);
      
      console.log('✅ Registration response received:', registerResponse);
      
      // Jangan ubah file state setelah upload - biarkan tetap sebagai File object
      // File akan tetap ada di state untuk retry tanpa perlu re-pick
      
      // Redirect to login page with success message instead of auto-login
      navigate('/auth/login', { 
        replace: true, 
        state: { 
          message: 'Registrasi berhasil! Silakan login dengan akun Anda.',
          email: email // Pre-fill email in login form
        } 
      });
    } catch (err) {
      console.error('❌ Registration error caught:', err);
      console.error('Error response:', err?.response);
      console.error('Error data:', err?.response?.data);
      console.error('Error status:', err?.response?.status);
      console.error('Error message:', err?.message);
      
      const msg = err?.response?.data?.message || err?.message || 'Registrasi gagal';
      
      // Handle specific error messages
      if (msg.toLowerCase().includes('license number') && msg.toLowerCase().includes('already exists')) {
        setError('Nomor SIP atau STR sudah terdaftar. Mohon periksa kembali nomor yang Anda masukkan.');
      } else if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('already')) {
        setError('Email sudah terdaftar. Silakan gunakan email lain atau login jika sudah memiliki akun.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConsultationTypeChange = (type) => {
    setConsultationTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleServiceChange = (service) => {
    setServicesOffered(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  // Helper function to display file info
  const displayFileInfo = (file) => {
    if (!file) return null;
    return `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  };

  // Helper function to display multiple files info
  const displayFilesInfo = (files) => {
    if (!files || files.length === 0) return [];
    return files.map(file => `${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/icon.png" alt="SereneAI" className="w-16 h-16 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-4xl font-black text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
            Bergabung dengan SereneAI
          </h1>
          <p className="text-lg text-gray-600">
            Daftarkan praktik kedokteran gigi Anda dengan teknologi AI terdepan
          </p>
        </div>

        {/* Multi-step Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] overflow-hidden">
          {/* Step Indicator */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep >= step ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && <div className="w-8 h-0.5 bg-white/30 mx-2"></div>}
                </div>
              ))}
            </div>
            <div className="text-center mt-4 text-white">
              {currentStep === 1 && "Informasi Personal"}
              {currentStep === 2 && "Informasi Profesional"}
              {currentStep === 3 && "Informasi Klinik"}
              {currentStep === 4 && "Keamanan & Konfirmasi"}
            </div>
          </div>

          <form onSubmit={onSubmit} className="p-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Informasi Personal</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${nameError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Ahmad Wijaya"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Nama depan dan belakang (minimal 2 karakter untuk nama belakang)</p>
                    {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${emailError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="dokter@klinik.com"
                      required
                    />
                    {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nomor Telepon <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setPhoneError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${phoneError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="0812-3456-7890"
                      required
                    />
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gelar Profesional <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setTitleError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${titleError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="drg., Sp.Ort."
                      required
                    />
                    {titleError && <p className="text-xs text-red-500 mt-1">{titleError}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Biografi (Opsional)
                  </label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder="Ceritakan sedikit tentang pengalaman dan keahlian Anda..."
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>{error}</div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      // Step 1 validation
                      let valid = true;
                      const nErr = validateName(name);
                      const eErr = validateEmail(email);
                      const pErr = validatePhone(phoneNumber);
                      if (nErr) { setNameError(nErr); valid = false; } else setNameError('');
                      if (eErr) { setEmailError(eErr); valid = false; } else setEmailError('');
                      if (pErr) { setPhoneError(pErr); valid = false; } else setPhoneError('');
                      if (!title) { setTitleError('Gelar profesional wajib diisi'); valid = false; } else setTitleError('');
                      setError('');
                      if (valid) {
                        setCurrentStep(2);
                      } else {
                        setError('Mohon perbaiki informasi personal yang belum sesuai');
                      }
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Professional Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Informasi Profesional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nomor SIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => {
                        setLicenseNumber(e.target.value);
                        setLicenseNumberError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${licenseNumberError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="123/SIPGIGI/045/DINKES-KOTA/IX/2025"
                      required
                    />
                    {licenseNumberError && <p className="text-xs text-red-500 mt-1">{licenseNumberError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Dokumen SIP <span className="text-red-500">*</span>
                    </label>
                    {sipFile ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700 font-medium">✓ File SIP sudah diupload:</p>
                              <p className="text-xs text-green-600">{displayFileInfo(sipFile)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSipFile(null);
                                setFileStates(prev => ({...prev, sipSelected: false}));
                                if (sipFileRef.current) sipFileRef.current.value = '';
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                        <input
                          ref={sipFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={e => {
                            const file = e.target.files[0] || null;
                            setSipFile(file);
                            setSipFileError('');
                            setFileStates(prev => ({...prev, sipSelected: !!file}));
                            console.log('SIP file selected:', file ? `${file.name} (${file.size} bytes)` : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white text-sm"
                        />
                        <p className="text-xs text-gray-500">Pilih file baru untuk mengganti file yang sudah diupload</p>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={sipFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={e => {
                            const file = e.target.files[0] || null;
                            setSipFile(file);
                            setSipFileError('');
                            setFileStates(prev => ({...prev, sipSelected: !!file}));
                            console.log('SIP file selected:', file ? `${file.name} (${file.size} bytes)` : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white"
                        />
                      </div>
                    )}
                    {sipFileError && <p className="text-xs text-red-500 mt-1">{sipFileError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Lembaga Penerbit SIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={licenseIssuingBody}
                      onChange={(e) => {
                        setLicenseIssuingBody(e.target.value);
                        setLicenseIssuingBodyError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${licenseIssuingBodyError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Dinas Kesehatan Kota Jakarta"
                      required
                    />
                    {licenseIssuingBodyError && <p className="text-xs text-red-500 mt-1">{licenseIssuingBodyError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tanggal Berakhir SIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={licenseExpiryDate}
                      onChange={(e) => {
                        setLicenseExpiryDate(e.target.value);
                        setLicenseExpiryDateError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${licenseExpiryDateError ? 'border-red-400' : 'border-gray-200'}`}
                      required
                    />
                    {licenseExpiryDateError && <p className="text-xs text-red-500 mt-1">{licenseExpiryDateError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nomor STR <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => {
                        setRegistrationNumber(e.target.value);
                        setRegistrationNumberError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${registrationNumberError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="31.2.1.123.45.678901 drg/STR/KKI/IX/2025"
                      required
                    />
                    {registrationNumberError && <p className="text-xs text-red-500 mt-1">{registrationNumberError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Dokumen STR <span className="text-red-500">*</span>
                    </label>
                    {strFile ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700 font-medium">✓ File STR sudah diupload:</p>
                              <p className="text-xs text-green-600">{displayFileInfo(strFile)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStrFile(null);
                                setFileStates(prev => ({...prev, strSelected: false}));
                                if (strFileRef.current) strFileRef.current.value = '';
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                        <input
                          ref={strFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={e => {
                            const file = e.target.files[0] || null;
                            setStrFile(file);
                            setStrFileError('');
                            setFileStates(prev => ({...prev, strSelected: !!file}));
                            console.log('STR file selected:', file ? `${file.name} (${file.size} bytes)` : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white text-sm"
                        />
                        <p className="text-xs text-gray-500">Pilih file baru untuk mengganti file yang sudah diupload</p>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={strFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={e => {
                            const file = e.target.files[0] || null;
                            setStrFile(file);
                            setStrFileError('');
                            setFileStates(prev => ({...prev, strSelected: !!file}));
                            console.log('STR file selected:', file ? `${file.name} (${file.size} bytes)` : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white"
                        />
                      </div>
                    )}
                    {strFileError && <p className="text-xs text-red-500 mt-1">{strFileError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Spesialisasi Utama <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={primarySpecialization}
                      onChange={(e) => {
                        setPrimarySpecialization(e.target.value);
                        setPrimarySpecializationError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${primarySpecializationError ? 'border-red-400' : 'border-gray-200'}`}
                      required
                    >
                      <option value="">Pilih Spesialisasi</option>
                      {specializations.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                    {primarySpecializationError && <p className="text-xs text-red-500 mt-1">{primarySpecializationError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kualifikasi Pendidikan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={educationQualification}
                      onChange={(e) => {
                        setEducationQualification(e.target.value);
                        setEducationQualificationError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${educationQualificationError ? 'border-red-400' : 'border-gray-200'}`}
                      required
                    >
                      <option value="">Pilih Kualifikasi</option>
                      {educationLevels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    {educationQualificationError && <p className="text-xs text-red-500 mt-1">{educationQualificationError}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Ijazah <span className="text-red-500">*</span>
                    </label>
                    {ijazahFiles.length > 0 ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700 font-medium">✓ File Ijazah sudah diupload ({ijazahFiles.length}):</p>
                              <ul className="text-xs text-green-600 mt-1 list-disc list-inside">
                                {displayFilesInfo(ijazahFiles).map((fileInfo, i) => <li key={i}>{fileInfo}</li>)}
                              </ul>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIjazahFiles([]);
                                setFileStates(prev => ({...prev, ijazahSelected: false}));
                                if (ijazahFileRef.current) ijazahFileRef.current.value = '';
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                        <input
                          ref={ijazahFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files);
                            setIjazahFiles(files);
                            setIjazahFilesError('');
                            setFileStates(prev => ({...prev, ijazahSelected: files.length > 0}));
                            console.log('Ijazah files selected:', files.length > 0 ? files.map(f => `${f.name} (${f.size} bytes)`) : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white text-sm"
                        />
                        <p className="text-xs text-gray-500">Pilih file baru untuk mengganti file yang sudah diupload</p>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={ijazahFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files);
                            setIjazahFiles(files);
                            setIjazahFilesError('');
                            setFileStates(prev => ({...prev, ijazahSelected: files.length > 0}));
                            console.log('Ijazah files selected:', files.length > 0 ? files.map(f => `${f.name} (${f.size} bytes)`) : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white"
                        />
                      </div>
                    )}
                    {ijazahFilesError && <p className="text-xs text-red-500 mt-1">{ijazahFilesError}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Sertifikasi (Opsional)
                    </label>
                    {certificationFiles.length > 0 ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-700 font-medium">✓ File Sertifikasi sudah diupload ({certificationFiles.length}):</p>
                              <ul className="text-xs text-blue-600 mt-1 list-disc list-inside">
                                {displayFilesInfo(certificationFiles).map((fileInfo, i) => <li key={i}>{fileInfo}</li>)}
                              </ul>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCertificationFiles([]);
                                setFileStates(prev => ({...prev, certificationSelected: false}));
                                if (certificationFileRef.current) certificationFileRef.current.value = '';
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                        <input
                          ref={certificationFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files);
                            setCertificationFiles(files);
                            setCertificationFilesError('');
                            setFileStates(prev => ({...prev, certificationSelected: files.length > 0}));
                            console.log('Certification files selected:', files.length > 0 ? files.map(f => `${f.name} (${f.size} bytes)`) : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white text-sm"
                        />
                        <p className="text-xs text-gray-500">Pilih file baru untuk mengganti file yang sudah diupload</p>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={certificationFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files);
                            setCertificationFiles(files);
                            setCertificationFilesError('');
                            setFileStates(prev => ({...prev, certificationSelected: files.length > 0}));
                            console.log('Certification files selected:', files.length > 0 ? files.map(f => `${f.name} (${f.size} bytes)`) : 'None');
                          }}
                          className="w-full px-2 py-2 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors border-gray-200 bg-white"
                        />
                      </div>
                    )}
                    {certificationFilesError && <p className="text-xs text-red-500 mt-1">{certificationFilesError}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pengalaman (Tahun) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={yearsOfExperience}
                      onChange={(e) => {
                        setYearsOfExperience(e.target.value);
                        setYearsOfExperienceError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${yearsOfExperienceError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="10"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Masukkan angka antara 0-60 tahun</p>
                    {yearsOfExperienceError && <p className="text-xs text-red-500 mt-1">{yearsOfExperienceError}</p>}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>{error}</div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('=== STEP 2 VALIDATION START ===');
                      console.log('Current file states:', {
                        sipFile: sipFile ? `${sipFile.name} (${sipFile.size} bytes)` : 'NULL',
                        strFile: strFile ? `${strFile.name} (${strFile.size} bytes)` : 'NULL',
                        ijazahFiles: ijazahFiles?.length ? `${ijazahFiles.length} files: ${ijazahFiles.map(f => f.name).join(', ')}` : 'NULL',
                        certificationFiles: certificationFiles?.length ? `${certificationFiles.length} files: ${certificationFiles.map(f => f.name).join(', ')}` : 'NONE'
                      });
                      console.log('File tracking states:', fileStates);
                      
                      // Step 2 validation
                      let valid = true;
                      if (!licenseNumber) { setLicenseNumberError('Nomor SIP wajib diisi'); valid = false; } else setLicenseNumberError('');
                      if (!sipFile) { setSipFileError('Dokumen SIP wajib diupload'); valid = false; console.log('❌ SIP file missing'); } else setSipFileError('');
                      if (!licenseIssuingBody) { setLicenseIssuingBodyError('Lembaga penerbit SIP wajib diisi'); valid = false; } else setLicenseIssuingBodyError('');
                      const licenseError = validateLicenseDate(licenseExpiryDate);
                      if (licenseError) { setLicenseExpiryDateError(licenseError); valid = false; } else setLicenseExpiryDateError('');
                      if (!registrationNumber) { setRegistrationNumberError('Nomor STR wajib diisi'); valid = false; } else setRegistrationNumberError('');
                      if (!strFile) { setStrFileError('Dokumen STR wajib diupload'); valid = false; console.log('❌ STR file missing'); } else setStrFileError('');
                      if (!primarySpecialization) { setPrimarySpecializationError('Spesialisasi utama wajib dipilih'); valid = false; } else setPrimarySpecializationError('');
                      if (!educationQualification) { setEducationQualificationError('Kualifikasi pendidikan wajib dipilih'); valid = false; } else setEducationQualificationError('');
                      if (!ijazahFiles || ijazahFiles.length === 0) { setIjazahFilesError('Ijazah wajib diupload minimal 1 file'); valid = false; console.log('❌ Ijazah files missing'); } else setIjazahFilesError('');
                      if (!yearsOfExperience || yearsOfExperience < 0 || yearsOfExperience > 60) { setYearsOfExperienceError('Pengalaman harus antara 0-60 tahun'); valid = false; } else setYearsOfExperienceError('');
                      setError('');
                      
                      console.log('Step 2 validation result:', valid ? '✅ VALID' : '❌ INVALID');
                      if (valid) {
                        console.log('Moving to step 3...');
                        setCurrentStep(3);
                      } else {
                        console.log('Validation failed, staying on step 2');
                        setError('Mohon lengkapi semua field yang wajib diisi pada formulir profesional');
                      }
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Clinic Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Informasi Klinik</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nama Klinik <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => {
                        setClinicName(e.target.value);
                        setClinicNameError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${clinicNameError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Klinik Dental Care"
                      required
                    />
                    {clinicNameError && <p className="text-xs text-red-500 mt-1">{clinicNameError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jam Praktik <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={clinicWorkingHours}
                        readOnly
                        className={`flex-1 px-4 py-3 border-2 rounded-xl bg-gray-50 text-gray-700 ${clinicWorkingHoursError ? 'border-red-400' : 'border-gray-200'}`}
                        placeholder="Belum diatur"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWorkingHoursModal(true)}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                      >
                        Atur
                      </button>
                    </div>
                    {clinicWorkingHoursError && <p className="text-xs text-red-500 mt-1">{clinicWorkingHoursError}</p>}
                  </div>
                </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Alamat Klinik <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={clinicAddress}
                      onChange={(e) => {
                        setClinicAddress(e.target.value);
                        setClinicAddressError('');
                      }}
                      rows={3}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${clinicAddressError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Jl. Kesehatan No. 123, Jakarta Selatan"
                      required
                    />
                    {clinicAddressError && <p className="text-xs text-red-500 mt-1">{clinicAddressError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jenis Konsultasi <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {consultationTypeOptions.map(type => (
                        <label key={type} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consultationTypes.includes(type)}
                            onChange={() => {
                              handleConsultationTypeChange(type);
                              setConsultationTypesError('');
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                    {consultationTypesError && <p className="text-xs text-red-500 mt-1">{consultationTypesError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Layanan yang Ditawarkan <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {serviceOptions.map(service => (
                        <label key={service} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={servicesOffered.includes(service)}
                            onChange={() => {
                              handleServiceChange(service);
                              setServicesOfferedError('');
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{service}</span>
                        </label>
                      ))}
                    </div>
                    {servicesOfferedError && <p className="text-xs text-red-500 mt-1">{servicesOfferedError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Biaya Konsultasi (Opsional)
                    </label>
                    <input
                      type="text"
                      value={consultationFee}
                      onChange={(e) => {
                        setConsultationFee(formatCurrency(e.target.value));
                        setConsultationFeeError('');
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors ${consultationFeeError ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Rp 150.000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Kisaran Rp10.000 - Rp10.000.000</p>
                    {consultationFeeError && <p className="text-xs text-red-500 mt-1">{consultationFeeError}</p>}
                  </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Pengaturan Tambahan</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                      <span className="text-sm font-medium text-gray-700">Menerima Asuransi</span>
                      <input
                        type="checkbox"
                        checked={acceptsInsurance}
                        onChange={(e) => setAcceptsInsurance(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                      <span className="text-sm font-medium text-gray-700">Menerima BPJS</span>
                      <input
                        type="checkbox"
                        checked={acceptsBPJS}
                        onChange={(e) => setAcceptsBPJS(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                      <span className="text-sm font-medium text-gray-700">Tersedia Darurat</span>
                      <input
                        type="checkbox"
                        checked={emergencyAvailability}
                        onChange={(e) => setEmergencyAvailability(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>{error}</div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('=== NAVIGATING BACK TO STEP 2 ===');
                      console.log('Current file states before going back:', {
                        sipFile: sipFile ? `${sipFile.name} (${sipFile.size} bytes)` : 'NULL',
                        strFile: strFile ? `${strFile.name} (${strFile.size} bytes)` : 'NULL', 
                        ijazahFiles: ijazahFiles?.length ? `${ijazahFiles.length} files` : 'NULL',
                        certificationFiles: certificationFiles?.length ? `${certificationFiles.length} files` : 'NONE'
                      });
                      setCurrentStep(2);
                    }}
                    className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Step 3 validation
                      let valid = true;
                      if (!clinicName) { setClinicNameError('Nama klinik wajib diisi'); valid = false; } else setClinicNameError('');
                      if (!clinicAddress) { setClinicAddressError('Alamat klinik wajib diisi'); valid = false; } else setClinicAddressError('');
                      if (!clinicWorkingHours) { setClinicWorkingHoursError('Jam praktik wajib diatur'); valid = false; } else setClinicWorkingHoursError('');
                      if (consultationTypes.length === 0) { setConsultationTypesError('Minimal pilih 1 jenis konsultasi'); valid = false; } else setConsultationTypesError('');
                      if (servicesOffered.length === 0) { setServicesOfferedError('Minimal pilih 1 layanan yang ditawarkan'); valid = false; } else setServicesOfferedError('');
                      const feeError = validateConsultationFee(consultationFee);
                      if (feeError) { setConsultationFeeError(feeError); valid = false; } else setConsultationFeeError('');
                      setError('');
                      if (valid) {
                        setCurrentStep(4);
                      } else {
                        setError('Mohon lengkapi semua field yang wajib diisi pada informasi klinik');
                      }
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Security & Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Keamanan & Konfirmasi</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kata Sandi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required
                    />
                    <div className="mt-2 text-xs text-gray-600">
                      <p>Password harus mengandung:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        <li>Minimal 8 karakter</li>
                        <li>1 huruf besar, 1 huruf kecil</li>
                        <li>1 angka dan 1 karakter khusus</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5"
                      required
                    />
                    <span className="text-sm text-gray-700">
                      Saya menyetujui{' '}
                      <a href="#" className="text-indigo-600 underline hover:text-indigo-800">
                        Syarat dan Ketentuan
                      </a>{' '}
                      serta{' '}
                      <a href="#" className="text-indigo-600 underline hover:text-indigo-800">
                        Kebijakan Privasi
                      </a>{' '}
                      SereneAI. Saya memahami bahwa informasi yang saya berikan akan digunakan untuk verifikasi kredensial profesional saya.
                    </span>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>{error}</div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    
                    {submitting ? (
                      <div className="flex items-center space-x-2 relative z-10">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Mendaftarkan...</span>
                      </div>
                    ) : (
                      <span className="relative z-10">Daftar Sekarang</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Sudah memiliki akun?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      {/* Working Hours Modal — Professional, High-Contrast, Sticky Actions */}
{showWorkingHoursModal && (
  <ModalPortal>
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wh-title"
      onClick={() => setShowWorkingHoursModal(false)}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#483AA0] to-[#A08A48]" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#483AA0] to-[#A08A48] text-white flex items-center justify-center ring-1 ring-black/5">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 id="wh-title" className="text-lg font-semibold text-[#333]">Atur Jam Praktik</h3>
              <p className="text-sm text-[#6E6E6E]">Tetapkan jadwal klinik per hari.</p>
            </div>
          </div>

          <button
            onClick={() => setShowWorkingHoursModal(false)}
            className="rounded-md p-2 text-[#6E6E6E] hover:text-brand-primary hover:bg-brand-primary/5 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            aria-label="Tutup"
            title="Tutup"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 sm:px-8 pb-4 max-h-[65vh] overflow-y-auto">
          <div className="space-y-3">
            {workingHours.map((item, idx) => (
              <div
                key={item.day}
                className={[
                  "flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3",
                  item.enabled ? "border-[#483AA0]/30 bg-white" : "border-gray-200 bg-[#F9F9FB]"
                ].join(" ")}
              >
                {/* Toggle */}
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={e => {
                      const wh = [...workingHours];
                      wh[idx].enabled = e.target.checked;
                      setWorkingHours(wh);
                    }}
                    className="sr-only"
                  />
                  <span
                    className={[
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      item.enabled ? "bg-[#483AA0]" : "bg-gray-300"
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute left-1 h-5 w-5 rounded-full bg-white transition-transform",
                        item.enabled ? "translate-x-5" : "translate-x-0"
                      ].join(" ")}
                    />
                  </span>

                  <span className={["ml-3 text-sm font-medium", item.enabled ? "text-[#333]" : "text-gray-400"].join(" ")}>
                    {item.enabled ? "Aktif" : "Nonaktif"}
                  </span>
                </label>

                {/* Day */}
                <span className={["w-24 text-sm font-semibold", item.enabled ? "text-[#333]" : "text-gray-400"].join(" ")}>
                  {item.day}
                </span>

                {/* Inputs */}
                <div className="ml-auto flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#6E6E6E]">Open</span>
                    <input
                      type="time"
                      value={item.open}
                      disabled={!item.enabled}
                      onChange={e => {
                        const wh = [...workingHours];
                        wh[idx].open = e.target.value;
                        setWorkingHours(wh);
                      }}
                      className={[
                        "h-10 w-[108px] rounded-lg border px-3 text-sm font-mono tracking-wider",
                        "focus:outline-none focus:ring-2",
                        item.enabled
                          ? "border-gray-300 bg-white text-[#333] focus:ring-[#483AA0]/25 focus-border-[#483AA0]/40"
                          : "border-gray-200 bg-gray-100 text-gray-400"
                      ].join(" ")}
                    />
                  </label>

                  <span className="text-gray-300">—</span>

                  <label className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#6E6E6E]">Close</span>
                    <input
                      type="time"
                      value={item.close}
                      disabled={!item.enabled}
                      onChange={e => {
                        const wh = [...workingHours];
                        wh[idx].close = e.target.value;
                        setWorkingHours(wh);
                      }}
                      className={[
                        "h-10 w-[108px] rounded-lg border px-3 text-sm font-mono tracking-wider",
                        "focus:outline-none focus:ring-2",
                        item.enabled
                          ? "border-gray-300 bg-white text-[#333] focus:ring-[#483AA0]/25 focus:border-[#483AA0]/40"
                          : "border-gray-200 bg-gray-100 text-gray-400"
                      ].join(" ")}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky footer actions (always visible) */}
        <div className="sticky bottom-0 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t border-gray-200 px-6 sm:px-8 py-4">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setShowWorkingHoursModal(false)}
              className="col-span-1 inline-flex items-center justify-center rounded-xl border border-brand-primary bg-white px-4 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              Batal
            </button>

            <button
              onClick={() => setWorkingHours(defaultWorkingHours)}
              className="col-span-1 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#333] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#483AA0]/30"
            >
              Reset
            </button>

            <button
              onClick={() => setShowWorkingHoursModal(false)}
              className="col-span-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#483AA0] to-[#A08A48] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#483AA0]/20 hover:from-[#3B2F85] hover:to-[#8C783F] focus:outline-none focus:ring-2 focus:ring-[#483AA0]/30"
            >
              Simpan Jam
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
)}


    </div>
  );
};

export default Register;
