import React, { useEffect, useState } from 'react';
import AdminSideBar from '../../ui/sidebar-admin';
import { authHttp } from '../../../../utils/httpClient';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../../components/AppIcon';
import ClinicTable from '../../../../components/clinic/ClinicTable';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ClinicDirectory = () => {
  const { t } = useLanguage();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoading(true);
        const { data } = await authHttp.get('/clinic/admin/list?page=1&limit=100');
        setClinics(data.clinics || []);
      } catch (err) {
        console.error('Failed to fetch clinics', err);
        setError(err?.response?.data?.error || err.message || t('admin.clinicManagement.directory.errors.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []);

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {t('admin.clinicManagement.directory.title')}
            </h2>
            <div>
              <button onClick={() => navigate('/admin/clinic-management/create')} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white">
                <AppIcon name="Plus" size={14} /> {t('admin.clinicManagement.directory.actions.addClinic')}
              </button>
            </div>
          </div>

          {loading && <div>{t('admin.clinicManagement.directory.loading')}</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && !error && (
            <ClinicTable clinics={clinics} onView={(id) => navigate(`/admin/clinic-management/${id}`)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicDirectory;
