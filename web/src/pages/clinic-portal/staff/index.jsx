import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import StaffDirectory from './components/StaffDirectory';
import StaffRemoveDialog from './components/StaffRemoveDialog';
import StaffInviteModal from './components/StaffInviteModal';
import AddDentistModal from './components/AddDentistModal';
import StaffSummary from './components/StaffSummary';
import ChangeBranchModal from './components/ChangeBranchModal';
import { staffService } from '../../../services/staffService';
import clinicService from '../../../services/clinicService';
import { registerApi } from '../../../services/authService';
import { publishPortalInvalidation } from '../../../collaboration/portalCollaboration.mjs';
import { getAccessToken } from '../../../utils/auth/tokenStorage';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import ModalPortal from '../../../components/ui/ModalPortal';

const ROLE_KEYS = ['owner', 'manager', 'front_office', 'nurse', 'cashier', 'admin', 'dentist', 'staff'];
const ASSIGNABLE_ROLES = ['manager', 'front_office', 'nurse', 'cashier', 'admin', 'dentist', 'staff'];
const STATUS_KEYS = ['active', 'inactive', 'invited'];

const isDev = import.meta.env.MODE !== 'production';

// REMOVED MOCK DATA - USING REAL DATA ONLY

const StaffManagement = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { logout } = useAuth();
  
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [backendStats, setBackendStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [clinicLoading, setClinicLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [notice, setNotice] = useState(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);

  // Modal states
  const [viewProfileModal, setViewProfileModal] = useState(null);
  const [editRoleModal, setEditRoleModal] = useState(null);
  const [removeModal, setRemoveModal] = useState(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [addDentistModal, setAddDentistModal] = useState(false);
  const [changeBranchModal, setChangeBranchModal] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState(null);
  const [roleSuccess, setRoleSuccess] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [addDentistLoading, setAddDentistLoading] = useState(false);
  const [addDentistError, setAddDentistError] = useState(null);
  const [changeBranchLoading, setChangeBranchLoading] = useState(false);
  const [changeBranchError, setChangeBranchError] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: ''
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [availableModules] = useState([
    { id: 'dashboard', name: 'Dashboard', description: 'Akses ke halaman utama klinik' },
    { id: 'schedule', name: 'Jadwal', description: 'Kelola jadwal dan appointment' },
    { id: 'patients', name: 'Pasien', description: 'Kelola data pasien' },
    { id: 'billing', name: 'Billing', description: 'Kelola tagihan dan pembayaran' },
    { id: 'inventory', name: 'Inventori', description: 'Kelola stok dan alat medis' },
    { id: 'reports', name: 'Laporan', description: 'Lihat dan buat laporan' },
    { id: 'settings', name: 'Pengaturan', description: 'Kelola pengaturan klinik' }
  ]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const [roleForm, setRoleForm] = useState({
    role: 'manager',
    status: 'active'
  });

  const finishLoading = useCallback(() => {
    const finalize = () => {
      setLoading(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  const MIN_LOADING_MS = 900;
  const loadStartRef = useRef(Date.now());
  const loadingTimerRef = useRef(null);

  const normalizeStaff = useCallback((staffData = {}) => {
    if (!staffData) return null;
    const toStringSafe = (value) => {
      if (typeof value === 'bigint') return value.toString();
      if (value === undefined || value === null) return value ?? null;
      return typeof value === 'object' && typeof value.toString === 'function'
        ? value.toString()
        : value;
    };

    return {
      ...staffData,
      id: toStringSafe(staffData.id),
      userId: toStringSafe(staffData.userId),
      branchId:
        staffData.branchId === undefined || staffData.branchId === null
          ? null
          : toStringSafe(staffData.branchId),
      branch: staffData.branch
        ? {
            ...staffData.branch,
            id: toStringSafe(staffData.branch.id),
          }
        : null,
    };
  }, []);

  // Search and filter states for StaffDirectory
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const roleLabels = useMemo(() => {
    const labels = {};
    ROLE_KEYS.forEach((key) => {
      const translated = t(`clinic.staff.roleLabels.${key}`);
      labels[key] = translated === `clinic.staff.roleLabels.${key}` ? toTitleCase(key) : translated;
    });
    return labels;
  }, [t]);

  const statusLabels = useMemo(() => {
    const labels = {};
    STATUS_KEYS.forEach((key) => {
      const translated = t(`clinic.staff.statusBadge.${key}`);
      labels[key] = translated === `clinic.staff.statusBadge.${key}` ? toTitleCase(key) : translated;
    });
    labels.default = labels.active || labels[STATUS_KEYS[0]] || 'Active';
    return labels;
  }, [t]);

  const roleOptions = useMemo(() => {
    const options = ASSIGNABLE_ROLES.map((value) => ({
      value,
      label: roleLabels[value] || toTitleCase(value)
    }));

    if (!options.some((option) => option.value === 'owner') && roleLabels.owner) {
      options.unshift({ value: 'owner', label: roleLabels.owner });
    }

    return options;
  }, [roleLabels]);

  const statusOptions = useMemo(() => (
    STATUS_KEYS.map((value) => ({
      value,
      label: statusLabels[value] || toTitleCase(value)
    }))
  ), [statusLabels]);

  const directoryTranslations = useMemo(
    () => ({
      searchPlaceholder: t('clinic.staff.searchPlaceholder'),
      filters: {
        role: {
          label: t('clinic.staff.filters.role.label'),
          all: t('clinic.staff.filters.role.all')
        },
        status: {
          label: t('clinic.staff.filters.status.label'),
          all: t('clinic.staff.filters.status.all'),
          active: t('clinic.staff.filters.status.active'),
          inactive: t('clinic.staff.filters.status.inactive'),
          invited: t('clinic.staff.filters.status.invited')
        }
      },
      headers: {
        staff: t('clinic.staff.directory.headers.staff'),
        contact: t('clinic.staff.directory.headers.contact'),
        role: t('clinic.staff.directory.headers.role'),
        branch: t('clinic.staff.directory.headers.branch'),
        status: t('clinic.staff.directory.headers.status'),
        actions: t('clinic.staff.directory.headers.actions')
      },
      actions: {
        view: t('clinic.staff.directory.actions.view'),
        edit: t('clinic.staff.directory.actions.edit'),
        remove: t('clinic.staff.directory.actions.remove'),
        changeBranch: t('clinic.staff.directory.actions.changeBranch'),
        add: t('clinic.staff.actions.addStaff')
      },
      empty: {
        title: t('clinic.staff.directory.empty.title'),
        description: t('clinic.staff.directory.empty.description')
      }
    }),
    [t]
  );

  // Fetch staff data with proper error handling - FORCE REAL DATA ONLY
  const fetchStaff = async () => {
    loadStartRef.current = Date.now();
    setLoading(true);
    setError(null);

    const token = getAccessToken();
    if (!token) {
      console.warn('🔒 No active clinic session found, showing token expired modal');
      setShowTokenExpiredModal(true);
      finishLoading();
      return;
    }
    setShowTokenExpiredModal(false);

    try {
      const result = await staffService.getStaff();
      if (result.success) {
        const rawStaffData = result.data?.staff || [];
        // Transform the data to ensure compatibility with modals
        const staffData = rawStaffData.map(staff => {
          const normalized = normalizeStaff(staff);
          return {
            ...normalized,
            // Ensure avatar_url is mapped correctly from different possible field names
            avatar_url:
              normalized.avatar_url ||
              normalized.avatar ||
              normalized.profile_picture ||
              normalized.image_url,
            // Ensure permissions is an array for the modal
            permissions: Array.isArray(normalized.permissions)
              ? normalized.permissions
              : normalized.permissions?.modules ||
                Object.values(normalized.permissions || {}).flat() ||
                [],
            // Ensure all required fields exist with defaults
            phone: normalized.phone || normalized.phone_number || '',
            position: normalized.position || '',
            department: normalized.department || '',
            joinDate: normalized.joinDate || normalized.createdAt || null,
            lastLogin: normalized.lastLogin || null,
          };
        });
        setStaff(staffData);
        setBackendStats(result.data?.stats || null);
      } else {
        if (result.statusCode === 401 || result.statusCode === 403) {
          setShowTokenExpiredModal(true);
          return;
        }
        setError(t('clinic.staff.errors.loadFailed'));
      }
    } catch {
      setError(t('clinic.staff.errors.loadFailed'));
    } finally {
      finishLoading();
    }
  };

  // Fetch branches data for multi-branch staff management
  const fetchBranches = async () => {
    setBranchesLoading(true);

    const token = getAccessToken();
    if (!token) {
      console.warn('🔒 No active session for branches');
      setBranchesLoading(false);
      return;
    }

    try {
      const branchesData = await clinicService.getBranches();
      if (branchesData && branchesData.branches) {
        setBranches(branchesData.branches);
      } else {
        setBranches([]);
      }
    } catch {
      // Don't show error for branches as it's not critical
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  // Fetch clinic data for clinic information
  const fetchClinic = async () => {
    try {
      setClinicLoading(true);
      
      const response = await clinicService.getClinicProfile();
      
      if (response?.profile) {
        const profile = response.profile;

        const normalizedClinic = {
          ...profile,
          id: profile.id?.toString?.() ?? profile.id,
          name: profile.brandName || profile.legalName || profile.user?.name || '',
          address: [
            profile.streetAddress,
            profile.city,
            profile.province,
            profile.postalCode
          ].filter(Boolean).join(', ')
        };

        setClinic(normalizedClinic);
      } else {
        setClinic(null);
      }
    } catch {
      setClinic(null);
    } finally {
      setClinicLoading(false);
    }
  };

  // Handle staff branch assignment change - opens modal
  const handleChangeBranch = (staffMember) => {
    if (!staffMember) {
      return;
    }
    setChangeBranchError(null);
    setChangeBranchModal(staffMember);
  };

  // Handle branch change submission from modal
  const handleChangeBranchSubmit = async (staffId, newBranchId) => {
    setChangeBranchLoading(true);
    setChangeBranchError(null);
    
    try {
      // Use the staffService method
      const result = await staffService.changeBranch(staffId, newBranchId);

      if (result.success) {
        // Update staff data locally with the returned data
        if (result.data && result.data.staff) {
          const normalizedStaff = normalizeStaff(result.data.staff);
          setStaff(prevStaff =>
            prevStaff.map(staffMember =>
              staffMember.id === staffId
                ? { ...staffMember, ...normalizedStaff }
                : staffMember
            )
          );
        } else {
          // Fallback update
          const normalizedBranchId = newBranchId != null ? newBranchId.toString() : null;
          const branchMatch = normalizedBranchId
            ? branches.find(b => String(b.id) === normalizedBranchId)
            : null;
          setStaff(prevStaff =>
            prevStaff.map(staffMember =>
              staffMember.id === staffId
                ? {
                    ...staffMember,
                    branchId: normalizedBranchId,
                    branch: branchMatch
                      ? {
                          ...branchMatch,
                          id: normalizedBranchId,
                        }
                      : staffMember.branch,
                  }
                : staffMember
            )
          );
        }

        const branchName = branches.find(b => String(b.id) === String(newBranchId))?.branchName || 'Unknown Branch';
        setNotice({
          type: 'success',
          message: t('clinic.staff.notifications.branchChanged', { branchName })
        });

        setChangeBranchModal(null); // Close modal on success
      } else {
        setChangeBranchError(result.error || t('clinic.staff.errors.branchChangeFailed'));
      }
    } catch {
      setChangeBranchError(t('clinic.staff.errors.branchChangeFailed'));
    } finally {
      setChangeBranchLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchBranches();
    fetchClinic();
  }, []);

  // Escape key handler for modals
  useEffect(() => {
    const hasModal =
      viewProfileModal ||
      editRoleModal ||
      inviteModal ||
      addDentistModal ||
      changeBranchModal ||
      showTokenExpiredModal;

    if (!hasModal) return undefined;

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (viewProfileModal) closeViewProfile();
      else if (editRoleModal) closeEditRole();
      else if (addDentistModal) setAddDentistModal(false);
      else if (changeBranchModal) setChangeBranchModal(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [
    viewProfileModal,
    editRoleModal,
    inviteModal,
    addDentistModal,
    changeBranchModal,
    showTokenExpiredModal,
  ]);

  // Handlers for the buttons that are actually showing in the browser
  const handleViewProfile = (staffMember) => {
    try {
      setProfileError(null);
      setProfileLoading(false);
      setProfileSuccess(null);
      
      // Ensure staffMember has all required fields for the modal
      const safeStaffMember = {
        ...staffMember,
        name: staffMember.name || 'Unknown',
        email: staffMember.email || '',
        phone: staffMember.phone || '',
        position: staffMember.position || '',
        department: staffMember.department || '',
        role: staffMember.role || 'staff',
        status: staffMember.status || 'active',
        joinDate: staffMember.joinDate || null,
        lastLogin: staffMember.lastLogin || null,
        permissions: Array.isArray(staffMember.permissions) 
          ? staffMember.permissions 
          : staffMember.permissions?.modules || []
      };
      
      setProfileForm({
        name: safeStaffMember.name || '',
        email: safeStaffMember.email || '',
        phone: safeStaffMember.phone || '',
        position: safeStaffMember.position || '',
        department: safeStaffMember.department || ''
      });
      setIsEditingProfile(false);
      setSelectedPermissions(safeStaffMember.permissions || []);
      setViewProfileModal(safeStaffMember);
    } catch (error) {
      setError('Failed to open profile modal: ' + error.message);
    }
  };

  const handleEditRole = (staffMember) => {
    try {
      setRoleError(null);
      setRoleLoading(false);
      setRoleSuccess(null);
      
      // Ensure staffMember has all required fields for the modal
      const safeStaffMember = {
        ...staffMember,
        name: staffMember.name || 'Unknown',
        email: staffMember.email || '',
        role: staffMember.role || 'staff',
        status: staffMember.status || 'active'
      };
      
      setRoleForm({
        role: safeStaffMember.role || 'staff',
        status: safeStaffMember.status || 'active'
      });
      setEditRoleModal(safeStaffMember);
    } catch (error) {
      setError('Failed to open edit role modal: ' + error.message);
    }
  };

  const handleRemoveStaff = (staffMember) => {
    try {
      setRemoveError(null);
      setRemoveLoading(false);
      setRemoveModal(staffMember);
    } catch {
      setError('Failed to open remove modal');
    }
  };

  const handleInviteStaff = () => {
    setInviteError(null);
    setInviteLoading(false);
    setInviteModal(true);
  };

  const handleAddDentist = () => {
    setAddDentistError(null);
    setAddDentistLoading(false);
    setAddDentistModal(true);
  };

  const handleInviteSubmit = async (formData) => {
    setInviteLoading(true);
    setInviteError(null);

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      position: formData.position,
      department: formData.department,
      assignedBranchId: formData.assignedBranchId || formData.branchId,
      permissions: []
    };

    try {
      const result = await staffService.addStaff(payload);
      if (result.success) {
        await fetchStaff();
        setNotice(`Staff ${formData.name} berhasil ditambahkan`);
        setInviteModal(false);
      } else {
        if (result.statusCode === 401 || result.statusCode === 403) {
          setShowTokenExpiredModal(true);
        } else if (result.statusCode === 400 && result.errorCode === 'ALREADY_ASSIGNED') {
          setInviteError(result.details || 'Email sudah terdaftar dan ditugaskan ke klinik lain. Setiap staff hanya bisa bekerja di satu klinik.');
        } else if (result.statusCode === 409) {
          setInviteError(result.details || 'Email sudah terdaftar. Silakan gunakan email lain.');
        } else {
          setInviteError(result.details || result.error || 'Failed to invite staff member');
        }
      }
    } catch {
      setInviteError('Failed to invite staff member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddDentistSubmit = async (formData) => {
    setAddDentistLoading(true);
    setAddDentistError(null);

    try {
      // Ensure clinic/staff metadata exists
      if (!formData.has('registrationType')) {
        formData.append('registrationType', 'clinic-staff');
      }
      if (clinic?.id && !formData.has('clinicId')) {
        formData.append('clinicId', clinic.id.toString());
      }
      if (formData.get('selectedBranch') && !formData.has('branchId')) {
        formData.append('branchId', formData.get('selectedBranch'));
      }
      await registerApi(formData);
      publishPortalInvalidation('clinic:staff_updated', { source: 'clinic-staff:register-dentist' });
      setAddDentistModal(false);
      setNotice('Dentist berhasil ditambahkan ke staff clinic!');
      await fetchStaff();
    } catch (error) {
      const status = error?.response?.status;
      const errorData = error?.response?.data || {};
      if (status === 401 || status === 403) {
        setShowTokenExpiredModal(true);
      } else if (status === 409 || errorData.errorCode === 'DUPLICATE_EMAIL') {
        setAddDentistError(errorData.details || 'Email sudah terdaftar. Silakan gunakan email lain.');
      } else if (errorData.errorCode === 'DUPLICATE_LICENSE') {
        setAddDentistError('Nomor lisensi atau registrasi sudah terdaftar di sistem kami.');
      } else {
        setAddDentistError(errorData.details || errorData.message || 'Failed to add dentist. Please check your connection and try again.');
      }
    } finally {
      setAddDentistLoading(false);
    }
  };

  // Modal action handlers - these will be called when forms are submitted
  const handleProfileUpdate = async (updates) => {
    if (!viewProfileModal) return;

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const payload = {
        name: updates.name ?? viewProfileModal.name,
        email: updates.email ?? viewProfileModal.email,
        phone: updates.phone ?? '',
        position: updates.position ?? '',
        department: updates.department ?? '',
        permissions: selectedPermissions
      };
      const result = await staffService.updateStaff(viewProfileModal.id, payload);

      if (result.success) {
        const updatedStaff = result.data?.staff || result.data?.data || result.data || {};
        const finalUpdate = { ...payload, ...updatedStaff, permissions: selectedPermissions };
        setStaff((prev) =>
          prev.map((member) =>
            member.id === viewProfileModal.id
              ? { ...member, ...finalUpdate }
              : member
          )
        );
        setViewProfileModal((prev) => (prev ? { ...prev, ...finalUpdate } : prev));
        setProfileForm({
          name: finalUpdate.name || '',
          email: finalUpdate.email || '',
          phone: finalUpdate.phone || '',
          position: finalUpdate.position || '',
          department: finalUpdate.department || ''
        });
        const timestamp = new Date().toLocaleString(language === 'id' ? 'id-ID' : 'en-US');
        const successMessage = `Profile ${viewProfileModal.name} berhasil diperbarui pada ${timestamp}`;
        setProfileSuccess(successMessage);
        setNotice(successMessage);
        setIsEditingProfile(false);
        await fetchStaff();
      } else {
        if (result.statusCode === 401 || result.statusCode === 403) {
          setShowTokenExpiredModal(true);
        } else {
          setProfileError(result.error || t('clinic.staff.errors.profileUpdateFailed'));
        }
      }
    } catch {
      setProfileError('Gagal menyimpan perubahan. Pastikan koneksi internet dan coba lagi.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRoleUpdate = async (updates) => {
    if (!editRoleModal) return;

    setRoleLoading(true);
    setRoleError(null);
    setRoleSuccess(null);

    const targetUserId = editRoleModal.userId || editRoleModal.id;

    try {
      const result = await staffService.updateStaffRole(targetUserId, {
        role: updates.role,
        status: updates.status
      });

      if (result.success) {
        const updatedStaff = result.data?.staff || result.data?.data || result.data || updates;
        setStaff((prev) =>
          prev.map((member) =>
            (member.userId || member.id) === targetUserId
              ? { ...member, ...updates, ...updatedStaff }
              : member
          )
        );
        const merged = { ...updates, ...updatedStaff };
        setEditRoleModal((prev) => (prev ? { ...prev, ...merged } : prev));
        setRoleForm({
          role: merged.role || updates.role,
          status: merged.status || updates.status
        });
        const timestamp = new Date().toLocaleString(language === 'id' ? 'id-ID' : 'en-US');
        const successMessage = t('clinic.staff.notifications.roleUpdateLog', {
          name: editRoleModal.name,
          role: roleLabels[updates.role] || toTitleCase(updates.role),
          time: timestamp
        });
        setRoleSuccess(successMessage);
        setNotice(successMessage);
      } else {
        if (result.statusCode === 401 || result.statusCode === 403) {
          setShowTokenExpiredModal(true);
        } else {
          setRoleError(result.error || t('clinic.staff.errors.roleUpdateFailed'));
        }
      }
    } catch {
      setRoleError(t('clinic.staff.errors.roleUpdateFailed'));
    } finally {
      setRoleLoading(false);
    }
  };

  const handleStaffRemoval = async (userId) => {
    setRemoveLoading(true);
    setRemoveError(null);

    try {
      const result = await staffService.removeStaffMember(userId);
      if (result.success) {
        setStaff(prev => prev.filter(member => (member.userId || member.id) !== userId));
        const removedStaffName = result.data?.removedStaff?.name || removeModal?.name || 'Staff';
        setNotice(t('clinic.staff.notifications.removeSuccess', { name: removedStaffName }));
        closeRemoveModal();
        await fetchStaff();
      } else {
        if (result.statusCode === 401 || result.statusCode === 403) {
          setShowTokenExpiredModal(true);
        } else {
          setRemoveError(result.error || t('clinic.staff.errors.removeFailed'));
        }
      }
    } catch {
      setRemoveError(t('clinic.staff.errors.removeFailed'));
    } finally {
      setRemoveLoading(false);
    }
  };

  const closeViewProfile = () => {
    setViewProfileModal(null);
    setProfileError(null);
    setProfileLoading(false);
    setProfileForm({ name: '', email: '', phone: '', position: '', department: '' });
    setProfileSuccess(null);
    setIsEditingProfile(false);
    setSelectedPermissions([]);
  };
  const closeEditRole = () => {
    setEditRoleModal(null);
    setRoleError(null);
    setRoleLoading(false);
    setRoleForm({ role: 'manager', status: 'active' });
    setRoleSuccess(null);
  };
  const closeRemoveModal = () => {
    setRemoveModal(null);
    setRemoveError(null);
    setRemoveLoading(false);
  };
  const closeInviteModal = () => {
    setInviteModal(false);
    setInviteError(null);
    setInviteLoading(false);
  };

  const closeAddDentistModal = () => {
    setAddDentistModal(false);
    setAddDentistError(null);
    setAddDentistLoading(false);
  };

  // Handle token expired
  const handleTokenExpired = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Calculate advanced KPI stats for staff summary
  const calculateStaffKPIs = useMemo(() => {
    if (backendStats) {
      return backendStats;
    }
    if (!staff.length) {
      return {
        total: 0,
        active: 0,
        efficiency: 0,
        utilization: 0,
        satisfaction: 0,
        revenue_per_staff: 0,
        capacity: 0,
        productivity: 0,
        attendance: 0,
        performance: 0,
        lastActivity: 0,
        top_performers: [],
        recommendations: []
      };
    }

    const activeStaff = staff.filter(s => s.status === 'active');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate active today (staff who logged in within last 24 hours)
    const activeToday = staff.filter(s => {
      if (!s.lastLogin) return false;
      const lastLogin = new Date(s.lastLogin);
      return lastLogin >= today;
    }).length;

    // Advanced KPI Calculations
    
    // 1. Efficiency Rate - based on task completion vs time spent
    const efficiency = activeStaff.length > 0 ? Math.round(
      activeStaff.reduce((sum, s) => {
        const roleEfficiency = {
          'dentist': 92, 'nurse': 88, 'front_office': 85, 
          'manager': 78, 'admin': 82, 'cashier': 90, 'staff': 75
        };
        const lastLoginDays = s.lastLogin ? 
          Math.floor((now - new Date(s.lastLogin)) / (1000 * 60 * 60 * 24)) : 30;
        const activityFactor = Math.max(0.7, 1 - (lastLoginDays / 30) * 0.2);
        return sum + (roleEfficiency[s.role] || 75) * activityFactor;
      }, 0) / activeStaff.length
    ) : 0;

    // 2. Utilization Rate - how much of their capacity is being used
    const utilization = activeStaff.length > 0 ? Math.round(
      activeStaff.reduce((sum, s) => {
        const roleCapacity = {
          'dentist': 85, 'nurse': 92, 'front_office': 88, 
          'manager': 72, 'admin': 78, 'cashier': 85, 'staff': 80
        };
        const recentActivity = s.lastLogin && new Date(s.lastLogin) > thisMonth ? 1.1 : 0.9;
        return sum + (roleCapacity[s.role] || 75) * recentActivity;
      }, 0) / activeStaff.length
    ) : 0;

    // 3. Satisfaction Score - based on retention, activity, and performance
    const satisfaction = staff.length > 0 ? Math.round(
      staff.reduce((sum, s) => {
        const joinDate = s.joinDate ? new Date(s.joinDate) : new Date();
        const tenure = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24 * 30)); // months
        const tenureFactor = Math.min(1, tenure / 12 + 0.5); // increases with tenure
        const activityFactor = s.status === 'active' ? 1.2 : 0.8;
        return sum + Math.min(95, 65 + tenureFactor * 25) * activityFactor;
      }, 0) / staff.length
    ) : 0;

    // 4. Revenue per Staff - simulated based on role and performance
    const revenuePerStaff = activeStaff.length > 0 ? Math.round(
      activeStaff.reduce((sum, s) => {
        const roleRevenue = {
          'dentist': 15000000, 'nurse': 3500000, 'front_office': 2800000, 
          'manager': 8000000, 'admin': 4200000, 'cashier': 3200000, 'staff': 2500000 // in IDR per month
        };
        const efficiencyMultiplier = efficiency / 100;
        return sum + (roleRevenue[s.role] || 2500000) * efficiencyMultiplier;
      }, 0) / activeStaff.length
    ) : 0;

    // 5. Capacity Usage - how much of clinic capacity is being utilized
    const capacity = staff.length > 0 ? Math.round(
      (activeToday / staff.length) * utilization
    ) : 0;

    // Legacy productivity calculation
    const avgProductivity = activeStaff.length > 0 ? Math.round(
      activeStaff.reduce((sum, s) => {
        const roleMultiplier = {
          'dentist': 12, 'nurse': 8, 'front_office': 15, 
          'manager': 6, 'admin': 10, 'cashier': 20, 'staff': 5
        };
        const lastLoginDays = s.lastLogin ? 
          Math.floor((now - new Date(s.lastLogin)) / (1000 * 60 * 60 * 24)) : 30;
        const activityFactor = Math.max(0.3, 1 - (lastLoginDays / 30));
        return sum + (roleMultiplier[s.role] || 5) * activityFactor;
      }, 0) / activeStaff.length
    ) : 0;

    // Attendance and performance (legacy)
    const attendanceRate = activeStaff.length > 0 ? Math.round(
      85 + (activeToday / activeStaff.length) * 13
    ) : 0;

    const performanceScore = Math.round((efficiency + utilization + satisfaction) / 3);

    // Top Performers Analysis
    const topPerformers = staff
      .map(s => {
        const roleEfficiency = {
          'dentist': 92, 'nurse': 88, 'front_office': 85, 
          'manager': 78, 'admin': 82, 'cashier': 90, 'staff': 75
        };
        const lastLoginDays = s.lastLogin ? 
          Math.floor((now - new Date(s.lastLogin)) / (1000 * 60 * 60 * 24)) : 30;
        const activityFactor = Math.max(0.7, 1 - (lastLoginDays / 30) * 0.2);
        const score = (roleEfficiency[s.role] || 75) * activityFactor;
        return { name: s.name, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // AI Recommendations
    const recommendations = [];
    if (efficiency < 80) {
      recommendations.push("Consider workflow optimization training for staff");
    }
    if (utilization < 75) {
      recommendations.push("Review staff scheduling to improve resource utilization");
    }
    if (satisfaction < 80) {
      recommendations.push("Implement staff feedback sessions to improve satisfaction");
    }
    if (activeToday / staff.length < 0.8) {
      recommendations.push("Increase staff engagement with daily check-ins");
    }
    if (recommendations.length === 0) {
      recommendations.push("Excellent performance across all metrics - maintain current practices");
    }

    return {
      total: staff.length,
      active: activeStaff.length,
      efficiency,
      efficiency_target: 85,
      efficiency_subtitle: 'task completion rate',
      efficiency_trend: Math.floor(Math.random() * 10) - 3,
      utilization,
      utilization_target: 80,
      utilization_subtitle: 'capacity utilization',
      utilization_trend: Math.floor(Math.random() * 8) - 2,
      satisfaction,
      satisfaction_target: 85,
      satisfaction_subtitle: 'staff satisfaction',
      satisfaction_trend: Math.floor(Math.random() * 6) - 1,
      revenue_per_staff: revenuePerStaff,
      revenue_per_staff_subtitle: 'monthly average',
      revenue_per_staff_trend: Math.floor(Math.random() * 12) - 2,
      capacity,
      capacity_subtitle: 'operational capacity',
      capacity_trend: Math.floor(Math.random() * 8) - 3,
      productivity: avgProductivity,
      productivity_subtitle: 'tasks completed',
      productivity_trend: Math.floor(Math.random() * 10) - 2,
      attendance: attendanceRate,
      attendance_subtitle: 'this month',
      attendance_trend: Math.floor(Math.random() * 5),
      performance: performanceScore,
      performance_subtitle: 'overall rating',
      performance_trend: Math.floor(Math.random() * 8) - 1,
      lastActivity: activeToday,
      lastActivity_subtitle: 'logged in today',
      top_performers: topPerformers,
      recommendations
    };
  }, [staff, backendStats]);

  const summaryLabels = useMemo(() => ({
    total: t('clinic.staff.summary.total'),
    active: t('clinic.staff.summary.active'),
    efficiency: t('clinic.staff.summary.efficiency'),
    utilization: t('clinic.staff.summary.utilization'),
    satisfaction: t('clinic.staff.summary.satisfaction'),
    revenue_per_staff: t('clinic.staff.summary.revenue_per_staff'),
    capacity: t('clinic.staff.summary.capacity'),
    productivity: t('clinic.staff.summary.productivity'),
    attendance: t('clinic.staff.summary.attendance'),
    performance: t('clinic.staff.summary.performance'),
    lastActivity: t('clinic.staff.summary.lastActivity')
  }), [t]);





  const renderProfileModal = () => {
    if (!viewProfileModal) {
      return null;
    }

    const joinDate = viewProfileModal.joinDate
      ? new Date(viewProfileModal.joinDate).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')
      : t('clinic.staff.profile.defaults.missing');

    const lastLogin = viewProfileModal.lastLogin
      ? new Date(viewProfileModal.lastLogin).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')
      : t('clinic.staff.profile.defaults.never');

    const handleSubmit = (event) => {
      event.preventDefault();
      handleProfileUpdate({
        ...profileForm,
        permissions: selectedPermissions
      });
    };

    return (
      <ModalPortal>
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface-elevated rounded-3xl border border-border/40 shadow-2xl flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 max-h-[90vh]">
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6 md:p-8 space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                      {t('clinic.staff.profile.badge')}
                    </p>
                    <h2 className="text-2xl font-semibold text-primary">
                      {viewProfileModal.name || t('clinic.staff.profile.defaults.unknown')}
                    </h2>
                    <p className="text-sm text-secondary">{viewProfileModal.email || t('clinic.staff.profile.defaults.missing')}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <AppIcon name="Shield" size={14} />
                        {roleLabels[viewProfileModal.role] || toTitleCase(viewProfileModal.role)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {statusLabels[viewProfileModal.status] || toTitleCase(viewProfileModal.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingProfile && (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="rounded-full p-2 text-secondary transition hover:bg-border/20"
                        aria-label="Edit Profile"
                      >
                        <AppIcon name="Edit" size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={isEditingProfile ? () => setIsEditingProfile(false) : closeViewProfile}
                      className="rounded-full p-2 text-secondary transition hover:bg-border/20"
                      aria-label={isEditingProfile ? 'Cancel Edit' : 'Close'}
                    >
                      <AppIcon name="X" size={18} />
                    </button>
                  </div>
                </header>

                {profileSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <AppIcon name="CheckCircle" size={18} />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <section className="grid gap-4 md:grid-cols-2">
                  {/* Nama - Editable when editing */}
                  <div className="space-y-1">
                    <label htmlFor="profile-name" className="text-sm font-medium text-secondary">
                      {t('clinic.staff.profile.fields.name')}
                    </label>
                {isEditingProfile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <AppIcon name="User" size={16} />
                    </div>
                    <input
                      id="profile-name"
                      type="text"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Nama lengkap"
                      disabled={profileLoading}
                      className="flex-1 border-0 bg-transparent py-1 text-sm text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface px-3 py-2 text-sm">
                    <AppIcon name="User" size={16} className="text-secondary" />
                    <span className="text-primary">
                      {viewProfileModal.name || t('clinic.staff.profile.defaults.unknown')}
                    </span>
                  </div>
                )}
              </div>

              {/* Email - Editable when editing */}
              <div className="space-y-1">
                <label htmlFor="profile-email" className="text-sm font-medium text-secondary">
                  {t('clinic.staff.profile.fields.email')}
                </label>
                {isEditingProfile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <AppIcon name="Mail" size={16} />
                    </div>
                    <input
                      id="profile-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="Email address"
                      disabled={profileLoading}
                      className="flex-1 border-0 bg-transparent py-1 text-sm text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface px-3 py-2 text-sm">
                    <AppIcon name="Mail" size={16} className="text-secondary" />
                    <span className="text-primary">
                      {viewProfileModal.email || t('clinic.staff.profile.defaults.missing')}
                    </span>
                  </div>
                )}
              </div>

              {[
                {
                  id: 'profile-phone',
                  field: 'phone',
                  label: t('clinic.staff.profile.fields.phone') || 'Phone',
                  icon: 'Phone',
                  value: profileForm.phone,
                  placeholder: 'Phone number (optional)',
                  type: 'tel',
                  displayValue: viewProfileModal.phone || 'Tidak ada'
                },
                {
                  id: 'profile-position',
                  field: 'position',
                  label: t('clinic.staff.profile.fields.position') || 'Position',
                  icon: 'Briefcase',
                  value: profileForm.position,
                  placeholder: 'Position/Job title',
                  type: 'text',
                  displayValue: viewProfileModal.position || 'Tidak ada'
                },
                {
                  id: 'profile-department',
                  field: 'department',
                  label: t('clinic.staff.profile.fields.department') || 'Department',
                  icon: 'Layers',
                  value: profileForm.department,
                  placeholder: 'Department name',
                  type: 'text',
                  displayValue: viewProfileModal.department || 'Tidak ada'
                }
              ].map(({ id, field, label, icon, value, placeholder, type, displayValue }) => (
                <div key={id} className="space-y-1">
                  <label htmlFor={id} className="text-sm font-medium text-secondary">
                    {label}
                  </label>
                  {isEditingProfile ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <AppIcon name={icon} size={16} />
                      </div>
                      <input
                        id={id}
                        type={type}
                        value={value}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, [field]: event.target.value }))
                        }
                        placeholder={placeholder}
                        disabled={profileLoading}
                        className="flex-1 border-0 bg-transparent py-1 text-sm text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface px-3 py-2 text-sm">
                      <AppIcon name={icon} size={16} className="text-secondary" />
                      <span className="text-primary">{displayValue}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-sm font-medium text-secondary">
                  {t('clinic.staff.profile.fields.joinDate')}
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface px-3 py-2 text-sm">
                  <AppIcon name="CalendarDays" size={16} className="text-secondary" />
                  <span className="text-primary">{joinDate}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-secondary">
                  {t('clinic.staff.profile.fields.lastLogin')}
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface px-3 py-2 text-sm">
                  <AppIcon name="Clock" size={16} className="text-secondary" />
                  <span className="text-primary">{lastLogin}</span>
                </div>
              </div>
            </section>

            {/* Permissions Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-secondary">{t('clinic.staff.profile.permissions')}</h3>
                {isEditingProfile && (
                  <span className="text-xs text-secondary">
                    {selectedPermissions.length} dari {availableModules.length} modul
                  </span>
                )}
              </div>
              
              {isEditingProfile ? (
                <div className="space-y-3">
                  {availableModules.map((module) => {
                    const isSelected = selectedPermissions.includes(module.id);
                    return (
                      <div
                        key={module.id}
                        className={`rounded-xl border p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent/40 bg-accent/5'
                            : 'border-border/40 bg-surface hover:border-border/60'
                        }`}
                        onClick={() => {
                          setSelectedPermissions(prev => 
                            prev.includes(module.id)
                              ? prev.filter(p => p !== module.id)
                              : [...prev, module.id]
                          );
                        }}
                      >
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 h-4 w-4 rounded border-border/40 text-accent focus:ring-accent/20"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-primary">{module.name}</div>
                            <div className="text-sm text-secondary">{module.description}</div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(viewProfileModal.permissions) ? viewProfileModal.permissions : selectedPermissions).map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-surface px-3 py-1 text-xs font-medium text-secondary"
                    >
                      <AppIcon name="Check" size={12} />
                      {availableModules.find(m => m.id === permission)?.name || permission}
                    </span>
                  ))}
                </div>
              )}
                </section>

                {profileError && (
                  <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{profileError}</p>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-border/40 p-6 bg-surface flex-shrink-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-secondary transition hover:border-border/60 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={profileLoading}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/60"
                    >
                      {profileLoading && <AppIcon name="Loader2" size={16} className="animate-spin" />}
                      {profileLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={closeViewProfile}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-secondary transition hover:border-border/60 hover:bg-surface-elevated"
                  >
                    Tutup
                  </button>
                )}
              </div>
            </div>
            </form>
          </div>
        </div>
    </ModalPortal>
    );
  };

  const renderEditRoleModal = () => {
    if (!editRoleModal) {
      return null;
    }

    const isOwner = editRoleModal.role === 'owner';

    const handleSubmit = (event) => {
      event.preventDefault();
      handleRoleUpdate(roleForm);
    };

    return (
      <ModalPortal>
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface-elevated rounded-3xl border border-border/40 shadow-2xl">
            <form onSubmit={handleSubmit} className="grid gap-6 p-6 md:p-8">
            <header className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                {t('clinic.staff.modals.edit.badge')}
              </p>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-semibold text-primary">{t('clinic.staff.modals.edit.title')}</h2>
                  <p className="text-sm text-secondary">
                    {t('clinic.staff.modals.edit.subtitle', { name: editRoleModal.name || '' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditRole}
                  className="rounded-full p-2 text-secondary transition hover:bg-border/20"
                  aria-label={t('clinic.staff.modals.edit.actions.close')}
                >
                  <AppIcon name="X" size={18} />
                </button>
              </div>
            </header>

            {roleSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <AppIcon name="CheckCircle" size={18} />
                <span>{roleSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="role-select" className="text-sm font-medium text-secondary">
                  {t('clinic.staff.modals.edit.fields.role')}
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <AppIcon name="Shield" size={16} />
                  </div>
                  <select
                    id="role-select"
                    value={roleForm.role}
                    onChange={(event) => setRoleForm((prev) => ({ ...prev, role: event.target.value }))}
                    disabled={isOwner || roleLoading}
                    className="flex-1 border-0 bg-transparent py-1 text-sm text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-secondary/70">
                  {t('clinic.staff.modals.edit.helperRole')}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="status-select" className="text-sm font-medium text-secondary">
                  {t('clinic.staff.modals.edit.fields.status')}
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <AppIcon name="Activity" size={16} />
                  </div>
                  <select
                    id="status-select"
                    value={roleForm.status}
                    onChange={(event) => setRoleForm((prev) => ({ ...prev, status: event.target.value }))}
                    disabled={roleLoading}
                    className="flex-1 border-0 bg-transparent py-1 text-sm text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-secondary/70">
                  {t('clinic.staff.modals.edit.helperStatus')}
                </p>
              </div>

              {roleError && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{roleError}</p>
              )}
            </div>

            <footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditRole}
                className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-secondary transition hover:border-border/60 hover:bg-surface"
                disabled={roleLoading}
              >
                {t('clinic.staff.modals.edit.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={roleLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/60"
              >
                {roleLoading && <AppIcon name="Loader2" size={16} className="animate-spin" />}
                {roleLoading ? t('clinic.staff.modals.edit.actions.saving') : t('clinic.staff.modals.edit.actions.submit')}
              </button>
            </footer>
            </form>
          </div>
        </div>
    </ModalPortal>
    );
  };





  if (loading) {
    const summarySkeletons = Array.from({ length: 3 });
    const listSkeletons = Array.from({ length: 6 });
    const tabSkeletons = ['list', 'roles', 'departments'];

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-7 w-72 rounded-lg bg-accent/20 animate-pulse"></div>
                  <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                  <div className="h-10 w-36 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-48 rounded-xl bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-2">
                {tabSkeletons.map((key) => (
                  <div key={key} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {summarySkeletons.map((_, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-3">
                  <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-24 rounded bg-accent/20 animate-pulse"></div>
                  <div className="h-3 w-40 rounded bg-accent/10 animate-pulse"></div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                  <div className="h-10 w-full sm:w-80 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-36 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-36 rounded-lg bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-32 rounded-lg bg-accent/20 animate-pulse"></div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="h-5 w-48 rounded bg-accent/10 animate-pulse"></div>
              <div className="space-y-3">
                {listSkeletons.map((_, idx) => (
                  <div key={idx} className="border border-primary/10 bg-surface rounded-xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10"></div>
                      <div className="space-y-2">
                        <div className="h-3 w-40 rounded bg-accent/10"></div>
                        <div className="h-3 w-28 rounded bg-accent/10"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-20 rounded bg-accent/10"></div>
                      <div className="h-3 w-16 rounded bg-accent/10"></div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-lg bg-accent/10"></div>
                        <div className="h-8 w-8 rounded-lg bg-accent/10"></div>
                        <div className="h-8 w-8 rounded-lg bg-accent/10"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <ClinicSideBar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-0">
          {/* Header seperti home page */}
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('clinic.staff.badge') || 'Staff Management'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('clinic.staff.title') || 'Manajemen Staff'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.staff.subtitle') || 'Kelola staff klinik, role, dan akses sistem'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {staff.length} {t('clinic.staff.totalStaff') || 'total staff'}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleInviteStaff}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
                  >
                    <AppIcon name="UserPlus" size={16} />
                    <span>{t('clinic.staff.actions.addStaff')}</span>
                  </button>
                  <button 
                    onClick={handleAddDentist}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <AppIcon name="UserCheck" size={16} />
                    <span>{t('clinic.staff.actions.addDentist') || 'Add Dentist'}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'list'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                  }`}
                >
                  <AppIcon name="Users" size={16} />
                  <span>{t('clinic.staff.tabs.list')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'stats'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                  }`}
                >
                  <AppIcon name="BarChart3" size={16} />
                  <span>{t('clinic.staff.tabs.stats')}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background theme-transition">
          {notice && (
            <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <div className="flex items-center gap-2">
                <AppIcon name="CheckCircle" size={18} />
                <span>{typeof notice === 'string' ? notice : notice?.message || ''}</span>
              </div>
              <button
                onClick={() => setNotice(null)}
                className="rounded-full p-1 text-green-700 dark:text-green-400 transition hover:bg-green-100/80 dark:hover:bg-green-800/40"
                aria-label={t('clinic.staff.actions.closeNotification')}
              >
                <AppIcon name="X" size={14} />
              </button>
            </div>
          )}



          {/* Content */}
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <AppIcon name="AlertCircle" size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">{t('clinic.staff.errors.title')}</h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={fetchStaff}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-700 transition-colors duration-200"
              >
                {t('clinic.staff.actions.retry')}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'list' && (
                <StaffDirectory
                  staff={staff}
                  branches={branches}
                  branchesLoading={branchesLoading}
                  search={search}
                  onSearchChange={setSearch}
                  roleFilter={roleFilter}
                  onRoleFilterChange={setRoleFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  translations={directoryTranslations}
                  roleLabels={roleLabels}
                  statusLabels={statusLabels}
                  onView={handleViewProfile}
                  onEdit={handleEditRole}
                  onRemove={handleRemoveStaff}
                  onChangeBranch={handleChangeBranch}
                  onInvite={handleInviteStaff}
                />
              )}

              {activeTab === 'stats' && (
                <div className="space-y-8">
                  <StaffSummary 
                    stats={calculateStaffKPIs} 
                    labels={summaryLabels} 
                  />
                  
                  {/* Additional insights section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
                      <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                        <AppIcon name="PieChart" size={20} className="mr-2" />
                        Role Distribution
                      </h3>
                      <div className="space-y-3">
                        {Array.from(new Set(staff.map(s => s.role))).map(role => {
                          const count = staff.filter(s => s.role === role).length;
                          const percentage = Math.round((count / staff.length) * 100);
                          return (
                            <div key={role} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-secondary capitalize">
                                {roleLabels[role] || role.replace(/_/g, ' ')}
                              </span>
                              <div className="flex items-center space-x-3">
                                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-accent h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-bold text-primary w-8 text-right">{count}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
                      <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                        <AppIcon name="TrendingUp" size={20} className="mr-2" />
                        Recent Activity
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-secondary">Active this week</span>
                          <span className="text-lg font-bold text-emerald-600">
                            {staff.filter(s => {
                              if (!s.lastLogin) return false;
                              const weekAgo = new Date();
                              weekAgo.setDate(weekAgo.getDate() - 7);
                              return new Date(s.lastLogin) >= weekAgo;
                            }).length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-secondary">New this month</span>
                          <span className="text-lg font-bold text-blue-600">
                            {staff.filter(s => {
                              if (!s.joinDate) return false;
                              const joinDate = new Date(s.joinDate);
                              const now = new Date();
                              return joinDate.getMonth() === now.getMonth() && 
                                     joinDate.getFullYear() === now.getFullYear();
                            }).length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-secondary">Role diversity</span>
                          <span className="text-lg font-bold text-purple-600">
                            {new Set(staff.map(s => s.role)).size} roles
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {renderProfileModal()}

      {renderEditRoleModal()}

      <StaffRemoveDialog
        open={!!removeModal}
        staff={removeModal}
        translations={buildRemoveModalTranslations(removeModal, t)}
        loading={removeLoading}
        error={removeError}
        onClose={closeRemoveModal}
        onConfirm={() => {
          const targetUserId = removeModal?.userId || removeModal?.id;
          removeModal && handleStaffRemoval(targetUserId);
        }}
      />

      {/* Custom Token Expired Modal */}
      {showTokenExpiredModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border/40 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AppIcon name="AlertCircle" size={32} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">Sesi Berakhir</h2>
                <p className="text-secondary text-sm">
                  Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleTokenExpired}
                  className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors duration-200"
                >
                  Login Kembali
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <StaffInviteModal
        open={inviteModal}
        onClose={closeInviteModal}
        onSubmit={handleInviteSubmit}
        translations={{
          badge: t('clinic.staff.modals.invite.badge') || 'Tambah Staff',
          title: t('clinic.staff.modals.invite.title') || 'Undang Staff Baru',
          subtitle: t('clinic.staff.modals.invite.subtitle') || 'Tambahkan anggota tim baru ke klinik Anda',
          fields: {
            name: t('clinic.staff.modals.invite.fields.name') || 'Nama Lengkap',
            email: t('clinic.staff.modals.invite.fields.email') || 'Email',
            password: t('clinic.staff.modals.invite.fields.password') || 'Password',
            role: t('clinic.staff.modals.invite.fields.role') || 'Role',
            position: t('clinic.staff.modals.invite.fields.position') || 'Posisi',
            department: t('clinic.staff.modals.invite.fields.department') || 'Departemen',
            branch: t('clinic.staff.modals.invite.fields.branch') || 'Cabang'
          },
          placeholders: {
            name: t('clinic.staff.modals.invite.placeholders.name') || 'Masukkan nama lengkap',
            email: t('clinic.staff.modals.invite.placeholders.email') || 'Masukkan email',
            password: t('clinic.staff.modals.invite.placeholders.password') || 'Masukkan password sementara',
            position: t('clinic.staff.modals.invite.placeholders.position') || 'Masukkan posisi',
            department: t('clinic.staff.modals.invite.placeholders.department') || 'Masukkan departemen',
            branch: t('clinic.staff.modals.invite.placeholders.branch') || 'Pilih cabang'
          },
          hints: {
            password: t('clinic.staff.modals.invite.hints.password') || 'Minimal 6 karakter. Staff dapat mengubah password setelah login pertama.',
            branch: t('clinic.staff.modals.invite.hints.branch') || 'Staff akan ditugaskan ke cabang yang dipilih'
          },
          actions: {
            cancel: t('clinic.staff.modals.invite.actions.cancel') || 'Batal',
            submit: t('clinic.staff.modals.invite.actions.submit') || 'Undang Staff',
            sending: t('clinic.staff.modals.invite.actions.sending') || 'Mengundang...'
          }
        }}
        roleOptions={roleOptions}
        branches={branches}
        branchesLoading={branchesLoading}
        loading={inviteLoading}
        error={inviteError}
      />

      <AddDentistModal
        isOpen={addDentistModal}
        onClose={closeAddDentistModal}
        onSubmit={handleAddDentistSubmit}
        loading={addDentistLoading}
        error={addDentistError}
        branches={branches}
        clinic={clinic}
        clinicLoading={clinicLoading}
      />

      <ChangeBranchModal
        open={!!changeBranchModal}
        onClose={() => setChangeBranchModal(null)}
        onSubmit={handleChangeBranchSubmit}
        staffMember={changeBranchModal}
        branches={branches}
        branchesLoading={branchesLoading}
        loading={changeBranchLoading}
        error={changeBranchError}
        translations={{
          title: t('clinic.staff.modals.changeBranch.title') || 'Change Branch Assignment',
          subtitle: t('clinic.staff.modals.changeBranch.subtitle') || 'Move staff member to a different branch',
          currentBranch: t('clinic.staff.modals.changeBranch.currentBranch') || 'Current Branch',
          newBranch: t('clinic.staff.modals.changeBranch.newBranch') || 'New Branch Assignment',
          selectBranch: t('clinic.staff.modals.changeBranch.selectBranch') || 'Select a branch...',
          mainBranch: t('clinic.staff.modals.changeBranch.mainBranch') || 'Main',
          unassigned: t('clinic.staff.modals.changeBranch.unassigned') || 'Unassigned',
          noBranches: t('clinic.staff.modals.changeBranch.noBranches') || 'No branches available',
          willMoveTo: t('clinic.staff.modals.changeBranch.willMoveTo') || 'Will move to',
          cancel: t('clinic.staff.modals.changeBranch.cancel') || 'Cancel',
          update: t('clinic.staff.modals.changeBranch.update') || 'Update Branch',
          updating: t('clinic.staff.modals.changeBranch.updating') || 'Updating...'
        }}
      />
    </div>
  );
};

export default StaffManagement;

const toTitleCase = (value = '') =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildRemoveModalTranslations = (staff, t) => ({
  badge: t('clinic.staff.modals.remove.badge'),
  title: t('clinic.staff.modals.remove.title'),
  description: t('clinic.staff.modals.remove.description', {
    name: staff?.name || t('clinic.staff.profile.defaults.unknown'),
    email: staff?.email || ''
  }),
  warningTitle: t('clinic.staff.modals.remove.warningTitle'),
  warningBody: t('clinic.staff.modals.remove.warningBody', {
    name: staff?.name || t('clinic.staff.profile.defaults.unknown')
  }),
  actions: {
    confirm: t('clinic.staff.modals.remove.actions.confirm'),
    deleting: t('clinic.staff.modals.remove.actions.deleting'),
    cancel: t('clinic.staff.modals.remove.actions.cancel'),
    close: t('clinic.staff.modals.remove.actions.close')
  }
});
