import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import AppIcon from '../../../components/AppIcon';
import { resolveMediaUrl } from '../../../utils/media';
import { updateUserProfileApi, changePasswordApi } from '../../../services/authService';

const AdminProfileSettings = () => {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const { t, language, translations } = useLanguage();

  // Debug user context changes
  console.log('AdminProfileSettings - Current user:', {
    id: user?.id,
    name: user?.name,
    email: user?.email,
    roles: user?.roles
  });
  
  // Debug translation
  console.log('Current language:', language);
  console.log('Translations object:', translations);
  console.log('Admin object:', translations?.admin);
  console.log('Admin profile object:', translations?.admin?.profile);
  console.log('Profile title translation:', t('admin.profile.title'));
  console.log('PersonalInfo translation:', t('admin.profile.personalInfo'));
  console.log('Security translation:', t('admin.profile.security'));
  console.log('Save translation:', t('admin.profile.save'));
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || user?.profile?.avatar_url || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const avatarUrl = resolveMediaUrl(formData.avatar_url);

  // Monitor translations loading
  useEffect(() => {
    console.log('Translations changed:', translations);
    console.log('Language changed:', language);
    if (translations?.admin?.profile) {
      console.log('Admin profile translations loaded successfully');
    } else {
      console.log('Admin profile translations not found');
    }
  }, [translations, language]);

  // Initialize form data with current user data (DO NOT modify user context)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Avatar upload started:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('admin.profile.fileSizeError') || 'File size must be less than 5MB' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: t('admin.profile.fileTypeError') || 'Please select an image file' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' }); // Clear previous messages

    try {
      // Convert image to base64 for persistence
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result;
        
        // Update form data immediately for UI feedback
        setFormData(prev => ({
          ...prev,
          avatar_url: base64Image
        }));
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update user context safely - preserve all existing user data
        setUser(prevUser => ({
          ...prevUser,
          avatar_url: base64Image
        }));
        
        setMessage({ type: 'success', text: t('admin.profile.uploadSuccess') || 'Avatar uploaded successfully!' });
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
        
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        setMessage({ type: 'error', text: t('admin.profile.uploadError') || 'Failed to upload avatar. Please try again.' });
        setIsLoading(false);
      };
      
      reader.readAsDataURL(file);
      
      /* 
      // Actual API call code for when backend is ready:
      const response = await fetch('/api/admin/upload-avatar', {
        method: 'POST',
        body: formDataUpload,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          avatar_url: data.avatar_url
        }));
        setUser({
          ...user,
          avatar_url: data.avatar_url
        });
        setMessage({ type: 'success', text: t('admin.profile.uploadSuccess') || 'Avatar uploaded successfully!' });
      } else {
        throw new Error('Upload failed');
      }
      */
    } catch (error) {
      console.error('Avatar upload error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || t('admin.profile.uploadError') || 'Failed to upload avatar. Please try again.' 
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    // Validate passwords if changing password
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Current password is required to change password' });
        setIsLoading(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: t('admin.profile.passwordMismatch') || 'Passwords do not match' });
        setIsLoading(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: t('admin.profile.passwordTooShort') || 'Password must be at least 6 characters' });
        setIsLoading(false);
        return;
      }
    }

    try {
      // Update profile data first
      const profileData = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phone,
        about: formData.bio
      };

      await updateUserProfileApi(profileData);
      
      // Update password separately if provided
      if (formData.currentPassword && formData.newPassword) {
        await changePasswordApi({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        });
      }
      
      // Only update user context with the specific fields that were updated
      // Preserve all other user data including roles, id, etc.
      setUser(prevUser => ({
        ...prevUser,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        avatar_url: formData.avatar_url
      }));
      
      setMessage({ type: 'success', text: t('admin.profile.success') || 'Profile updated successfully!' });
      
      // Clear password fields after successful update
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: error.message || t('admin.profile.error') || 'Failed to update profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <AppIcon name="User" size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {t('admin.profile.title') || 'Profile Settings'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.profile.subtitle') || 'Manage your admin account settings'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-surface-elevated rounded-2xl border border-primary p-6 sticky top-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-accent/30 mx-auto">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Admin Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                      <AppIcon name="User" size={32} className="text-accent" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent/80 transition-colors disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <AppIcon name="Camera" size={16} />
                  )}
                </button>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-1">
                {formData.name || t('admin.profile.defaultName') || 'Admin User'}
              </h3>
              <p className="text-sm text-secondary mb-2">
                {formData.email || t('admin.profile.defaultEmail') || 'admin@sereneai.com'}
              </p>
              <div className="inline-flex items-center px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                <AppIcon name="Shield" size={12} className="mr-1" />
                {user?.roles?.[0] || t('common.role') || 'admin'}
              </div>
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

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-surface-elevated rounded-2xl border border-primary p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-primary mb-2">
                {t('admin.profile.personalInfo') || 'Personal Information'}
              </h2>
              <p className="text-sm text-secondary">
                {t('admin.profile.personalInfoDesc') || 'Update your personal details and contact information'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('admin.profile.name') || 'Full Name'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary"
                    placeholder={t('admin.profile.namePlaceholder') || 'Enter your full name'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    {t('admin.profile.phone') || 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary"
                    placeholder={t('admin.profile.phonePlaceholder') || 'Enter your phone number'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('admin.profile.email') || 'Email Address'}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary"
                  placeholder={t('admin.profile.emailPlaceholder') || 'Enter your email'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('admin.profile.bio') || 'Bio'}
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary resize-none"
                  placeholder={t('admin.profile.bioPlaceholder') || 'Tell us about yourself...'}
                />
              </div>

              {/* Password Section */}
              <div className="border-t border-primary pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {t('admin.profile.security') || 'Security Settings'}
                  </h3>
                  <p className="text-sm text-secondary">
                    {t('admin.profile.securityDesc') || 'Change your password to keep your account secure'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      {t('admin.profile.currentPassword') || 'Current Password'}
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary"
                      placeholder={t('admin.profile.currentPasswordPlaceholder') || 'Enter current password'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        {t('admin.profile.newPassword') || 'New Password'}
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary"
                        placeholder={t('admin.profile.newPasswordPlaceholder') || 'Enter new password'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        {t('admin.profile.confirmPassword') || 'Confirm New Password'}
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-surface border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-primary"
                        placeholder={t('admin.profile.confirmPasswordPlaceholder') || 'Confirm new password'}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-secondary">
                    {t('admin.profile.passwordHint') || 'Leave password fields empty if you don\'t want to change your password'}
                  </p>
                </div>
              </div>

              {/* Message */}
              {message.text && (
                <div className={`p-4 rounded-lg text-sm font-medium ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' 
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    <AppIcon 
                      name={message.type === 'success' ? 'CheckCircle' : 'AlertCircle'} 
                      size={16} 
                    />
                    <span>{message.text}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-primary">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('admin.profile.saving') || 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <AppIcon name="Save" size={16} />
                      <span>{t('admin.profile.save') || 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileSettings;