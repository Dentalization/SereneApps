import React, { useEffect, useState } from 'react';
import { shouldSuppressToastMessage } from '../../../contexts/ToastContext';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';
import SideBar from '../ui/SideBar';
import {
  getDentistServicesContext,
  getClinicDentistServices,
} from '../../../services/dentistPortalService';

const ClinicServices = () => {
  const [context, setContext] = useState(null);
  const [services, setServices] = useState({ general: [], specialist: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contextError, setContextError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const ctx = await getDentistServicesContext();
        setContext(ctx);
        if (ctx.dentistType === 'clinic') {
          const clinicData = await getClinicDentistServices();
          setServices({
            general: clinicData.general || [],
            specialist: clinicData.specialist || [],
            clinic: clinicData.clinic,
          });
        }
        setContextError(false);
      } catch (err) {
        console.error('Failed to load clinic services', err);
        setContextError(true);
        if (!shouldSuppressToastMessage(err?.message || 'Failed to load clinic services')) {
          setError('Failed to load assigned services');
        } else {
          setError('');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
      </div>
    );
  }

  const showIndependentNotice = context?.dentistType && context.dentistType !== 'clinic';

  const clinicInfo = services.clinic;

  return (
    <div className="min-h-screen bg-background flex">
      <SideBar />
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted">My Profile</p>
          <h1 className="text-3xl font-bold text-foreground">Assigned Clinic Services</h1>
          <p className="text-muted-foreground">
            These services are managed by your clinic. General services apply to all dentists in your branch, while specialist services are custom to you.
          </p>
          {contextError && (
            <p className="text-xs text-warning">
              Tidak dapat memuat detail klinik. Menampilkan data terbaru yang tersedia.
            </p>
          )}
        </header>

        {error && (
          <div className="rounded-xl border border-error/20 bg-error/10 text-error px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {showIndependentNotice && (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-6 text-center space-y-3">
            <h3 className="text-lg font-semibold text-warning">Independent Dentist</h3>
            <p className="text-sm text-warning/80">
              Anda mengatur layanan sendiri. Buka menu My Practice untuk menambah atau mengubah layanan.
            </p>
            <Button asChild variant="outline">
              <Link to="/dentist-portal/practice/services">Go to My Practice</Link>
            </Button>
          </div>
        )}

        {clinicInfo && (
          <div className="rounded-2xl border border-primary/10 bg-surface-elevated shadow-theme-sm p-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Clinic</p>
              <p className="text-xl font-semibold text-foreground">{clinicInfo.clinicName || 'Clinic'}</p>
              <p className="text-sm text-muted-foreground">{clinicInfo.branchName || 'Main Branch'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline">
                <Link to="/dentist-portal/profile/schedule">My Schedule</Link>
              </Button>
              <Button asChild>
                <Link to="/dentist-portal/profile/patients">My Patients</Link>
              </Button>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">General Services</h2>
            <div className="text-sm text-muted-foreground">
              Applied to all dentists in this branch
            </div>
          </div>
          {services.general.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 p-8 text-center text-sm text-muted-foreground">
              No general services have been configured for this branch yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {services.general.map((service) => (
                <article key={service.id} className="rounded-2xl border border-primary/10 bg-surface-elevated shadow-theme-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                      <p className="text-xs uppercase tracking-widest text-brand-primary mt-1">General Service</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-brand-primary">
                        Rp {Number(service.base_price || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.duration_minutes || 30} minutes
                      </p>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="Users" size={14} />
                    Auto-assigned to all dentists
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Specialist Services</h2>
            <div className="text-sm text-muted-foreground">
              Customized services assigned to you
            </div>
          </div>
          {services.specialist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 p-8 text-center text-sm text-muted-foreground">
              No specialist services assigned to you yet. Please contact your clinic owner or manager if you need adjustments.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {services.specialist.map((service) => (
                <article key={service.id} className="rounded-2xl border border-primary/10 bg-surface-elevated shadow-theme-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest mt-1">
                        <span className="px-2 py-1 rounded-full bg-brand-secondary/15 text-brand-secondary">
                          Specialist
                        </span>
                        {service.specialty && (
                          <span className="px-2 py-1 rounded-full bg-accent/15 text-accent">{service.specialty}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-brand-secondary">
                        Rp{' '}
                        {Number(service.custom_price ?? service.base_price ?? 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.duration_minutes || 30} minutes
                      </p>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                  )}
                  {service.custom_price && (
                    <div className="text-xs text-success/80 flex items-center gap-2">
                      <Icon name="BadgeDollarSign" size={14} />
                      Custom clinic pricing applied
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
};

export default ClinicServices;
