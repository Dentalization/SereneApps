import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { resolveMediaUrl } from '../../../../utils/media';
import { authHttp } from '../../../../utils/httpClient';

const ProfileSettings = () => {
  const { user, setUser, refreshUserData } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    about: '',
    profile: {
      title: '',
      license_number: '',
      registration_number: '',
      primary_specialization: '',
      years_of_experience: '',
      education_qualification: '',
      clinic_name: '',
      clinic_address: '',
      consultation_fee: '',
      phone_number: ''
    }
  });

  // Password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize form data with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || user.phone_number || '',
        about: user.about || '',
        profile: {
          title: user.profile?.title || '',
          license_number: user.profile?.license_number || '',
          registration_number: user.profile?.registration_number || '',
          primary_specialization: user.profile?.primary_specialization || '',
          years_of_experience: user.profile?.years_of_experience || '',
          education_qualification: user.profile?.education_qualification || '',
          clinic_name: user.profile?.clinic_name || '',
          clinic_address: user.profile?.clinic_address || '',
          consultation_fee: user.profile?.consultation_fee || '',
          phone_number: user.profile?.phone_number || user.phoneNumber || user.phone_number || ''
        }
      });
    }
  }, [user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await authHttp.put('/auth/user/profile', formData);
      setUser(response.data);
      showMessage('success', t('profile.updateSuccess') || 'Profile updated successfully!');
      await refreshUserData();
    } catch (error) {
      console.error('Profile update error:', error);
      showMessage('error', error.response?.data?.message || t('profile.updateError') || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', t('profile.passwordMismatch') || 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', t('profile.passwordTooShort') || 'Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);

    try {
      await authHttp.put('/auth/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      showMessage('success', t('profile.passwordChangeSuccess') || 'Password changed successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      showMessage('error', error.response?.data?.message || t('profile.passwordChangeError') || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', t('profile.invalidImageType') || 'Please select a valid image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', t('profile.imageTooLarge') || 'Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await authHttp.post('/auth/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh user data to get updated avatar
      await refreshUserData();
      showMessage('success', t('settings.avatarUploadSuccess') || 'Profile picture updated successfully!');
      await refreshUserData();
    } catch (error) {
      console.error('Avatar upload error:', error);
      showMessage('error', error.response?.data?.message || t('profile.avatarUploadError') || 'Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const avatarPath = user?.avatar_url || user?.profile?.avatar_url;
  const avatarUrl = resolveMediaUrl(avatarPath);

  const isDentist = user?.roles?.includes('dentist');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover border-4 border-accent/30" 
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-accent/10 border-4 border-accent/30 flex items-center justify-center">
                <Icon name="User" size={32} className="text-accent" />
              </div>
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Icon name="Loader2" size={20} className="text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary">
              {t('profile.settings') || 'Profile Settings'}
            </h1>
            <p className="text-secondary">
              {t('profile.description') || 'Manage your account information and preferences'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="mt-2 text-sm text-accent hover:text-accent-hover font-medium flex items-center space-x-1 disabled:opacity-50"
            >
              <Icon name="Camera" size={16} />
              <span>{t('profile.changePhoto') || 'Change Photo'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <Icon 
              name={message.type === 'success' ? 'CheckCircle' : 'AlertCircle'} 
              size={16} 
            />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Profile Information Form */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="User" size={20} />
          <span>{t('profile.personalInfo') || 'Personal Information'}</span>
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('profile.fullName') || 'Full Name'} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('profile.email') || 'Email Address'} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('profile.phoneNumber') || 'Phone Number'}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            {/* Professional Info (for dentists) */}
            {isDentist && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.title') || 'Professional Title'}
                  </label>
                  <input
                    type="text"
                    name="profile.title"
                    value={formData.profile.title}
                    onChange={handleInputChange}
                    placeholder="Dr., drg., etc."
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.licenseNumber') || 'License Number'}
                  </label>
                  <input
                    type="text"
                    name="profile.license_number"
                    value={formData.profile.license_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.specialization') || 'Primary Specialization'}
                  </label>
                  <input
                    type="text"
                    name="profile.primary_specialization"
                    value={formData.profile.primary_specialization}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* About Section */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('profile.about') || 'About'}
            </label>
            <textarea
              name="about"
              value={formData.about}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
              placeholder={t('profile.aboutPlaceholder') || 'Tell us about yourself...'}
            />
          </div>

          {/* Extended Professional Info for Dentists */}
          {isDentist && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.registrationNumber') || 'Registration Number'}
                  </label>
                  <input
                    type="text"
                    name="profile.registration_number"
                    value={formData.profile.registration_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.yearsOfExperience') || 'Years of Experience'}
                  </label>
                  <input
                    type="number"
                    name="profile.years_of_experience"
                    value={formData.profile.years_of_experience}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.education') || 'Education Qualification'}
                  </label>
                  <input
                    type="text"
                    name="profile.education_qualification"
                    value={formData.profile.education_qualification}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.consultationFee') || 'Consultation Fee'}
                  </label>
                  <input
                    type="number"
                    name="profile.consultation_fee"
                    value={formData.profile.consultation_fee}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.clinicName') || 'Clinic Name'}
                  </label>
                  <input
                    type="text"
                    name="profile.clinic_name"
                    value={formData.profile.clinic_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('profile.clinicAddress') || 'Clinic Address'}
                  </label>
                  <textarea
                    name="profile.clinic_address"
                    value={formData.profile.clinic_address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <Icon name="Loader2" size={18} className="animate-spin" />
                  <span>{t('profile.saving') || 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Icon name="Save" size={18} />
                  <span>{t('profile.saveProfile') || 'Save Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="Lock" size={20} />
          <span>{t('profile.changePassword') || 'Change Password'}</span>
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('profile.currentPassword') || 'Current Password'} *
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('profile.newPassword') || 'New Password'} *
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('profile.confirmPassword') || 'Confirm New Password'} *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isChangingPassword ? (
              <>
                <Icon name="Loader2" size={18} className="animate-spin" />
                <span>{t('profile.changing') || 'Changing...'}</span>
              </>
            ) : (
              <>
                <Icon name="Key" size={18} />
                <span>{t('profile.changePassword') || 'Change Password'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
