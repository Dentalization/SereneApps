import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const AddDentistModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false, 
  error = null,
  branches = [],
  clinic = null,
  clinicLoading = false
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Personal Information
  const [name, setName] = useState('');
  const [nameSuffix, setNameSuffix] = useState('');
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
  const [selectedBranch, setSelectedBranch] = useState('');
  
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
  
  // File input refs
  const sipFileRef = useRef(null);
  const strFileRef = useRef(null);
  const ijazahFileRef = useRef(null);
  const certificationFileRef = useRef(null);
  
  // File states
  const [sipFile, setSipFile] = useState(null);
  const [strFile, setStrFile] = useState(null);
  const [ijazahFiles, setIjazahFiles] = useState([]);
  const [certificationFiles, setCertificationFiles] = useState([]);
  
  // Form validation
  const [errors, setErrors] = useState({});
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);

  // Data options from Register.jsx
  const specializations = [
    'Ortodonti (Sp.Ort)', // Kawat gigi, clear aligner
    'Konservasi Gigi (Sp.KG)', // Gigi berlubang, saluran akar, restorasi
    'Bedah Mulut (Sp.BM)', // Operasi gigi bungsu, bibir sumbing, operasi rahang
    'Periodonsia (Sp.Perio)', // Penyakit gusi dan tulang rahang
    'Prostodonsia (Sp.Pros)', // Gigi tiruan, mahkota, implan
    'Kedokteran Gigi Anak (Sp.KGA)', // Perawatan gigi anak
    'Penyakit Mulut (Sp.PM)', // Sariawan kronis, tumor, kanker mulut
    'Radiologi Kedokteran Gigi (Sp.RKG)', // Rontgen, CT scan, MRI gigi
    'Odontologi Forensik', // Identifikasi jenazah, analisis bekas gigitan
    'Dokter Gigi Umum' // General dentistry
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

  // Populate clinic data when clinic prop changes
  useEffect(() => {
    if (clinic && !clinicLoading) {
      console.log('🏥 Setting initial clinic data:', clinic);
      setClinicName(clinic.name || '');
      setClinicAddress(clinic.address || '');
    }
  }, [clinic, clinicLoading]);

  // Debug branches data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🏢 AddDentistModal opened with branches:', branches);
      console.log('🏢 Branches length:', branches?.length || 0);
      console.log('🏢 Clinic loading:', clinicLoading);
      console.log('🏢 Clinic data:', clinic);
      
      if (branches && branches.length > 0) {
        console.log('🏢 First branch sample:', JSON.stringify(branches[0], null, 2));
      }
      
      // Auto-select first branch if only one branch is available
      if (branches && branches.length === 1 && !selectedBranch) {
        console.log('🏢 Auto-selecting single available branch:', branches[0]);
        setSelectedBranch(branches[0].id.toString());
      }
      
      // Ensure clinic name is set when modal opens, even if no branch selected
      if (clinic && !selectedBranch && !clinicName) {
        console.log('🏢 Modal opened - setting initial clinic name from clinic data');
        setClinicName(clinic.name || '');
        setClinicAddress(clinic.address || '');
      }
    }
  }, [isOpen, branches, clinicLoading, clinic, selectedBranch, clinicName]);

  // Update clinic name and address when branch is selected
  useEffect(() => {
    if (selectedBranch && branches && branches.length > 0) {
      const branch = branches.find(b => b.id.toString() === selectedBranch.toString());
      console.log('🏢 Selected branch full data:', JSON.stringify(branch, null, 2));
      
      // Also log all available field keys for debugging
      if (branch) {
        console.log('🏢 Available branch fields:', Object.keys(branch));
        if (branch.clinic) {
          console.log('🏢 Available branch.clinic fields:', Object.keys(branch.clinic));
        }
        if (branch.clinicProfile) {
          console.log('🏢 Available branch.clinicProfile fields:', Object.keys(branch.clinicProfile));
        }
      }
      
      if (branch) {
        // Clinic name should come from branchName as per database structure
        let branchClinicName = '';
        
        // Debug all possible clinic name sources
        console.log('🏢 Clinic name sources check:');
        console.log('  - branch.branchName:', branch.branchName);
        console.log('  - branch.name:', branch.name);
        console.log('  - branch.clinicProfile?.name:', branch.clinicProfile?.name);
        console.log('  - branch.clinic?.name:', branch.clinic?.name);
        console.log('  - branch.clinicName:', branch.clinicName);
        console.log('  - clinic?.name:', clinic?.name);
        
        // Priority: branchName first, then other fallbacks
        if (branch.branchName) {
          branchClinicName = branch.branchName;
          console.log('🏢 Using branch.branchName as clinic name:', branchClinicName);
        } else if (branch.name) {
          branchClinicName = branch.name;
          console.log('🏢 Using branch.name as clinic name:', branchClinicName);
        } else if (branch.clinicProfile?.name) {
          branchClinicName = branch.clinicProfile.name;
          console.log('🏢 Using clinicProfile.name as fallback:', branchClinicName);
        } else if (branch.clinic?.name) {
          branchClinicName = branch.clinic.name;
          console.log('🏢 Using branch.clinic.name as fallback:', branchClinicName);
        } else if (clinic?.name) {
          // Use the main clinic name as last fallback
          branchClinicName = clinic.name;
          console.log('🏢 Using main clinic.name as fallback:', branchClinicName);
        }
        
        // Try multiple possible field names for address
        let branchAddress = '';
        
        console.log('🏢 Address sources check:');
        console.log('  - branch.streetAddress:', branch.streetAddress);
        console.log('  - branch.address:', branch.address);
        console.log('  - branch.fullAddress:', branch.fullAddress);
        console.log('  - branch.clinicProfile?.address:', branch.clinicProfile?.address);
        console.log('  - branch.clinic?.address:', branch.clinic?.address);
        console.log('  - clinic?.address:', clinic?.address);
        
        if (branch.streetAddress) {
          branchAddress = branch.streetAddress;
          console.log('🏢 Using branch.streetAddress:', branchAddress);
        } else if (branch.address) {
          branchAddress = branch.address;
          console.log('🏢 Using branch.address:', branchAddress);
        } else if (branch.fullAddress) {
          branchAddress = branch.fullAddress;
          console.log('🏢 Using branch.fullAddress:', branchAddress);
        } else if (branch.clinicProfile?.address) {
          branchAddress = branch.clinicProfile.address;
          console.log('🏢 Using clinicProfile.address:', branchAddress);
        } else if (branch.clinic?.address) {
          branchAddress = branch.clinic.address;
          console.log('🏢 Using branch.clinic.address:', branchAddress);
        } else if (clinic?.address) {
          branchAddress = clinic.address;
          console.log('🏢 Using fallback clinic.address:', branchAddress);
        }
        
        console.log('🏢 Final clinic name:', branchClinicName);
        console.log('🏢 Final clinic address:', branchAddress);
        
        setClinicName(branchClinicName);
        setClinicAddress(branchAddress);
        
        // Clear any previous errors since we're auto-populating
        clearFieldError('clinicName');
        clearFieldError('clinicAddress');
      }
    } else if (!selectedBranch && clinic) {
      // Reset to main clinic data when no branch selected
      console.log('🏢 Resetting to main clinic data:', clinic?.name, clinic?.address);
      setClinicName(clinic.name || '');
      setClinicAddress(clinic.address || '');
    }
  }, [selectedBranch, branches, clinic]);

  // Reset form
  const resetForm = () => {
    setCurrentStep(1);
    setName('');
    setNameSuffix('');
    setEmail('');
    setPhoneNumber('');
    setAbout('');
    setTitle('');
    setLicenseNumber('');
    setLicenseIssuingBody('');
    setLicenseExpiryDate('');
    setRegistrationNumber('');
    setPrimarySpecialization('');
    setEducationQualification('');
    setYearsOfExperience('');
    setClinicName('');
    setClinicAddress('');
    setSelectedBranch('');
    setWorkingHours(defaultWorkingHours);
    setConsultationTypes([]);
    setServicesOffered([]);
    setConsultationFee('');
    setAcceptsInsurance(false);
    setAcceptsBPJS(false);
    setEmergencyAvailability(false);
    setPassword('');
    setConfirmPassword('');
    setSipFile(null);
    setStrFile(null);
    setIjazahFiles([]);
    setCertificationFiles([]);
    setErrors({});
  };

  // Clear errors when fields are updated
  const clearFieldError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Validate required fields
    const newErrors = {};
    
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!validateEmail(email)) newErrors.email = 'Invalid email format';
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!validatePhone(phoneNumber)) newErrors.phoneNumber = 'Invalid phone number';
    if (!title.trim()) newErrors.title = 'Professional title is required';
    if (!password) newErrors.password = 'Password is required';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    // Professional info validation
    if (!licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (!licenseIssuingBody.trim()) newErrors.licenseIssuingBody = 'License issuing body is required';
    if (!licenseExpiryDate) newErrors.licenseExpiryDate = 'License expiry date is required';
    if (!registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required';
    if (!primarySpecialization) newErrors.primarySpecialization = 'Primary specialization is required';
    if (!educationQualification) newErrors.educationQualification = 'Education qualification is required';
    
    // Clinic info validation (auto-populated from clinic data)
    if (!clinicName.trim()) newErrors.clinicName = 'Clinic name is required (should be auto-populated)';
    if (!clinicAddress.trim()) newErrors.clinicAddress = 'Clinic address is required (should be auto-populated)';
    
    // File validation
    if (!sipFile) newErrors.sipFile = 'SIP file is required';
    if (!strFile) newErrors.strFile = 'STR file is required';
    if (ijazahFiles.length === 0) newErrors.ijazahFiles = 'At least one education certificate is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      return;
    }
    
    try {
      // Prepare form data
      const formData = new FormData();
      
      // Personal Information
      const finalName = nameSuffix.trim() ? `${name.trim()}, ${nameSuffix.trim()}` : name.trim();
      formData.append('name', finalName);
      formData.append('email', email);
      formData.append('phoneNumber', phoneNumber);
      formData.append('about', about);
      
      // Professional Information
      formData.append('title', title);
      formData.append('licenseNumber', licenseNumber);
      formData.append('licenseIssuingBody', licenseIssuingBody);
      formData.append('licenseExpiryDate', licenseExpiryDate);
      formData.append('registrationNumber', registrationNumber);
      formData.append('primarySpecialization', primarySpecialization);
      formData.append('educationQualification', educationQualification);
      formData.append('yearsOfExperience', yearsOfExperience || '0');
      
      // Clinic Information
      formData.append('clinicName', clinicName);
      formData.append('clinicAddress', clinicAddress);
      formData.append('clinicWorkingHours', JSON.stringify(workingHours));
      formData.append('consultationTypes', JSON.stringify(consultationTypes));
      formData.append('servicesOffered', JSON.stringify(servicesOffered));
      
      // Optional Information
      formData.append('consultationFee', consultationFee || '0');
      formData.append('acceptsInsurance', acceptsInsurance);
      formData.append('acceptsBPJS', acceptsBPJS);
      formData.append('emergencyAvailability', emergencyAvailability);

      // Clinic linkage metadata
      if (clinic?.id && !formData.has('clinicId')) {
        formData.append('clinicId', clinic.id.toString());
      }
      if (selectedBranch && !formData.has('branchId')) {
        formData.append('branchId', selectedBranch);
      }
      if (!formData.has('registrationType')) {
        formData.append('registrationType', 'clinic-staff');
      }
      
      // Authentication
      formData.append('password', password);
      
      // Role and assignment info (for clinic staff assignment)
      formData.append('selectedBranch', selectedBranch);
      formData.append('role', 'dentist');
      
      // Files
      if (sipFile) formData.append('sipFile', sipFile);
      if (strFile) formData.append('strFile', strFile);
      ijazahFiles.forEach(file => formData.append('ijazahFiles', file));
      certificationFiles.forEach(file => formData.append('certificationFiles', file));
      
      await onSubmit(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Add dentist error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\d+\-\s()]+$/;
    return phoneRegex.test(phone) && phone.length >= 10;
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

  const handleWorkingHoursChange = (index, field, value) => {
    setWorkingHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, [field]: value } : hour
    ));
  };

  // Validation per step
  const validateStep1 = () => {
    const newErrors = {};
    let valid = true;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      valid = false;
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
      valid = false;
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
      valid = false;
    } else if (!validatePhone(phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number';
      valid = false;
    }
    if (!title.trim()) {
      newErrors.title = 'Professional title is required';
      valid = false;
    }
    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const validateStep2 = () => {
    const newErrors = {};
    let valid = true;

    if (!licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
      valid = false;
    }
    if (!licenseIssuingBody.trim()) {
      newErrors.licenseIssuingBody = 'License issuing body is required';
      valid = false;
    }
    if (!licenseExpiryDate) {
      newErrors.licenseExpiryDate = 'License expiry date is required';
      valid = false;
    }
    if (!registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
      valid = false;
    }
    if (!primarySpecialization) {
      newErrors.primarySpecialization = 'Primary specialization is required';
      valid = false;
    }
    if (!educationQualification) {
      newErrors.educationQualification = 'Education qualification is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const validateStep3 = () => {
    const newErrors = {};
    let valid = true;

    // Check if branch is selected first
    if (!selectedBranch) {
      newErrors.selectedBranch = 'Please select a branch first';
      valid = false;
    }

    // Check if clinic name is populated (should happen after branch selection)
    if (!clinicName.trim()) {
      if (selectedBranch) {
        newErrors.clinicName = 'Clinic name could not be loaded. Please try selecting the branch again.';
      } else {
        newErrors.clinicName = 'Please select a branch to populate clinic information';
      }
      valid = false;
    }

    // Check if clinic address is populated
    if (!clinicAddress.trim()) {
      if (selectedBranch) {
        newErrors.clinicAddress = 'Clinic address could not be loaded. Please try selecting the branch again.';
      } else {
        newErrors.clinicAddress = 'Please select a branch to populate clinic information';
      }
      valid = false;
    }

    if (!sipFile) {
      newErrors.sipFile = 'SIP file is required';
      valid = false;
    }
    if (!strFile) {
      newErrors.strFile = 'STR file is required';
      valid = false;
    }
    if (ijazahFiles.length === 0) {
      newErrors.ijazahFiles = 'At least one education certificate is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleNextStep = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      default:
        isValid = true;
    }

  if (isValid) {
    setCurrentStep(prev => prev + 1);
  }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal disableScroll={true}>
      <div 
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" 
        aria-hidden="true"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-8 pointer-events-none">
        <div className="pointer-events-auto my-8 w-full max-w-4xl">
          <div
            className="relative w-full max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('clinic.staff.modals.addDentist.title') || 'Add New Dentist'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('clinic.staff.modals.addDentist.subtitle') || 'Register a new dentist with professional credentials'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <AppIcon name="X" size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step 
                      ? 'bg-blue-600' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {currentStep} of 4: {
                currentStep === 1 ? 'Personal Info' :
                currentStep === 2 ? 'Professional Info' :
                currentStep === 3 ? 'Clinic & Documents' :
                'Review & Submit'
              }
            </span>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError('name');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter full name"
                      required
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Suffix / Specialist Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={nameSuffix}
                      onChange={(e) => {
                        setNameSuffix(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Sp.Ort, Sp.KG, M.Kes"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError('email');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter email address"
                      required
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        clearFieldError('phoneNumber');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.phoneNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter phone number"
                      required
                    />
                    {errors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phoneNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Professional Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        clearFieldError('title');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.title ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., drg., drg. Sp.KG"
                      required
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    About
                  </label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Brief professional summary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError('password');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.password ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter password"
                      required
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError('confirmPassword');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.confirmPassword ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Confirm password"
                      required
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Professional Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      License Number *
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                                              onChange={(e) => {
                          setLicenseNumber(e.target.value);
                          clearFieldError('licenseNumber');
                        }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.licenseNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter license number"
                      required
                    />
                    {errors.licenseNumber && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.licenseNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      License Issuing Body *
                    </label>
                    <input
                      type="text"
                      value={licenseIssuingBody}
                      onChange={(e) => {
                        setLicenseIssuingBody(e.target.value);
                        clearFieldError('licenseIssuingBody');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.licenseIssuingBody ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., PDGI, KKI"
                      required
                    />
                    {errors.licenseIssuingBody && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.licenseIssuingBody}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      License Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={licenseExpiryDate}
                      onChange={(e) => {
                        setLicenseExpiryDate(e.target.value);
                        clearFieldError('licenseExpiryDate');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.licenseExpiryDate ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    />
                    {errors.licenseExpiryDate && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.licenseExpiryDate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => {
                        setRegistrationNumber(e.target.value);
                        clearFieldError('registrationNumber');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.registrationNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter registration number"
                      required
                    />
                    {errors.registrationNumber && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.registrationNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Specialization *
                    </label>
                    <select
                      value={primarySpecialization}
                      onChange={(e) => {
                        setPrimarySpecialization(e.target.value);
                        clearFieldError('primarySpecialization');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.primarySpecialization ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    >
                      <option value="">Select specialization</option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                    {errors.primarySpecialization && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.primarySpecialization}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Education Qualification *
                    </label>
                    <select
                      value={educationQualification}
                      onChange={(e) => {
                        setEducationQualification(e.target.value);
                        clearFieldError('educationQualification');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.educationQualification ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    >
                      <option value="">Select education level</option>
                      {educationLevels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    {errors.educationQualification && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.educationQualification}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Consultation Fee (Rp)
                    </label>
                    <input
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Clinic Information & Documents */}
            {currentStep === 3 && (
              <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Clinic Information & Documents
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clinic Name *
                    </label>
                    {clinicLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Loading clinic data...</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={clinicName}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed ${
                          errors.clinicName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Clinic name will be loaded automatically"
                      />
                    )}
                    {errors.clinicName && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clinicName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch Assignment
                    </label>
                    {clinicLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Loading branches...</span>
                      </div>
                    ) : branches && branches.length > 0 ? (
                      <select
                        value={selectedBranch}
                        onChange={(e) => {
                          setSelectedBranch(e.target.value);
                          clearFieldError('selectedBranch');
                          clearFieldError('clinicName');
                          clearFieldError('clinicAddress');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.selectedBranch ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.branchName || branch.name} {branch.branchCode && `(${branch.branchCode})`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">No branches available</span>
                      </div>
                    )}
                    {errors.selectedBranch && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.selectedBranch}</p>
                    )}
                    {branches && branches.length === 0 && !clinicLoading && (
                      <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                        No branches found. Please contact your clinic owner to set up branches.
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Clinic Address *
                  </label>
                  {clinicLoading ? (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Loading clinic address...</span>
                    </div>
                  ) : (
                    <textarea
                      value={clinicAddress}
                      readOnly
                      rows={2}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed resize-none ${
                        errors.clinicAddress ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Clinic address will be loaded automatically"
                    />
                  )}
                  {errors.clinicAddress && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clinicAddress}</p>
                  )}
                </div>
                
                {/* Documents Upload */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Required Documents</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SIP (Surat Izin Praktik) *
                      </label>
                      <input
                        ref={sipFileRef}
                        type="file"
                        onChange={(e) => {
                        setSipFile(e.target.files[0]);
                        clearFieldError('sipFile');
                      }}
                        accept="image/*,.pdf"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.sipFile ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        required
                      />
                      {errors.sipFile && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sipFile}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        STR (Surat Tanda Registrasi) *
                      </label>
                      <input
                        ref={strFileRef}
                        type="file"
                        onChange={(e) => {
                        setStrFile(e.target.files[0]);
                        clearFieldError('strFile');
                      }}
                        accept="image/*,.pdf"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.strFile ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        required
                      />
                      {errors.strFile && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.strFile}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ijazah (Education Certificate) *
                      </label>
                      <input
                        ref={ijazahFileRef}
                        type="file"
                        onChange={(e) => {
                          setIjazahFiles(Array.from(e.target.files));
                          clearFieldError('ijazahFiles');
                        }}
                        accept="image/*,.pdf"
                        multiple
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.ijazahFiles ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        required
                      />
                      {errors.ijazahFiles && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.ijazahFiles}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Certification Files (Optional)
                      </label>
                      <input
                        ref={certificationFileRef}
                        type="file"
                        onChange={(e) => setCertificationFiles(Array.from(e.target.files))}
                        accept="image/*,.pdf"
                        multiple
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Services & Consultation Types */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Consultation Types
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {consultationTypeOptions.map((type) => (
                        <label key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={consultationTypes.includes(type)}
                            onChange={() => handleConsultationTypeChange(type)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Services Offered
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {serviceOptions.map((service) => (
                        <label key={service} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={servicesOffered.includes(service)}
                            onChange={() => handleServiceChange(service)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Additional Options */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={acceptsInsurance}
                      onChange={(e) => setAcceptsInsurance(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Accepts Private Insurance</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={acceptsBPJS}
                      onChange={(e) => setAcceptsBPJS(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Accepts BPJS</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={emergencyAvailability}
                      onChange={(e) => setEmergencyAvailability(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Available for Emergency Consultations</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Review & Submit
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{email}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{phoneNumber}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Title:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{title}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">License:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{licenseNumber}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Specialization:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{primarySpecialization}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Clinic:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{clinicName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Documents:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {[sipFile, strFile, ...ijazahFiles].filter(Boolean).length} files uploaded
                      </span>
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Dentist'}
              </button>
            )}
          </div>
        </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AddDentistModal;
