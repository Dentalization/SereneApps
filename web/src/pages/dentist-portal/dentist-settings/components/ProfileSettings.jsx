import React, { useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { resolveMediaUrl } from '../../../../utils/media';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useToast } from '../../../../contexts/ToastContext';

const ProfileSettings = ({ user, onDataChange }) => {
  const { refreshUserData, clearUserData } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar_url || user?.profile?.avatar_url || null);
  const [loading, setLoading] = useState(!user); // Only start loading if no user prop
  const [userProfile, setUserProfile] = useState(user || null); // Initialize with user prop
  const [documents, setDocuments] = useState({
    sipFile: user?.profile?.uploadedFiles?.sipFile || null,
    strFile: user?.profile?.uploadedFiles?.strFile || null,
    ijazahFiles: user?.profile?.uploadedFiles?.ijazahFiles || [],
    certificationFiles: user?.profile?.uploadedFiles?.certificationFiles || []
  });
  const [documentUploading, setDocumentUploading] = useState(false);
  const resolvedAvatarUrl = resolveMediaUrl(avatar);
  
  // Helper to split full name into main name and suffix
  const splitNameAndSuffix = (fullName) => {
    if (!fullName) return { name: '', suffix: '' };
    const commaIndex = fullName.indexOf(',');
    if (commaIndex === -1) {
      return { name: fullName.trim(), suffix: '' };
    }
    return {
      name: fullName.substring(0, commaIndex).trim(),
      suffix: fullName.substring(commaIndex + 1).trim()
    };
  };

  const initialNameSplit = splitNameAndSuffix(user?.name || '');

  // Initialize editData with user prop data
  const [editData, setEditData] = useState({
    name: initialNameSplit.name,
    nameSuffix: initialNameSplit.suffix,
    email: user?.email || '',
    phone: user?.profile?.phone_number || user?.phoneNumber || '',
    title: user?.profile?.title || '',
    license_number: user?.profile?.license_number || '',
    registration_number: user?.profile?.registration_number || '',
    primary_specialization: user?.profile?.primary_specialization || '',
    years_of_experience: user?.profile?.years_of_experience || '',
    education_qualification: user?.profile?.education_qualification || '',
    clinic_name: user?.profile?.clinic_name || '',
    clinic_address: user?.profile?.clinic_address || '',
    consultation_fee: user?.profile?.consultation_fee || '',
    about: user?.profile?.about || user?.about || ''
  });

  // Fetch user profile data from database
  const fetchUserProfile = async (retryCount = 0) => {
    try {
      setLoading(true);
      
      const response = await authHttp.get('/user/profile');
      const userData = response.data;
      console.log('Fetched user profile:', userData);
      
      setUserProfile(userData);
      
      // Update editData with real database values
      const fetchedNameSplit = splitNameAndSuffix(userData.name || '');
      setEditData({
        name: fetchedNameSplit.name,
        nameSuffix: fetchedNameSplit.suffix,
        email: userData.email || '',
        phone: userData.profile?.phone_number || userData.phoneNumber || '',
        title: userData.profile?.title || '',
        license_number: userData.profile?.license_number || '',
        registration_number: userData.profile?.registration_number || '',
        primary_specialization: userData.profile?.primary_specialization || '',
        years_of_experience: userData.profile?.years_of_experience || '',
        education_qualification: userData.profile?.education_qualification || '',
        clinic_name: userData.profile?.clinic_name || '',
        clinic_address: userData.profile?.clinic_address || '',
        consultation_fee: userData.profile?.consultation_fee || '',
        about: userData.profile?.about || userData.about || ''
      });

      if (userData.avatar_url) {
        setAvatar(userData.avatar_url);
      } else if (userData.profile?.avatar_url) {
        setAvatar(userData.profile.avatar_url);
      }

      // Set documents information if available
      if (userData.profile?.uploadedFiles) {
        setDocuments({
          sipFile: userData.profile.uploadedFiles.sipFile,
          strFile: userData.profile.uploadedFiles.strFile,
          ijazahFiles: userData.profile.uploadedFiles.ijazahFiles || [],
          certificationFiles: userData.profile.uploadedFiles.certificationFiles || []
        });
      }

    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // Retry once if it fails
      if (retryCount < 1) {
        console.log('Retrying fetchUserProfile...');
        setTimeout(() => fetchUserProfile(retryCount + 1), 1000);
        return;
      }
      
      // Fallback to passed user prop if API fails after retry
      if (user) {
        console.log('Falling back to user prop:', user);
        setUserProfile(user);
        const fallbackNameSplit = splitNameAndSuffix(user.name || '');
        setEditData({
          name: fallbackNameSplit.name,
          nameSuffix: fallbackNameSplit.suffix,
          email: user.email || '',
          phone: user.profile?.phone_number || user.phoneNumber || '',
          title: user.profile?.title || '',
          license_number: user.profile?.license_number || '',
          registration_number: user.profile?.registration_number || '',
          primary_specialization: user.profile?.primary_specialization || '',
          years_of_experience: user.profile?.years_of_experience || '',
          education_qualification: user.profile?.education_qualification || '',
          clinic_name: user.profile?.clinic_name || '',
          clinic_address: user.profile?.clinic_address || '',
          consultation_fee: user.profile?.consultation_fee || '',
          about: user.profile?.about || user.about || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prioritize user prop data first (from AuthContext)
    if (user) {
      setUserProfile(user);
      setLoading(false);
      
      // Set avatar
      const avatarUrl = user.avatar_url || user.profile?.avatar_url;
      setAvatar(avatarUrl);
      
      const propNameSplit = splitNameAndSuffix(user.name || '');
      setEditData({
        name: propNameSplit.name,
        nameSuffix: propNameSplit.suffix,
        email: user.email || '',
        phone: user.profile?.phone_number || user.phoneNumber || '',
        title: user.profile?.title || '',
        license_number: user.profile?.license_number || '',
        registration_number: user.profile?.registration_number || '',
        primary_specialization: user.profile?.primary_specialization || '',
        years_of_experience: user.profile?.years_of_experience || '',
        education_qualification: user.profile?.education_qualification || '',
        clinic_name: user.profile?.clinic_name || '',
        clinic_address: user.profile?.clinic_address || '',
        consultation_fee: user.profile?.consultation_fee || '',
        about: user.profile?.about || user.about || ''
      });

      // Set documents from user data
      if (user.profile?.uploadedFiles) {
        setDocuments({
          sipFile: user.profile.uploadedFiles.sipFile,
          strFile: user.profile.uploadedFiles.strFile,
          ijazahFiles: user.profile.uploadedFiles.ijazahFiles || [],
          certificationFiles: user.profile.uploadedFiles.certificationFiles || []
        });
      }
      
      // Only fetch additional data if user doesn't have complete profile data
      if (!user.profile || !user.profile.title) {
        fetchUserProfile();
      }
    } else {
      // Only fetch from API if no user prop data
      fetchUserProfile();
    }
  }, [user]);

  // Remove the separate useEffect for user prop updates since we handle it above

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
    onDataChange?.(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Prepare data for API
      const finalName = editData.nameSuffix?.trim()
        ? `${editData.name.trim()}, ${editData.nameSuffix.trim()}`
        : editData.name.trim();

      const profileData = {
        name: finalName,
        email: editData.email,
        phoneNumber: editData.phone,
        profile: {
          phone_number: editData.phone,
          title: editData.title,
          license_number: editData.license_number,
          registration_number: editData.registration_number,
          primary_specialization: editData.primary_specialization,
          years_of_experience: parseInt(editData.years_of_experience) || null,
          education_qualification: editData.education_qualification,
          clinic_name: editData.clinic_name,
          clinic_address: editData.clinic_address,
          consultation_fee: parseInt(editData.consultation_fee) || null,
          about: editData.about
        }
      };

      console.log('Saving profile data:', profileData);

      const response = await authHttp.put('/user/profile', profileData);
      const updatedUser = response.data;
      
      console.log('Profile updated successfully:', updatedUser);
      
      // Update local state with fresh data
      setUserProfile(updatedUser);
      setIsEditing(false);
      onDataChange?.(false);
      
      // Refresh AuthContext to sync data across all components
      await refreshUserData();
      
      // Show success message
      toast.success('Profile saved successfully!');
      
      // Refresh the profile data to ensure consistency
      await fetchUserProfile();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to save profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to current database data
    if (userProfile) {
      const cancelNameSplit = splitNameAndSuffix(userProfile.name || '');
      setEditData({
        name: cancelNameSplit.name,
        nameSuffix: cancelNameSplit.suffix,
        email: userProfile.email || '',
        phone: userProfile.profile?.phone_number || userProfile.phoneNumber || '',
        title: userProfile.profile?.title || '',
        license_number: userProfile.profile?.license_number || '',
        registration_number: userProfile.profile?.registration_number || '',
        primary_specialization: userProfile.profile?.primary_specialization || '',
        years_of_experience: userProfile.profile?.years_of_experience || '',
        education_qualification: userProfile.profile?.education_qualification || '',
        clinic_name: userProfile.profile?.clinic_name || '',
        clinic_address: userProfile.profile?.clinic_address || '',
        consultation_fee: userProfile.profile?.consultation_fee || '',
        about: userProfile.profile?.about || userProfile.about || ''
      });
    }
    setIsEditing(false);
    onDataChange?.(false);
  };

  const handleDocumentUpload = async (documentType, files) => {
    try {
      setDocumentUploading(true);
      
      const formData = new FormData();
      
      if (documentType === 'ijazahFiles' || documentType === 'certificationFiles') {
        // Handle multiple files
        Array.from(files).forEach(file => {
          formData.append(documentType, file);
        });
      } else {
        // Handle single file
        formData.append(documentType, files[0]);
      }

      const response = await authHttp.post('/user/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = response.data;
      console.log('Document uploaded successfully:', result);
      
      // Update documents state
      setDocuments(prev => ({
        ...prev,
        [documentType]: documentType === 'ijazahFiles' || documentType === 'certificationFiles' 
          ? [...(prev[documentType] || []), ...(result.uploadedFiles[documentType] || [])]
          : result.uploadedFiles[documentType]
      }));
      
      onDataChange?.(true);
      toast.success('Document uploaded successfully!');
      
      // Refresh profile data to ensure consistency
      await fetchUserProfile();
      
    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to upload document: ${errorMessage}`);
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDocumentDelete = async (documentType, documentIndex = null) => {
    try {
      setDocumentUploading(true);
      
      const response = await authHttp.delete(`/user/documents/${documentType}${documentIndex !== null ? `/${documentIndex}` : ''}`);

      // Update documents state
      setDocuments(prev => {
        if (documentType === 'ijazahFiles' || documentType === 'certificationFiles') {
          const newFiles = [...(prev[documentType] || [])];
          newFiles.splice(documentIndex, 1);
          return { ...prev, [documentType]: newFiles };
        } else {
          return { ...prev, [documentType]: null };
        }
      });
      
      onDataChange?.(true);
      toast.success('Document deleted successfully!');
      
      // Refresh profile data
      await fetchUserProfile();
      
    } catch (error) {
      console.error('Error deleting document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to delete document: ${errorMessage}`);
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await authHttp.post('/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = response.data;
      console.log('Avatar uploaded successfully:', result);
      
      // Update local state
      setAvatar(result.avatar_url);
      onDataChange?.(true);
      
      // Refresh AuthContext to sync avatar across all components
      await refreshUserData();
      
      // Refresh profile data to get latest info
      await fetchUserProfile();
      
      toast.success('Avatar uploaded successfully!');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to upload avatar: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton (based on pattern from dentist home)
  if (loading) {
    return (
      <div className="p-8 dentist-skeleton">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-64 mb-2"></div>
          <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-96"></div>
        </div>

        {/* Profile Image Skeleton */}
        <div className="space-y-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-4 bg-accent/10 rounded animate-pulse"></div>
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-accent/20 rounded-2xl animate-pulse"></div>
              <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-32"></div>
            </div>
          </div>

          {/* Personal Info Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-48"></div>
            
            {/* Name Field */}
            <div className="flex items-center space-x-6">
              <div className="w-24 h-4 bg-accent/10 rounded animate-pulse"></div>
              <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
            </div>

            {/* Email Field */}
            <div className="flex items-center space-x-6">
              <div className="w-24 h-4 bg-accent/10 rounded animate-pulse"></div>
              <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
            </div>

            {/* Phone Field */}
            <div className="flex items-center space-x-6">
              <div className="w-24 h-4 bg-accent/10 rounded animate-pulse"></div>
              <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Professional Info Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-56"></div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-6">
                  <div className="w-32 h-4 bg-accent/10 rounded animate-pulse"></div>
                  <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinic Info Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-48"></div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-6">
                  <div className="w-32 h-4 bg-accent/10 rounded animate-pulse"></div>
                  <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Skeleton */}
          <div className="space-y-6">
            <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-52"></div>
            
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-6">
                <div className="w-32 h-4 bg-accent/10 rounded animate-pulse"></div>
                <div className="flex-1 flex items-center space-x-4">
                  <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-32"></div>
                  <div className="h-8 bg-accent/10 rounded-lg animate-pulse w-20"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex justify-end space-x-4 pt-6">
            <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-24"></div>
            <div className="h-12 bg-accent/20 rounded-xl animate-pulse w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Document Upload Loading Indicator */}
      {documentUploading && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl border border-border/40 shadow-2xl p-6 flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-primary font-medium">
                Uploading document...
              </span>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-2 theme-transition">
            {t('settings.profileSettings')}
          </h2>
          <p className="text-secondary theme-transition">
            {t('settings.managePersonalProfessional')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="group relative overflow-hidden bg-surface border-2 border-primary/20 hover:border-red-500 text-secondary hover:text-white px-5 py-2.5 rounded-xl font-semibold shadow-theme-md transition-all duration-200 theme-transition"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon name="X" size={16} />
                  Cancel
                </span>
                <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"></div>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-theme-lg hover:shadow-theme-xl transition-all duration-200"
              >
                <Icon name="Save" size={16} />
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-theme-lg hover:shadow-theme-xl transition-all duration-200"
            >
              <Icon name="Edit" size={16} />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6">
          <div className="text-sm font-semibold text-primary w-24 uppercase tracking-wider theme-transition">
            Profile Image
          </div>
          <div className="flex-1 flex items-center space-x-6">
            <div className="relative group/avatar">
              <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center overflow-hidden shadow-theme-md transform group-hover/avatar:scale-105 transition-all duration-300">
                {resolvedAvatarUrl ? (
                  <img 
                    src={resolvedAvatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                    onLoad={(e) => {
                      console.log('✅ Avatar loaded successfully:', resolvedAvatarUrl);
                      console.log('✅ Image dimensions:', e.target.naturalWidth, 'x', e.target.naturalHeight);
                    }}
                    onError={(e) => {
                      console.error('❌ Error loading avatar path:', avatar);
                      console.error('❌ Full URL attempted:', resolvedAvatarUrl);
                      console.error('❌ Error event:', e);
                      // Show fallback by resetting avatar
                      setAvatar(null);
                    }}
                  />
                ) : (
                  <Icon name="User" size={36} className="text-white drop-shadow-lg" />
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-accent/30 blur-lg opacity-50 group-hover/avatar:opacity-75 transition-opacity duration-300"></div>
            </div>
            {isEditing && (
              <div className="relative inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={loading}
                />
                <button 
                  type="button"
                  className="group/btn relative overflow-hidden bg-surface border-2 border-primary hover:border-accent text-primary hover:text-white px-6 py-3 rounded-xl font-medium shadow-theme-md hover:shadow-theme-lg transform hover:scale-105 transition-all duration-300 theme-transition disabled:opacity-50"
                  disabled={loading}
                >
                  <span className="relative z-0 flex items-center">
                    <Icon name="Upload" size={18} className="mr-2" />
                    {loading ? t('settings.uploading') : t('settings.uploadImage')}
                  </span>
                  <div className="absolute inset-0 bg-accent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 z-0"></div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-primary border-b border-primary/20 pb-2">
            {t('settings.personalInformation')}
          </h3>
          
          {/* Name */}
          <div className="flex items-center space-x-6">
            <div className="text-sm font-semibold text-primary w-24 uppercase tracking-wider theme-transition">
              {t('settings.name')}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                      placeholder={t('settings.enterFullName')}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={editData.nameSuffix || ''}
                      onChange={(e) => handleInputChange('nameSuffix', e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                      placeholder="e.g., Sp.Ort, Sp.KG, M.Kes"
                    />
                    <span className="text-xs text-secondary mt-1 block">Gelar Belakang (Suffix)</span>
                  </div>
                </div>
              ) : (
                <div className="text-primary theme-transition font-medium text-lg">
                  {user?.name || (
                    <span className="text-muted italic">{t('settings.notFilledYet')}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-6">
            <div className="text-sm font-semibold text-primary w-24 uppercase tracking-wider theme-transition">
              Email
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Enter email address"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg">
                  {user?.email || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center space-x-6">
            <div className="text-sm font-semibold text-primary w-24 uppercase tracking-wider theme-transition">
              Phone
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg">
                  {user?.profile?.phone_number || user?.phoneNumber || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-primary border-b border-primary/20 pb-2">
            Professional Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                Professional Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="e.g., DDS, DMD"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.title || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>

            {/* License Number */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                STR Number
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.license_number}
                  onChange={(e) => handleInputChange('license_number', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Enter STR number"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.license_number || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>

            {/* Registration Number */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                SIP Number
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.registration_number}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Enter SIP number"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.registration_number || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>

            {/* Specialization */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                Specialization
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.primary_specialization}
                  onChange={(e) => handleInputChange('primary_specialization', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="e.g., General Dentist"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.primary_specialization || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>

            {/* Years of Experience */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                Experience (years)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.years_of_experience}
                  onChange={(e) => handleInputChange('years_of_experience', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Years of experience"
                  min="0"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.years_of_experience ? `${user.profile.years_of_experience} years` : (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>

            {/* Education */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                Education
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.education_qualification}
                  onChange={(e) => handleInputChange('education_qualification', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Education qualification"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.education_qualification || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinic Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-primary border-b border-primary/20 pb-2">
            Clinic Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clinic Name */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                Clinic Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.clinic_name}
                  onChange={(e) => handleInputChange('clinic_name', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Clinic name"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.clinic_name || (
                    <span className="text-muted italic">Not filled yet</span>
                  )}
                </div>
              )}
            </div>

            {/* Consultation Fee */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
                Consultation Fee
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.consultation_fee}
                  onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary theme-transition"
                  placeholder="Consultation fee"
                  min="0"
                />
              ) : (
                <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary">
                  {user?.profile?.consultation_fee ? 
                    `Rp ${parseInt(user.profile.consultation_fee).toLocaleString('id-ID')}` : 
                    <span className="text-muted italic">Not filled yet</span>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Clinic Address */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
              Clinic Address
            </label>
            {isEditing ? (
              <textarea
                value={editData.clinic_address}
                onChange={(e) => handleInputChange('clinic_address', e.target.value)}
                rows={3}
                className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary resize-none theme-transition"
                placeholder="Enter full clinic address"
              />
            ) : (
              <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary min-h-[100px]">
                {user?.profile?.clinic_address || (
                  <span className="text-muted italic">Not filled yet</span>
                )}
              </div>
            )}
          </div>

          {/* About */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
              About You
            </label>
            {isEditing ? (
              <textarea
                value={editData.about}
                onChange={(e) => handleInputChange('about', e.target.value)}
                rows={4}
                className="w-full px-6 py-4 rounded-2xl border-2 border-primary bg-surface text-primary focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent backdrop-blur-sm transition-all duration-300 placeholder:text-secondary resize-none theme-transition"
                placeholder="Tell us about yourself and your practice"
              />
            ) : (
              <div className="text-primary theme-transition font-medium text-lg px-6 py-4 rounded-2xl bg-surface border border-primary min-h-[120px]">
                {user?.profile?.about || user?.about || (
                  <span className="text-muted italic">Not filled yet</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Management */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-primary border-b border-primary/20 pb-2">
            Credential Documents
          </h3>
          
          {/* SIP Document */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
              Practice Permit (SIP)
            </label>
            <div className="flex items-center space-x-4">
              {documents.sipFile ? (
                <div className="flex items-center space-x-3 px-4 py-3 bg-surface border border-green-500 rounded-xl">
                  <Icon name="FileText" size={20} className="text-green-600" />
                  <span className="text-primary font-medium">SIP available</span>
                  {isEditing && (
                    <button
                      onClick={() => handleDocumentDelete('sipFile')}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      disabled={documentUploading}
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3 px-4 py-3 bg-surface border border-red-500 rounded-xl">
                  <Icon name="AlertCircle" size={20} className="text-red-600" />
                  <span className="text-muted">No SIP document yet</span>
                </div>
              )}
              {isEditing && (
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload('sipFile', e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={documentUploading}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                    disabled={documentUploading}
                  >
                    {documentUploading ? 'Uploading...' : (documents.sipFile ? 'Change' : 'Upload')} SIP
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STR Document */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
              Registration Certificate (STR)
            </label>
            <div className="flex items-center space-x-4">
              {documents.strFile ? (
                <div className="flex items-center space-x-3 px-4 py-3 bg-surface border border-green-500 rounded-xl">
                  <Icon name="FileText" size={20} className="text-green-600" />
                  <span className="text-primary font-medium">STR available</span>
                  {isEditing && (
                    <button
                      onClick={() => handleDocumentDelete('strFile')}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      disabled={documentUploading}
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3 px-4 py-3 bg-surface border border-red-500 rounded-xl">
                  <Icon name="AlertCircle" size={20} className="text-red-600" />
                  <span className="text-muted">No STR document yet</span>
                </div>
              )}
              {isEditing && (
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload('strFile', e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={documentUploading}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                    disabled={documentUploading}
                  >
                    {documentUploading ? 'Uploading...' : (documents.strFile ? 'Change' : 'Upload')} STR
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Diploma Documents */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
              Education Diplomas
            </label>
            <div className="space-y-2">
              {documents.ijazahFiles && documents.ijazahFiles.length > 0 ? (
                <div className="space-y-2">
                  {documents.ijazahFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-3 px-4 py-3 bg-surface border border-green-500 rounded-xl">
                      <Icon name="FileText" size={20} className="text-green-600" />
                      <span className="text-primary font-medium">Diploma {index + 1}</span>
                      {isEditing && (
                        <button
                          onClick={() => handleDocumentDelete('ijazahFiles', index)}
                          className="text-red-500 hover:text-red-700 transition-colors ml-auto"
                          disabled={documentUploading}
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-3 px-4 py-3 bg-surface border border-red-500 rounded-xl">
                  <Icon name="AlertCircle" size={20} className="text-red-600" />
                  <span className="text-muted">No diploma documents yet</span>
                </div>
              )}
              {isEditing && (
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleDocumentUpload('ijazahFiles', e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={documentUploading}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                    disabled={documentUploading}
                  >
                    {documentUploading ? 'Uploading...' : 'Add Diploma'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Certification Documents */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-primary uppercase tracking-wider theme-transition">
              Training/Course Certificates
            </label>
            <div className="space-y-2">
              {documents.certificationFiles && documents.certificationFiles.length > 0 ? (
                <div className="space-y-2">
                  {documents.certificationFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-3 px-4 py-3 bg-surface border border-green-500 rounded-xl">
                      <Icon name="Award" size={20} className="text-green-600" />
                      <span className="text-primary font-medium">Certificate {index + 1}</span>
                      {isEditing && (
                        <button
                          onClick={() => handleDocumentDelete('certificationFiles', index)}
                          className="text-red-500 hover:text-red-700 transition-colors ml-auto"
                          disabled={documentUploading}
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-3 px-4 py-3 bg-surface border border-orange-500 rounded-xl">
                  <Icon name="Info" size={20} className="text-orange-600" />
                  <span className="text-muted">No certificates yet (optional)</span>
                </div>
              )}
              {isEditing && (
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleDocumentUpload('certificationFiles', e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={documentUploading}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                    disabled={documentUploading}
                  >
                    {documentUploading ? 'Uploading...' : 'Add Certificate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar — only shown while editing for convenience when scrolled down */}
      {isEditing && (
        <div className="mt-10 pt-6 border-t border-primary/10 flex items-center justify-end gap-3 theme-transition">
          <button
            onClick={handleCancel}
            className="group relative overflow-hidden bg-surface border-2 border-primary/20 hover:border-red-500 text-secondary hover:text-white px-6 py-3 rounded-xl font-semibold shadow-theme-md transition-all duration-200 theme-transition"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon name="X" size={16} />
              Cancel
            </span>
            <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"></div>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-semibold shadow-theme-lg hover:shadow-theme-xl transition-all duration-200"
          >
            <Icon name="Save" size={16} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
