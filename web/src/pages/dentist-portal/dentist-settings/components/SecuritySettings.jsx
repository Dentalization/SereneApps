import React, { useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';

const SecuritySettings = ({ user, onDataChange }) => {
  const { t } = useLanguage();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 30, // minutes
    allowMultipleSessions: true,
    requirePasswordChange: false,
    passwordExpiry: 90, // days
    loginHistory: true,
    deviceTrust: true,
    biometricLogin: false,
    securityQuestions: [
      { question: 'What city were you born in?', answer: '' },
      { question: 'What was the name of your first pet?', answer: '' },
      { question: 'What was the name of your elementary school?', answer: '' }
    ]
  });

  const [loginHistory] = useState([
    {
      id: 1,
      device: 'MacBook Pro - Chrome',
      location: 'Jakarta, Indonesia',
      timestamp: '2025-09-19 09:30:00',
      status: 'success',
      ip: '192.168.1.1'
    },
    {
      id: 2,
      device: 'iPhone - Safari',
      location: 'Jakarta, Indonesia', 
      timestamp: '2025-09-18 18:45:00',
      status: 'success',
      ip: '192.168.1.5'
    },
    {
      id: 3,
      device: 'Unknown Device - Chrome',
      location: 'Bandung, Indonesia',
      timestamp: '2025-09-17 14:20:00',
      status: 'failed',
      ip: '203.194.112.45'
    }
  ]);

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSecuritySettingChange = (field, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
    onDataChange?.(true);
  };

  const handleSecurityQuestionChange = (index, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      securityQuestions: prev.securityQuestions.map((q, i) => 
        i === index ? { ...q, answer: value } : q
      )
    }));
    onDataChange?.(true);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const passwordValidation = validatePassword(passwordData.newPassword);

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirmation do not match!');
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('The new password does not meet the security criteria!');
      return;
    }

    setLoading(true);
    try {
      await authHttp.post('/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      // Implement 2FA setup logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: true }));
      toast.success('Two-Factor Authentication enabled successfully!');
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast.error('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
      setLoading(true);
      try {
        // Implement 2FA disable logic
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: false }));
        toast.success('Two-Factor Authentication disabled successfully!');
      } catch (error) {
        console.error('Error disabling 2FA:', error);
        toast.error('Failed to disable 2FA');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    if (window.confirm('Are you sure you want to log out from all devices? You will need to log in again.')) {
      setLoading(true);
      try {
        await authHttp.post('/auth/logout-all-devices');
        toast.success('Successfully logged out from all devices!');
        // Redirect to login or refresh the page
        window.location.reload();
      } catch (error) {
        console.error('Error logging out all devices:', error);
        toast.error('Failed to log out from all devices');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Implement save logic here
      console.log('Saving security settings:', securitySettings);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setIsEditing(false);
      onDataChange?.(false);
      toast.success('Security settings saved successfully!');
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    onDataChange?.(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2 theme-transition">
              Security Settings
            </h2>
            <p className="text-secondary theme-transition">
              Manage your password, 2FA, and account security settings
            </p>
          </div>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-surface theme-transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition flex items-center space-x-2"
              >
                <Icon name="Shield" size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Change Password */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Key" size={20} className="mr-2" />
            Change Password
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                >
                  <Icon name={showPasswords.current ? 'EyeOff' : 'Eye'} size={20} />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                >
                  <Icon name={showPasswords.new ? 'EyeOff' : 'Eye'} size={20} />
                </button>
              </div>
              
              {passwordData.newPassword && (
                <div className="mt-2 space-y-1">
                  <div className={`text-xs flex items-center space-x-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-red-500'}`}>
                    <Icon name={passwordValidation.minLength ? 'Check' : 'X'} size={12} />
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`text-xs flex items-center space-x-2 ${passwordValidation.hasUpper ? 'text-green-600' : 'text-red-500'}`}>
                    <Icon name={passwordValidation.hasUpper ? 'Check' : 'X'} size={12} />
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`text-xs flex items-center space-x-2 ${passwordValidation.hasLower ? 'text-green-600' : 'text-red-500'}`}>
                    <Icon name={passwordValidation.hasLower ? 'Check' : 'X'} size={12} />
                    <span>Lowercase letter</span>
                  </div>
                  <div className={`text-xs flex items-center space-x-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                    <Icon name={passwordValidation.hasNumber ? 'Check' : 'X'} size={12} />
                    <span>Number</span>
                  </div>
                  <div className={`text-xs flex items-center space-x-2 ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-red-500'}`}>
                    <Icon name={passwordValidation.hasSpecial ? 'Check' : 'X'} size={12} />
                    <span>Special character</span>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                >
                  <Icon name={showPasswords.confirm ? 'EyeOff' : 'Eye'} size={20} />
                </button>
              </div>
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
            
            <button
              onClick={handleChangePassword}
              disabled={loading || !passwordValidation.isValid || passwordData.newPassword !== passwordData.confirmPassword}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Smartphone" size={20} className="mr-2" />
            Two-Factor Authentication (2FA)
          </h3>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-secondary">
                {securitySettings.twoFactorEnabled 
                  ? 'Two-Factor Authentication is active' 
                  : 'Enhance security by enabling 2FA'
                }
              </p>
              <p className="text-xs text-secondary/70 mt-1">
                Use an authenticator app for additional verification
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              securitySettings.twoFactorEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {securitySettings.twoFactorEnabled ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <button
            onClick={securitySettings.twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
            disabled={loading}
            className={`px-4 py-2 rounded-lg theme-transition disabled:opacity-50 ${
              securitySettings.twoFactorEnabled 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {loading ? 'Processing...' : (securitySettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
          </button>
        </div>

        {/* Security Settings */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Settings" size={20} className="mr-2" />
            Security Preferences
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-secondary font-medium">Login Notifications</span>
                <p className="text-xs text-secondary/70">Receive notifications for new logins</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.loginNotifications}
                  onChange={(e) => handleSecuritySettingChange('loginNotifications', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-secondary font-medium">Multiple Sessions</span>
                <p className="text-xs text-secondary/70">Allow logins from multiple devices</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.allowMultipleSessions}
                  onChange={(e) => handleSecuritySettingChange('allowMultipleSessions', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-secondary font-medium">Login History</span>
                <p className="text-xs text-secondary/70">Save login activity history</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.loginHistory}
                  onChange={(e) => handleSecuritySettingChange('loginHistory', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Session Timeout (minutes)
              </label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={480}>8 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Questions */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="HelpCircle" size={20} className="mr-2" />
            Security Questions
          </h3>
          
          <div className="space-y-4">
            {securitySettings.securityQuestions.map((item, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {item.question}
                </label>
                <input
                  type="text"
                  value={item.answer}
                  onChange={(e) => handleSecurityQuestionChange(index, e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
                  placeholder="Enter your answer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Login History */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Icon name="Activity" size={20} className="mr-2" />
              Login History
            </h3>
            <button
              onClick={handleLogoutAllDevices}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 theme-transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Logout All Devices'}
            </button>
          </div>
          
          <div className="space-y-3">
            {loginHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border border-primary rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    entry.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-primary">{entry.device}</p>
                    <p className="text-xs text-secondary">{entry.location} • {entry.ip}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-secondary">{new Date(entry.timestamp).toLocaleString()}</p>
                  <p className={`text-xs font-medium capitalize ${
                    entry.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {entry.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
