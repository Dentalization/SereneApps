import React, { useEffect, useState } from 'react';
import { shouldSuppressToastMessage } from '../../../contexts/ToastContext';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
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
      <div className="min-h-screen bg-background flex theme-transition">
        <SideBar />
        <main className="flex-1 min-w-0 flex items-center justify-center bg-background theme-transition">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
        </main>
      </div>
    );
  }

  const showIndependentNotice = context?.dentistType && context.dentistType !== 'clinic';
  const clinicInfo = services.clinic;

  return (
    <div className="min-h-screen bg-background flex theme-transition">
      <SideBar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-background theme-transition">
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Header Card (Kept exactly as requested) */}
          <section className="clinic-page-header space-y-6 rounded-3xl border border-border/40 bg-surface-elevated p-6 shadow-theme-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">My Profile</p>
              <h1 className="text-3xl font-bold text-foreground">Assigned Clinic Services</h1>
              <p className="text-muted-foreground max-w-4xl">
                These services are managed by your clinic. General services apply to all dentists in your branch, while specialist services are custom to you.
              </p>
              {contextError && (
                <p className="text-xs text-warning">
                  Tidak dapat memuat detail klinik. Menampilkan data terbaru yang tersedia.
                </p>
              )}
            </div>
          </section>

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
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/dentist-portal/profile/schedule">My Schedule</Link>
                </Button>
                <Button asChild className="rounded-xl bg-accent hover:bg-accent-hover text-white">
                  <Link to="/dentist-portal/profile/patients">My Patients</Link>
                </Button>
              </div>
            </div>
          )}

          {/* General Services Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">General Services</h2>
              <div className="text-xs text-muted-foreground bg-surface-elevated border border-primary/10 px-3 py-1 rounded-full">
                Applied to all dentists in this branch
              </div>
            </div>
            {services.general.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/30 p-8 text-center text-sm text-muted-foreground">
                No general services have been configured for this branch yet.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {services.general.map((service) => (
                  <article 
                    key={service.id} 
                    className="flex flex-col justify-between rounded-2xl border border-primary/10 bg-surface-elevated p-6 shadow-theme-sm hover:shadow-theme-md hover:border-accent/30 transition-all duration-300 theme-transition group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors duration-200">
                            {service.name}
                          </h3>
                          <p className="text-[10px] font-bold tracking-widest text-accent uppercase mt-1">General Service</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-extrabold text-accent">
                            Rp {Number(service.base_price || 0).toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-secondary mt-0.5">
                            {service.duration_minutes || 30} minutes
                          </p>
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-secondary leading-relaxed line-clamp-3">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-primary/5 flex items-center justify-between text-xs text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Icon name="Users" size={14} className="text-secondary/70" />
                        <span>Auto-assigned to all dentists</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Specialist Services Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Specialist Services</h2>
              <div className="text-xs text-muted-foreground bg-surface-elevated border border-primary/10 px-3 py-1 rounded-full">
                Customized services assigned to you
              </div>
            </div>
            {services.specialist.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/30 p-8 text-center text-sm text-muted-foreground">
                No specialist services assigned to you yet. Please contact your clinic owner or manager if you need adjustments.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {services.specialist.map((service) => (
                  <article 
                    key={service.id} 
                    className="flex flex-col justify-between rounded-2xl border border-primary/10 bg-surface-elevated p-6 shadow-theme-sm hover:shadow-theme-md hover:border-accent/30 transition-all duration-300 theme-transition group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors duration-200">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold tracking-widest text-purple-600 dark:text-purple-400 uppercase">Specialist Service</span>
                            {service.specialty && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/5 text-secondary border border-primary/10">
                                {service.specialty}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                            Rp {Number(service.custom_price ?? service.base_price ?? 0).toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-secondary mt-0.5">
                            {service.duration_minutes || 30} minutes
                          </p>
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-secondary leading-relaxed line-clamp-3">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-primary/5 flex items-center justify-between text-xs text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Icon name="Briefcase" size={14} className="text-secondary/70" />
                        <span>Customized service assigned to you</span>
                      </div>
                      {service.custom_price && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                          <Icon name="CheckCircle" size={12} />
                          <span>Custom price applied</span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default ClinicServices;
