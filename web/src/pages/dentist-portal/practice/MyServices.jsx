import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { cn } from '../../../utils/cn';
import ModalPortal from '../../../components/ui/ModalPortal';
import { shouldSuppressToastMessage } from '../../../contexts/ToastContext';
import SideBar from '../ui/SideBar';
import {
  getDentistServicesContext,
  getIndependentServices,
  createIndependentService,
  updateIndependentService,
  deleteIndependentService,
} from '../../../services/dentistPortalService';

const initialForm = {
  name: '',
  description: '',
  price: '',
  durationMinutes: 30,
  isActive: true,
};

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const formatNumber = (value) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const MyServices = () => {
  const [context, setContext] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [displayPrice, setDisplayPrice] = useState('');
  const [contextError, setContextError] = useState(false);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        const data = await getDentistServicesContext();
        setContext(data);
        if (data.dentistType === 'independent') {
          await fetchServices();
        }
        setContextError(false);
      } catch (error) {
        console.error('Failed to load dentist context', error);
        setContextError(true);
        setContext(null);
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, []);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const list = await getIndependentServices();
      setServices(list);
    } catch (error) {
      console.error('Failed to load services', error);
      showMessage('error', 'Failed to load personal services');
    } finally {
      setLoadingServices(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (text) {
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const isIndependent = context?.dentistType === 'independent';

  const resetForm = () => {
    setFormData(initialForm);
    setDisplayPrice('');
    setEditingService(null);
  };

  const handleOpenDialog = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name || '',
        description: service.description || '',
        price: service.price ? Math.round(Number(service.price)) : '',
        durationMinutes: service.duration_minutes || 30,
        isActive: service.is_active,
      });
      setDisplayPrice(service.price ? formatNumber(Math.round(Number(service.price))) : '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handlePriceChange = (event) => {
    const raw = event.target.value.replace(/[^0-9]/g, '');
    setFormData((prev) => ({ ...prev, price: raw }));
    setDisplayPrice(raw ? formatNumber(raw) : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: formData.name?.trim(),
      description: formData.description?.trim(),
      price: Number(formData.price || 0),
      durationMinutes: Number(formData.durationMinutes || 30),
      isActive: formData.isActive,
    };

    if (!payload.name) {
      return showMessage('error', 'Service name is required');
    }

    if (!payload.price || Number.isNaN(payload.price)) {
      return showMessage('error', 'Price must be provided');
    }

    try {
      if (editingService) {
        await updateIndependentService(editingService.id, payload);
        showMessage('success', 'Service updated successfully');
      } else {
        await createIndependentService(payload);
        showMessage('success', 'Service created successfully');
      }
      await fetchServices();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save service', error);
      const errText = error.response?.data?.error || 'Failed to save service';
      showMessage('error', errText);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Delete this service? This action cannot be undone.')) return;
    try {
      await deleteIndependentService(serviceId);
      showMessage('success', 'Service deleted');
      await fetchServices();
    } catch (error) {
      console.error('Failed to delete service', error);
      showMessage('error', error.response?.data?.error || 'Failed to delete service');
    }
  };

  const placeholderContent = useMemo(() => {
    if (loadingContext) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      );
    }

    if (!context && contextError) {
      return (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-warning">Dentist context unavailable</h3>
          <p className="text-sm text-warning/80">
            Kami tidak dapat memverifikasi akun dentist Anda saat ini. Coba untuk logout lalu login kembali sebagai dentist.
          </p>
        </div>
      );
    }

    if (!isIndependent) {
      return (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-warning">Clinic-Managed Services</h3>
          <p className="text-sm text-warning/80">
            As a clinic dentist, your services are configured by the clinic. Visit the My Profile section to see the services assigned to you.
          </p>
          <div>
            <Button asChild variant="outline">
              <Link to="/dentist-portal/profile/services">View Clinic Services</Link>
            </Button>
          </div>
        </div>
      );
    }

    return null;
  }, [isIndependent, loadingContext]);

  return (
    <div className="min-h-screen bg-background flex theme-transition">
      <SideBar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-background theme-transition">
        <div className="p-6 md:p-8 space-y-8">
        <section className="clinic-page-header space-y-6 rounded-3xl border border-border/40 bg-surface-elevated p-6 shadow-theme-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">My Practice</p>
              <h1 className="text-3xl font-bold text-foreground">Services & Pricing</h1>
              <p className="text-muted-foreground mt-2 max-w-3xl">
                Craft your offerings for teleconsultations, in-person treatments, and specialist care. These services appear directly in your patient booking flow.
              </p>
              {contextError && (
                <p className="text-xs text-warning mt-2">
                  Tidak dapat memuat status dentist Anda. Menampilkan pengaturan praktik mandiri secara default.
                </p>
              )}
            </div>
            {isIndependent && (
              <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
                + New Service
              </Button>
            )}
          </div>
        </section>

        {message.text && (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm font-medium',
              message.type === 'success'
                ? 'bg-success/10 border-success/20 text-success'
                : 'bg-error/10 border-error/20 text-error'
            )}
          >
            {message.text}
          </div>
        )}

        {!isIndependent ? (
          placeholderContent
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-4 shadow-theme-sm">
                <p className="text-xs uppercase tracking-widest text-muted">Active Services</p>
                <p className="text-3xl font-bold text-brand-primary">{services.filter((s) => s.is_active !== false).length}</p>
                <p className="text-muted-foreground text-sm">Visible to patients</p>
              </div>
              <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-4 shadow-theme-sm">
                <p className="text-xs uppercase tracking-widest text-muted">Specialist</p>
                <p className="text-3xl font-bold text-brand-secondary">
                  {context?.primarySpecialization || '—'}
                </p>
                <p className="text-muted-foreground text-sm">Your expertise area</p>
              </div>
              <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-4 shadow-theme-sm">
                <p className="text-xs uppercase tracking-widest text-muted">Last Updated</p>
                <p className="text-3xl font-bold text-foreground">
                  {services.length ? new Date(services[0].updated_at || services[0].created_at).toLocaleDateString('id-ID') : '—'}
                </p>
                <p className="text-muted-foreground text-sm">Keep details fresh</p>
              </div>
            </div>

            {loadingServices ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
              </div>
            ) : services.length === 0 ? (
              <div className="bg-surface-elevated border border-dashed border-primary/30 rounded-2xl p-10 text-center space-y-3 shadow-theme-sm">
                <h3 className="text-lg font-semibold text-foreground">No services yet</h3>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                  Start by creating your core treatments or teleconsultation packages. You can set pricing, session duration, and add detailed descriptions.
                  {context?.primarySpecialization && (
                    <span className="block mt-2 text-brand-primary font-medium">
                      Your specialization: {context.primarySpecialization}
                    </span>
                  )}
                </p>
                <Button onClick={() => handleOpenDialog()} className="mt-2">
                  Create Your First Service
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <div key={service.id} className="bg-surface-elevated border border-primary/10 rounded-2xl p-5 shadow-theme-sm flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs uppercase tracking-widest">
                          {context?.primarySpecialization && (
                            <span className="px-2 py-1 rounded-full bg-brand-secondary/15 text-brand-secondary">
                              {context.primarySpecialization}
                            </span>
                          )}
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full',
                              service.is_active !== false
                                ? 'bg-success/15 text-success'
                                : 'bg-gray-200 text-gray-500'
                            )}
                          >
                            {service.is_active !== false ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-brand-primary">{formatCurrency(service.price)}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.duration_minutes || 30} minutes
                        </p>
                      </div>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{service.description}</p>
                    )}
                    <div className="mt-auto flex gap-3">
                      <Button variant="outline" className="flex-1" size="sm" onClick={() => handleOpenDialog(service)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="flex-1" size="sm" onClick={() => handleDelete(service.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </main>

      {dialogOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl w-full max-w-2xl shadow-theme-lg border border-primary/10">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-primary/10">
                <h3 className="text-xl font-semibold text-foreground">
                  {editingService ? 'Edit Service' : 'Create Service'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These services appear in your independent practice profile.
                </p>
              </div>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <Input
                  label="Service Name"
                  placeholder="e.g., Teleconsultation, Whitening, Orthodontic Control"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    className="w-full rounded-xl border border-primary/20 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    rows={3}
                    placeholder="Share what patients can expect..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Base Price (IDR)"
                      value={displayPrice}
                      onChange={handlePriceChange}
                      placeholder="0"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Format: Rp. {displayPrice || '0'}</p>
                  </div>
                  <Input
                    label="Duration (minutes)"
                    type="number"
                    min={10}
                    max={240}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-primary text-brand-primary focus:ring-accent"
                  />
                  Show this service to patients
                </label>
              </div>
              <div className="p-6 border-t border-primary/10 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">{editingService ? 'Save Changes' : 'Create Service'}</Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default MyServices;
