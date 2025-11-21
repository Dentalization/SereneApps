import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
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
  const canEdit = ['owner', 'manager', 'admin'].includes(userRole);

  const specialties = [
    'Orthodontics',
    'Periodontics',
    'Endodontics',
    'Prosthodontics',
    'Oral Surgery',
    'Pediatric Dentistry',
    'Cosmetic Dentistry',
    'Implantology',
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
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
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
      // Set formatted price for display
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

  // Format number dengan separator ribuan
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Handle price input dengan format Rp. X.XXX.XXX
  const handlePriceChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric
    setFormData({ ...formData, basePrice: value });
    setDisplayPrice(value ? formatNumber(value) : '');
  };

  // Handle duration dengan validasi
  const handleDurationChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, durationMinutes: value ? parseInt(value) : '' });
  };

  if (!canEdit) {
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-warning">
        You don't have permission to manage services. Contact your clinic owner or manager.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message.text && (
        <div className={cn(
          "rounded-lg p-4 border",
          message.type === 'success' ? "bg-success/10 border-success/20 text-success" : "bg-error/10 border-error/20 text-error"
        )}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Services</h2>
        <Button onClick={() => handleOpenDialog()}>
          + Add Service
        </Button>
      </div>

      {/* Services List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground mb-4">No services added yet</p>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            Add First Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">{service.name}</h3>
                  {service.category === 'specialist' && service.specialty && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-brand-primary/10 text-brand-primary rounded">
                      {service.specialty}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "px-2 py-1 text-xs rounded",
                  service.is_active ? "bg-success/10 text-success" : "bg-gray-200 dark:bg-gray-700 text-muted-foreground"
                )}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-brand-primary">{formatCurrency(service.base_price)}</span>
                <span className="text-sm text-muted-foreground">{service.duration_minutes} min</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(service)} className="flex-1">
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(service.id)} className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-foreground">
                  {editingService ? 'Edit Service' : 'Add Service'}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  label="Service Name"
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  required
                  placeholder="e.g., Teeth Cleaning, Orthodontic Consultation"
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the service..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                    <select
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="general">General</option>
                      <option value="specialist">Specialist</option>
                    </select>
                  </div>

                  {formData.category === 'specialist' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Specialty</label>
                      <select
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      >
                        <option value="">Select Specialty</option>
                        {specialties.map((specialty) => (
                          <option key={specialty} value={specialty}>{specialty}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Base Price (IDR)*"
                      type="text"
                      value={displayPrice}
                      onChange={handlePriceChange}
                      required
                      placeholder="0"
                      className="font-mono"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Format: Rp. {displayPrice || '0'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Duration (minutes) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.durationMinutes}
                      onChange={handleDurationChange}
                      required
                      placeholder="30"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Rekomendasi kelipatan 15 menit (15, 30, 45, 60...)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-input text-brand-primary focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAvailableForAllDentists}
                      onChange={(e) => setFormData({ ...formData, isAvailableForAllDentists: e.target.checked })}
                      className="h-4 w-4 rounded border-input text-brand-primary focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">Available for all dentists</span>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingService ? 'Update' : 'Add'} Service
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManagement;
