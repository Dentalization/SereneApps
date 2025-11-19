import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ModalPortal from '../../../../components/ui/ModalPortal';

const AddPatient = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'consultation',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const { t } = useLanguage();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('dentistPatient.addPatient.validation.nameRequired');
    if (!formData.phone.trim()) newErrors.phone = t('dentistPatient.addPatient.validation.phoneRequired');
    if (!formData.email.trim()) newErrors.email = t('dentistPatient.addPatient.validation.emailRequired');
    if (!formData.age || formData.age < 1) newErrors.age = t('dentistPatient.addPatient.validation.ageRequired');
    if (!formData.gender) newErrors.gender = t('dentistPatient.addPatient.validation.genderRequired');
    if (!formData.appointmentDate) newErrors.appointmentDate = t('dentistPatient.addPatient.validation.dateRequired');
    if (!formData.appointmentTime) newErrors.appointmentTime = t('dentistPatient.addPatient.validation.timeRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <ModalPortal>
      {/* Backdrop overlay - fixed to viewport */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal wrapper - positioned at current scroll location */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto my-8">
          {/* Modal container */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-surface rounded-lg shadow-2xl overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-surface border-b border-primary/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.addPatient.title')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">{t('dentistPatient.addPatient.sections.personalInfo')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.name')}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.name ? 'border-error' : 'border-primary/10'
                  }`}
                  placeholder={t('dentistPatient.addPatient.placeholders.name')}
                />
                {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.phone')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.phone ? 'border-error' : 'border-primary/10'
                  }`}
                  placeholder={t('dentistPatient.addPatient.placeholders.phone')}
                />
                {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.email')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.email ? 'border-error' : 'border-primary/10'
                  }`}
                  placeholder={t('dentistPatient.addPatient.placeholders.email')}
                />
                {errors.email && <p className="text-error text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.age')}
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.age ? 'border-error' : 'border-primary/10'
                  }`}
                  placeholder={t('dentistPatient.addPatient.placeholders.age')}
                />
                {errors.age && <p className="text-error text-sm mt-1">{errors.age}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.gender')}
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.gender ? 'border-error' : 'border-primary/10'
                  }`}
                >
                  <option value="">{t('dentistPatient.addPatient.genderOptions.placeholder')}</option>
                  <option value="male">{t('dentistPatient.addPatient.genderOptions.male')}</option>
                  <option value="female">{t('dentistPatient.addPatient.genderOptions.female')}</option>
                </select>
                {errors.gender && <p className="text-error text-sm mt-1">{errors.gender}</p>}
              </div>
            </div>
          </div>

          {/* Appointment Scheduling */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">{t('dentistPatient.addPatient.sections.schedule')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.appointmentDate')}
                </label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.appointmentDate ? 'border-error' : 'border-primary/10'
                  }`}
                />
                {errors.appointmentDate && <p className="text-error text-sm mt-1">{errors.appointmentDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.appointmentTime')}
                </label>
                <input
                  type="time"
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors ${
                    errors.appointmentTime ? 'border-error' : 'border-primary/10'
                  }`}
                />
                {errors.appointmentTime && <p className="text-error text-sm mt-1">{errors.appointmentTime}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('dentistPatient.addPatient.fields.appointmentType')}
                </label>
                <select
                  name="appointmentType"
                  value={formData.appointmentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors"
                >
                  <option value="consultation">{t('dentistPatient.addPatient.appointmentTypes.consultation')}</option>
                  <option value="checkup">{t('dentistPatient.addPatient.appointmentTypes.checkup')}</option>
                  <option value="cleaning">{t('dentistPatient.addPatient.appointmentTypes.cleaning')}</option>
                  <option value="treatment">{t('dentistPatient.addPatient.appointmentTypes.treatment')}</option>
                  <option value="emergency">{t('dentistPatient.addPatient.appointmentTypes.emergency')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('dentistPatient.addPatient.fields.notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors resize-none"
                placeholder={t('dentistPatient.addPatient.placeholders.notes')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-primary/10">
            <Button variant="outline" onClick={onClose}>
              {t('dentistPatient.addPatient.actions.cancel')}
            </Button>
            <Button type="submit">
              {t('dentistPatient.addPatient.actions.submit')}
            </Button>
          </div>
        </form>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AddPatient;
