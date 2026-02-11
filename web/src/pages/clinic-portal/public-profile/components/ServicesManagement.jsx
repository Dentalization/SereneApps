import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
// Pastikan path import ModalPortal ini sesuai dengan struktur project Anda
import ModalPortal from '../../../../components/ui/ModalPortal';
import { cn } from '../../../../utils/cn';

const ServicesManagement = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    category: 'general',
    specialty: '',
    basePrice: '',
    durationMinutes: 30,
    isActive: true,
    isAvailableForAllDentists: true,
  });

  // Display formatted price for UI
  const [displayPrice, setDisplayPrice] = useState('');

  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

  const specialties = [
    'Ortodonti (Sp.Ort)',
    'Konservasi Gigi (Sp.KG)',
    'Bedah Mulut (Sp.BM)',
    'Periodonsia (Sp.Perio)',
    'Prostodonsia (Sp.Pros)',
    'Kedokteran Gigi Anak (Sp.KGA)',
    'Penyakit Mulut (Sp.PM)',
    'Radiologi Kedokteran Gigi (Sp.RKG)',
    'Odontologi Forensik',
  ];

  useEffect(() => {
    if (canEdit) {
      fetchServices();
    }
  }, [canEdit]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching services from /clinic/services...');
      const response = await authHttp.get('/clinic/services');
      console.log('✅ Services response:', response.data);
      setServices(response.data.services || []);
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      showMessage('error', `Failed to load services: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleOpenDialog = (service = null) => {
    if (service) {
      const normalizedPrice = service.base_price ? Math.round(Number(service.base_price)).toString() : '';
      setEditingService(service);
      setFormData({
        serviceName: service.name || '',
        description: service.description || '',
        category: service.category,
        specialty: service.specialty || '',
        basePrice: normalizedPrice,
        durationMinutes: service.duration_minutes,
        isActive: service.is_active,
        isAvailableForAllDentists: service.is_available_for_all_dentists,
      });
      setDisplayPrice(normalizedPrice ? formatNumber(normalizedPrice) : '');
    } else {
      setEditingService(null);
      setFormData({
        serviceName: '',
        description: '',
        category: 'general',
        specialty: '',
        basePrice: '',
        durationMinutes: 30,
        isActive: true,
        isAvailableForAllDentists: true,
      });
      setDisplayPrice('');
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingService(null);
  };

  const buildPayload = () => {
    const trimmedName = formData.serviceName.trim();
    const numericPrice = formData.basePrice ? Number(formData.basePrice) : null;
    const numericDuration = formData.durationMinutes ? Number(formData.durationMinutes) : 30;

    return {
      name: trimmedName,
      description: formData.description?.trim() || null,
      category: formData.category,
      specialty: formData.category === 'specialist' ? (formData.specialty || null) : null,
      basePrice: numericPrice,
      durationMinutes: numericDuration,
      isAvailableForAllDentists: !!formData.isAvailableForAllDentists,
      isActive: !!formData.isActive,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = buildPayload();
    if (!payload.name) {
      showMessage('error', 'Service name is required');
      return;
    }
    if (!payload.basePrice || Number.isNaN(payload.basePrice)) {
      showMessage('error', 'Valid base price is required');
      return;
    }

    try {
      if (editingService) {
        await authHttp.put(`/clinic/services/${editingService.id}`, payload);
        showMessage('success', 'Service updated successfully');
      } else {
        await authHttp.post('/clinic/services', payload);
        showMessage('success', 'Service added successfully');
      }

      await fetchServices();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving service:', error);
      showMessage('error', error.response?.data?.error || 'Failed to save service');
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    try {
      await authHttp.delete(`/clinic/services/${serviceId}`);
      showMessage('success', 'Service deleted successfully');
      await fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      showMessage('error', 'Failed to delete service');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handlePriceChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, basePrice: value });
    setDisplayPrice(value ? formatNumber(value) : '');
  };

  const handleDurationChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, durationMinutes: value ? parseInt(value) : '' });
  };

  if (!canEdit) {
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 text-warning flex items-center gap-3">
        <span className="text-2xl">🔒</span>
        <span className="font-medium">You don't have permission to manage services. Contact your clinic owner or manager.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message Alert */}
      {message.text && (
        <div className={cn(
          "rounded-2xl p-4 border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2",
          message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
        )}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Services & Pricing</h2>
          <p className="text-muted-foreground mt-1">Manage your clinic's service catalog and pricing</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all">
          <span className="mr-2 text-lg">+</span> Add New Service
        </Button>
      </div>

      {/* Services List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading services...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
            🩺
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Services Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Start building your service catalog to showcase your treatments to patients.</p>
          <Button variant="outline" onClick={() => handleOpenDialog()} className="rounded-xl">
            Add Your First Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="group bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-full"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => handleOpenDialog(service)}
                  className="p-2 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm text-gray-400 hover:text-brand-primary rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition-all hover:scale-105"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm text-gray-400 hover:text-red-500 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition-all hover:scale-105"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm",
                    service.category === 'specialist'
                      ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                      : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  )}>
                    {service.category === 'specialist' ? '🦷' : '🩺'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-brand-primary transition-colors">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {service.category === 'specialist' && service.specialty && (
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md">
                          {service.specialty}
                        </span>
                      )}
                      {!service.is_active && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                  {service.description || "No description provided."}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50 flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Price</div>
                    <div className="text-2xl font-bold text-brand-primary tracking-tight">
                      {formatCurrency(service.base_price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {service.duration_minutes} min
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog wrapped in Portal */}
      {showDialog && (
        <ModalPortal>
          {/* Fixed Wrapper */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">

            {/* Backdrop with Blur */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
              onClick={handleCloseDialog}
            />

            {/* Modal Container */}
            <div
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {editingService ? 'Edit Service' : 'New Service'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingService ? 'Update service details and pricing' : 'Add a new treatment to your catalog'}
                  </p>
                </div>
                <button
                  onClick={handleCloseDialog}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-8 custom-scrollbar">
                <form id="serviceForm" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      label="Service Name"
                      value={formData.serviceName}
                      onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                      required
                      placeholder="e.g., Teeth Cleaning, Orthodontic Consultation"
                      className="text-lg font-medium"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Describe the procedure, benefits, and what patients can expect..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                        <div className="relative">
                          <select
                            className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 appearance-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option value="general">General Dentistry</option>
                            <option value="specialist">Specialist Treatment</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </div>

                      {formData.category === 'specialist' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Specialty</label>
                          <div className="relative">
                            <select
                              className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 appearance-none"
                              value={formData.specialty}
                              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                            >
                              <option value="">Select Specialty</option>
                              {specialties.map((specialty) => (
                                <option key={specialty} value={specialty}>{specialty}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Base Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rp</span>
                          <input
                            type="text"
                            value={displayPrice}
                            onChange={handlePriceChange}
                            required
                            placeholder="0"
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 font-mono text-lg tracking-wide"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Duration <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="15"
                            step="15"
                            value={formData.durationMinutes}
                            onChange={handleDurationChange}
                            required
                            placeholder="30"
                            className="w-full pl-4 pr-16 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">Minutes</span>
                        </div>
                        <p className="text-xs text-gray-500">Recommended: 15, 30, 45, 60 mins</p>
                      </div>
                    </div>

                    <div className="flex flax-wrap gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="peer h-5 w-5 rounded-md border-gray-300 text-brand-primary focus:ring-brand-primary/50 transition-all cursor-pointer"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-primary transition-colors">Active Service</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isAvailableForAllDentists}
                            onChange={(e) => setFormData({ ...formData, isAvailableForAllDentists: e.target.checked })}
                            className="peer h-5 w-5 rounded-md border-gray-300 text-brand-primary focus:ring-brand-primary/50 transition-all cursor-pointer"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-primary transition-colors">Available to All Dentists</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-end gap-3 sticky bottom-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="rounded-xl hover:bg-white dark:hover:bg-gray-700 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="serviceForm"
                  className="rounded-xl shadow-lg shadow-brand-primary/20 px-8"
                >
                  {editingService ? 'Save Changes' : 'Create Service'}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ServicesManagement;