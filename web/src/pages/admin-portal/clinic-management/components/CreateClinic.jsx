import React, { useMemo, useState } from 'react';
import AdminSideBar from '../../ui/sidebar-admin';
import AppIcon from '../../../../components/AppIcon';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { authHttp } from '../../../../utils/httpClient';
import ModalPortal from '../../../../components/ui/ModalPortal';

const CreateClinic = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fieldLabels = useMemo(
    () => ({
      legalName: t('admin.clinicManagement.create.form.fields.legalName.label'),
      facilityType: t('admin.clinicManagement.create.form.fields.facilityType.label'),
      streetAddress: t('admin.clinicManagement.create.form.fields.streetAddress.label'),
      city: t('admin.clinicManagement.create.form.fields.city.label'),
      province: t('admin.clinicManagement.create.form.fields.province.label'),
      postalCode: t('admin.clinicManagement.create.form.fields.postalCode.label'),
      phone: t('admin.clinicManagement.create.form.fields.phone.label'),
      email: t('admin.clinicManagement.create.form.fields.email.label'),
      ownerName: t('admin.clinicManagement.create.form.fields.ownerName.label'),
      ownerEmail: t('admin.clinicManagement.create.form.fields.ownerEmail.label'),
      ownerNik: t('admin.clinicManagement.create.form.fields.ownerNik.label'),
      ownerPosition: t('admin.clinicManagement.create.form.fields.ownerPosition.label'),
      ownerWhatsapp: t('admin.clinicManagement.create.form.fields.ownerWhatsapp.label'),
      nibNumber: t('admin.clinicManagement.create.form.fields.nibNumber.label'),
      npwpNumber: t('admin.clinicManagement.create.form.fields.npwpNumber.label')
    }),
    [t]
  );

  const fileLabels = useMemo(
    () => ({
      ktpFile: t('admin.clinicManagement.create.form.files.ktp'),
      ktpSelfie: t('admin.clinicManagement.create.form.files.ktpSelfie'),
      nibFile: t('admin.clinicManagement.create.form.files.nib'),
      npwpFile: t('admin.clinicManagement.create.form.files.npwp'),
      operationalLicense: t('admin.clinicManagement.create.form.files.operationalLicense'),
      additionalLicenses: t('admin.clinicManagement.create.form.files.additionalLicenses')
    }),
    [t]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const form = e.target;

      // Basic client-side validation for required fields
      const requiredFields = [
        'legalName','facilityType','streetAddress','city','province','postalCode','phone','email',
        'ownerName','ownerEmail','ownerNik','ownerPosition','ownerWhatsapp','nibNumber','npwpNumber'
      ];

      const missing = [];
      for (const key of requiredFields) {
        const el = form.elements?.[key];
        const val = el ? el.value : null;
        if (!val || (typeof val === 'string' && !val.trim())) {
          missing.push(fieldLabels[key] || key);
        }
      }
      if (missing.length > 0) {
        setError(t('admin.clinicManagement.create.errors.requiredFields', { fields: missing.join(', ') }));
        setLoading(false);
        return;
      }

      // Ensure required files are present
      const requiredFiles = ['ktpFile','nibFile','npwpFile','operationalLicense'];
      const missingFiles = [];
      for (const f of requiredFiles) {
        const fileInput = form.elements?.[f];
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          missingFiles.push(fileLabels[f] || f);
        }
      }
      if (missingFiles.length > 0) {
        setError(t('admin.clinicManagement.create.errors.requiredFiles', { files: missingFiles.join(', ') }));
        setLoading(false);
        return;
      }

      const formData = new FormData(form);

      // Normalize checkboxes to 'true'/'false' strings expected by server
      if (form.elements?.termsAccepted) formData.set('termsAccepted', form.elements.termsAccepted.checked ? 'true' : 'false');
      if (form.elements?.privacyAccepted) formData.set('privacyAccepted', form.elements.privacyAccepted.checked ? 'true' : 'false');

      // Build operating hours from form inputs
      const weekdayHours = form.elements.weekdayHours?.value || '08:00-17:00';
      const saturdayHours = form.elements.saturdayHours?.value || '08:00-14:00';
      const sundayHours = form.elements.sundayHours?.value || 'closed';
      
      const operatingHours = {
        monday: weekdayHours,
        tuesday: weekdayHours,
        wednesday: weekdayHours,
        thursday: weekdayHours,
        friday: weekdayHours,
        saturday: saturdayHours,
        sunday: sundayHours
      };
      formData.set('operatingHours', JSON.stringify(operatingHours));

      // branches can be sent as JSON string; default to a single main branch if none provided
      if (!formData.get('branches')) {
        const defaultBranch = [{
          branchName: t('admin.clinicManagement.create.defaults.branchName'),
          branchCode: 'MAIN',
          isMainBranch: true,
          streetAddress: form.elements.streetAddress?.value || '',
          city: form.elements.city?.value || '',
          province: form.elements.province?.value || '',
          postalCode: form.elements.postalCode?.value || '',
          phone: form.elements.phone?.value || '',
          treatmentRoomsCount: 1,
          hasSterlization: 'false',
          hasRadiography: 'false',
          operatingHours: JSON.stringify(operatingHours)
        }];
        formData.set('branches', JSON.stringify(defaultBranch));
      }

      // Use authHttp (axios) so token is attached automatically
      const { data } = await authHttp.post('/clinic/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!data) {
        setError(t('admin.clinicManagement.create.errors.createFailed'));
      } else {
        setSuccess(t('admin.clinicManagement.create.success.message'));
        // show temporary password to admin so they can share it with the owner
        if (data.tempPassword) setTempPassword(data.tempPassword);
        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('CreateClinic error', err);
      setError(err.message || t('admin.clinicManagement.create.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-3xl mx-auto bg-surface border border-border/40 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-muted">
                <AppIcon name="ChevronLeft" size={18} />
              </button>
              <h1 className="text-2xl font-semibold text-primary">{t('admin.clinicManagement.create.title')}</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.legalName.label')}</label>
                <input
                  name="legalName"
                  required
                  className="w-full mt-1 p-2 border rounded"
                  placeholder={t('admin.clinicManagement.create.form.fields.legalName.placeholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.brandName.label')}</label>
                <input
                  name="brandName"
                  className="w-full mt-1 p-2 border rounded"
                  placeholder={t('admin.clinicManagement.create.form.fields.brandName.placeholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.facilityType.label')}</label>
                <select name="facilityType" required className="w-full mt-1 p-2 border rounded">
                  <option value="">{t('admin.clinicManagement.create.form.fields.facilityType.placeholder')}</option>
                  <option value="klinik_gigi">{t('admin.clinicManagement.create.form.fields.facilityType.options.klinikGigi')}</option>
                  <option value="rsgm">{t('admin.clinicManagement.create.form.fields.facilityType.options.rsgm')}</option>
                </select>
                <div className="text-xs text-secondary mt-1">
                  {t('admin.clinicManagement.create.form.fields.facilityType.hint')}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.city.label')}</label>
                <input
                  name="city"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.city.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.province.label')}</label>
                <input
                  name="province"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.province.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.postalCode.label')}</label>
                <input
                  name="postalCode"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.postalCode.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.phone.label')}</label>
                <input
                  name="phone"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.phone.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.email.label')}</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.email.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.streetAddress.label')}</label>
                <input
                  name="streetAddress"
                  required
                  className="w-full mt-1 p-2 border rounded"
                  placeholder={t('admin.clinicManagement.create.form.fields.streetAddress.placeholder')}
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ownerName.label')}</label>
                <input
                  name="ownerName"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.ownerName.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ownerEmail.label')}</label>
                <input
                  name="ownerEmail"
                  type="email"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.ownerEmail.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ownerPosition.label')}</label>
                <select name="ownerPosition" defaultValue="owner" className="w-full mt-1 p-2 border rounded">
                  <option value="owner">{t('admin.clinicManagement.create.form.fields.ownerPosition.options.owner')}</option>
                  <option value="manager">{t('admin.clinicManagement.create.form.fields.ownerPosition.options.manager')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ownerWhatsapp.label')}</label>
                <input
                  name="ownerWhatsapp"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.ownerWhatsapp.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ownerNik.label')}</label>
                <input
                  name="ownerNik"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.ownerNik.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.nibNumber.label')}</label>
                <input
                  name="nibNumber"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.nibNumber.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.npwpNumber.label')}</label>
                <input
                  name="npwpNumber"
                  required
                  placeholder={t('admin.clinicManagement.create.form.fields.npwpNumber.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ktpFile.label')}</label>
                <input name="ktpFile" type="file" accept="image/*,application/pdf" required className="w-full mt-1" />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.ktpSelfie.label')}</label>
                <input name="ktpSelfie" type="file" accept="image/*,application/pdf" className="w-full mt-1" />
                <div className="text-xs text-secondary mt-1">
                  {t('admin.clinicManagement.create.form.fields.ktpSelfie.hint')}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.nibFile.label')}</label>
                <input name="nibFile" type="file" accept="image/*,application/pdf" required className="w-full mt-1" />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.npwpFile.label')}</label>
                <input name="npwpFile" type="file" accept="image/*,application/pdf" required className="w-full mt-1" />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.operationalLicense.label')}</label>
                <input name="operationalLicense" type="file" accept="image/*,application/pdf" required className="w-full mt-1" />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.additionalLicenses.label')}</label>
                <input name="additionalLicenses" type="file" accept="image/*,application/pdf" multiple className="w-full mt-1" />
                <div className="text-xs text-secondary mt-1">
                  {t('admin.clinicManagement.create.form.fields.additionalLicenses.hint')}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.fields.dataProtectionContact.label')}</label>
                <input
                  name="dataProtectionContact"
                  type="email"
                  placeholder={t('admin.clinicManagement.create.form.fields.dataProtectionContact.placeholder')}
                  className="w-full mt-1 p-2 border rounded"
                />
                <div className="text-xs text-secondary mt-1">
                  {t('admin.clinicManagement.create.form.fields.dataProtectionContact.hint')}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('admin.clinicManagement.create.form.operatingHours.title')}</label>
                <div className="mt-2 space-y-2 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-medium">{t('admin.clinicManagement.create.form.operatingHours.weekdayLabel')}</label>
                      <input
                        name="weekdayHours"
                        type="text"
                        defaultValue="08:00-17:00"
                        placeholder={t('admin.clinicManagement.create.form.operatingHours.weekdayPlaceholder')}
                        className="w-full mt-1 p-1.5 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium">{t('admin.clinicManagement.create.form.operatingHours.saturdayLabel')}</label>
                      <input
                        name="saturdayHours"
                        type="text"
                        defaultValue="08:00-14:00"
                        placeholder={t('admin.clinicManagement.create.form.operatingHours.saturdayPlaceholder')}
                        className="w-full mt-1 p-1.5 border rounded text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-medium">{t('admin.clinicManagement.create.form.operatingHours.sundayLabel')}</label>
                      <input
                        name="sundayHours"
                        type="text"
                        defaultValue="closed"
                        placeholder={t('admin.clinicManagement.create.form.operatingHours.sundayPlaceholder')}
                        className="w-full mt-1 p-1.5 border rounded text-xs"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-secondary">
                    {t('admin.clinicManagement.create.form.operatingHours.hint')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button disabled={loading} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm">
                <AppIcon name="Plus" size={14} />
                <span>{loading ? t('admin.clinicManagement.create.form.actions.creating') : t('admin.clinicManagement.create.form.actions.submit')}</span>
              </button>
              <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm">
                {t('admin.clinicManagement.create.form.actions.cancel')}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-start gap-3">
                <input name="termsAccepted" type="checkbox" required className="mt-1" />
                <div className="text-sm">
                  {t('admin.clinicManagement.create.form.agreement.prefix')}{' '}
                  <a target="_blank" rel="noreferrer" href="/terms" className="text-accent underline">
                    {t('admin.clinicManagement.create.form.agreement.terms')}
                  </a>{' '}
                  {t('admin.clinicManagement.create.form.agreement.connector')}{' '}
                  <a target="_blank" rel="noreferrer" href="/privacy" className="text-accent underline">
                    {t('admin.clinicManagement.create.form.agreement.privacy')}
                  </a>
                  {t('admin.clinicManagement.create.form.agreement.suffix')}
                </div>
              </label>
            </div>

            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border p-6"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
              <AppIcon name="CheckCircle2" size={24} className="text-emerald-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-primary text-center mb-2">
              {t('admin.clinicManagement.create.success.title')}
            </h2>
            
            <p className="text-sm text-secondary text-center mb-6">
              {t('admin.clinicManagement.create.success.subtitle')}
            </p>

            {tempPassword && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-2 mb-3">
                  <AppIcon name="ShieldAlert" size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {t('admin.clinicManagement.create.success.tempPassword.title')}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      {t('admin.clinicManagement.create.success.tempPassword.subtitle')}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-base font-mono font-semibold text-primary">
                      {tempPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title={t('admin.clinicManagement.create.success.tempPassword.copyTooltip')}
                    >
                      <AppIcon name="Copy" size={16} className="text-secondary" />
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                  {t('admin.clinicManagement.create.success.tempPassword.warning')}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/admin/clinic-management');
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
              >
                <AppIcon name="ArrowLeft" size={16} />
                <span>{t('admin.clinicManagement.create.success.actions.backToDirectory')}</span>
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default CreateClinic;
