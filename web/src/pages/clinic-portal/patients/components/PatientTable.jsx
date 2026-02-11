import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const StatusBadge = ({ status }) => {
  const { t } = useLanguage();

  const getStatusStyles = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700/50';
      case 'vip':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700/50';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Tidak Aktif';
      case 'vip': return 'VIP';
      default: return status;
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};

const ActionDropdown = ({ patient, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const actions = [
    { key: 'view', label: 'Lihat Detail', icon: 'Eye' },
    { key: 'edit', label: 'Edit Pasien', icon: 'Edit' },
    { key: 'schedule', label: 'Jadwalkan', icon: 'CalendarPlus' },
    { key: 'history', label: 'Riwayat', icon: 'Clock' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-2 hover:bg-surface rounded-lg transition-colors duration-200"
      >
        <Icon name="MoreVertical" size={16} className="text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated rounded-lg shadow-lg border border-primary/15 z-20 py-1">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action.key, patient);
                setIsOpen(false);
              }}
              className="w-full flex items-center px-4 py-2.5 text-left text-sm text-secondary hover:text-primary hover:bg-surface transition-colors duration-200"
            >
              <Icon name={action.icon} size={15} className="mr-3" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PatientTable = ({ patients, onPatientAction, loading, locale = 'id-ID' }) => {

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-primary/15">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="mt-4 text-secondary">Memuat data pasien...</p>
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-primary/15">
        <div className="p-8 text-center">
          <Icon name="Users" size={48} className="text-secondary/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Belum Ada Pasien</h3>
          <p className="text-secondary">Belum ada pasien yang terdaftar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-primary/15 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface border-b border-primary/15">
            <tr>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Pasien</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Usia</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Gender</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Telepon</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Kunjungan Terakhir</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Total Kunjungan</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              <th className="text-right py-3 px-5 text-xs font-medium text-secondary uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {patients.map((patient) => (
              <tr
                key={patient.id}
                className="hover:bg-surface/50 transition-colors duration-200 cursor-pointer"
                onClick={() => onPatientAction('view', patient)}
              >
                <td className="py-3.5 px-5">
                  <div className="flex items-center">
                    {patient.avatar ? (
                      <img src={patient.avatar} alt={patient.name} className="w-9 h-9 rounded-full object-cover mr-3 ring-2 ring-accent/20" />
                    ) : (
                      <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-accent">
                          {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-primary">{patient.name}</div>
                      <div className="text-xs text-secondary">{patient.email || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-sm text-secondary">{patient.age || '-'}</td>
                <td className="py-3.5 px-5">
                  <span className="text-sm text-secondary">
                    {patient.gender === 'M' ? 'Laki-laki' : patient.gender === 'F' ? 'Perempuan' : '-'}
                  </span>
                </td>
                <td className="py-3.5 px-5 text-sm text-secondary">{patient.phone || '-'}</td>
                <td className="py-3.5 px-5 text-sm text-secondary">
                  {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString(locale) : '-'}
                </td>
                <td className="py-3.5 px-5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {patient.totalVisits || 0} kunjungan
                  </span>
                </td>
                <td className="py-3.5 px-5">
                  <StatusBadge status={patient.status} />
                </td>
                <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionDropdown patient={patient} onAction={onPatientAction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientTable;
