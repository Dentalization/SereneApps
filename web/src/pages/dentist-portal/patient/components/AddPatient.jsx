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
      {/* Backdrop overlay - fixed to viewport with blur */}
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
        aria-hidden="true" 
        onClick={onClose}
      />
      
      {/* Modal wrapper - centered */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl animate-in zoom-in-95 duration-300">
          
          {/* Modal container */}
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-slate-900/5">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t('dentistPatient.addPatient.title')}</h2>
                  <p className="text-sm text-slate-500">Register new patient & book appointment</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {t('dentistPatient.addPatient.sections.personalInfo')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${
                        errors.name ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                      }`}
                      placeholder={t('dentistPatient.addPatient.placeholders.name')}
                    />
                    {errors.name && <p className="text-red-500 text-xs font-medium pl-1">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.phone')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${
                        errors.phone ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                      }`}
                      placeholder={t('dentistPatient.addPatient.placeholders.phone')}
                    />
                    {errors.phone && <p className="text-red-500 text-xs font-medium pl-1">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${
                        errors.email ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                      }`}
                      placeholder={t('dentistPatient.addPatient.placeholders.email')}
                    />
                    {errors.email && <p className="text-red-500 text-xs font-medium pl-1">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.age')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      min="1"
                      max="120"
                      className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${
                        errors.age ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                      }`}
                      placeholder={t('dentistPatient.addPatient.placeholders.age')}
                    />
                    {errors.age && <p className="text-red-500 text-xs font-medium pl-1">{errors.age}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.gender')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer ${
                          errors.gender ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                        }`}
                      >
                        <option value="">{t('dentistPatient.addPatient.genderOptions.placeholder')}</option>
                        <option value="male">{t('dentistPatient.addPatient.genderOptions.male')}</option>
                        <option value="female">{t('dentistPatient.addPatient.genderOptions.female')}</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    {errors.gender && <p className="text-red-500 text-xs font-medium pl-1">{errors.gender}</p>}
                  </div>
                </div>
              </div>

              {/* Appointment Scheduling */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {t('dentistPatient.addPatient.sections.schedule')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.appointmentDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="appointmentDate"
                      value={formData.appointmentDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${
                        errors.appointmentDate ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                      }`}
                    />
                    {errors.appointmentDate && <p className="text-red-500 text-xs font-medium pl-1">{errors.appointmentDate}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.appointmentTime')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="appointmentTime"
                      value={formData.appointmentTime}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${
                        errors.appointmentTime ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'
                      }`}
                    />
                    {errors.appointmentTime && <p className="text-red-500 text-xs font-medium pl-1">{errors.appointmentTime}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      {t('dentistPatient.addPatient.fields.appointmentType')}
                    </label>
                    <div className="relative">
                      <select
                        name="appointmentType"
                        value={formData.appointmentType}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="consultation">{t('dentistPatient.addPatient.appointmentTypes.consultation')}</option>
                        <option value="checkup">{t('dentistPatient.addPatient.appointmentTypes.checkup')}</option>
                        <option value="cleaning">{t('dentistPatient.addPatient.appointmentTypes.cleaning')}</option>
                        <option value="treatment">{t('dentistPatient.addPatient.appointmentTypes.treatment')}</option>
                        <option value="emergency">{t('dentistPatient.addPatient.appointmentTypes.emergency')}</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    {t('dentistPatient.addPatient.fields.notes')}
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none placeholder:text-slate-400"
                    placeholder={t('dentistPatient.addPatient.placeholders.notes')}
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-end items-center gap-3 shrink-0">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                {t('dentistPatient.addPatient.actions.cancel')}
              </Button>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 px-6"
              >
                {t('dentistPatient.addPatient.actions.submit')}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AddPatient;