import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';

// Import components
import PatientStats from './components/PatientStats';
import PatientFilters from './components/PatientFilters';
import PatientTable from './components/PatientTable';
import PatientDetailModal from './components/PatientDetailModal';
import PatientAnalytics from './components/PatientAnalytics';
import PatientReports from './components/PatientReports';

const PatientsPage = () => {
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('registry');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Enhanced mock data - realistic clinic patient database
  const generateMockPatients = () => {
    const names = [
      'Ahmad Sutrisno', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Sartika', 'Rudi Hartono',
      'Maya Sari', 'Andi Wijaya', 'Rina Susanti', 'Deni Permata', 'Lina Wati',
      'Hendra Kusuma', 'Sri Rahayu', 'Agus Setiawan', 'Novi Handayani', 'Bambang Surya',
      'Indira Lestari', 'Fajar Nugroho', 'Ratna Dewi', 'Yusuf Rahman', 'Diah Ayu',
      'Wawan Setiadi', 'Mega Putri', 'Rizki Pratama', 'Sari Indah', 'Tono Wijaya',
      'Eka Sari', 'Dimas Pratomo', 'Yuni Astuti', 'Hadi Santoso', 'Lia Maharani',
      'Bobby Kurniawan', 'Citra Dewi', 'Eko Saputra', 'Fani Sari', 'Gilang Ramadhan',
      'Hani Pratiwi', 'Irfan Maulana', 'Joko Susilo', 'Kiki Amelia', 'Lukman Hakim',
      'Mira Salsabila', 'Nanda Putra', 'Oki Setiawan', 'Putri Rahayu', 'Qori Hidayat',
      'Reza Fadillah', 'Sinta Dewi', 'Tari Wulandari', 'Uda Permana', 'Vina Agustin',
      'Wahyu Pranoto', 'Xenia Kartika', 'Yanto Suharto', 'Zaki Firmansyah', 'Alma Safira'
    ];
    
    const treatments = [
      'Scaling & Root Planing', 'Composite Filling', 'Crown Placement', 'Orthodontic Consultation',
      'Implant Surgery', 'Teeth Whitening', 'Dental Cleaning', 'Root Canal Treatment',
      'Tooth Extraction', 'Periodontal Treatment', 'Denture Fitting', 'Oral Surgery',
      'Preventive Care', 'Cosmetic Dentistry', 'Emergency Treatment'
    ];
    
    const allergies = ['Penicillin', 'Latex', 'Aspirin', 'Lidocaine', 'Ibuprofen', 'None'];
    const conditions = ['Diabetes Type 2', 'Gingivitis', 'Periodontitis', 'Hypertension', 'Heart Disease', 'None'];
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const statuses = ['active', 'vip', 'inactive'];
    
    const mockPatients = Array.from({ length: 247 }, (_, index) => {
      const isVip = Math.random() < 0.15; // 15% VIP
      const isInactive = Math.random() < 0.1; // 10% inactive
      const status = isInactive ? 'inactive' : (isVip ? 'vip' : 'active');
      
      const createdDate = new Date(2020 + Math.floor(Math.random() * 5), 
                                  Math.floor(Math.random() * 12), 
                                  Math.floor(Math.random() * 28) + 1);
      
      const lastVisitDate = new Date(2023 + Math.floor(Math.random() * 2), 
                                    Math.floor(Math.random() * 12), 
                                    Math.floor(Math.random() * 28) + 1);
      
      return {
        id: index + 1,
        name: names[index % names.length] + (index >= names.length ? ` ${Math.floor(index/names.length) + 1}` : ''),
        age: 18 + Math.floor(Math.random() * 60),
        gender: Math.random() > 0.5 ? 'M' : 'F',
        phone: `0812${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        email: `patient${index + 1}@email.com`,
        address: `Jl. ${['Sudirman', 'Thamrin', 'Gatot Subroto', 'Kuningan', 'Menteng'][Math.floor(Math.random() * 5)]} No. ${Math.floor(Math.random() * 999) + 1}, Jakarta`,
        lastVisit: lastVisitDate.toISOString().split('T')[0],
        totalVisits: Math.floor(Math.random() * 20) + 1,
        status: status,
        createdAt: createdDate.toISOString().split('T')[0],
        medicalRecord: {
          allergies: Math.random() > 0.7 ? [allergies[Math.floor(Math.random() * (allergies.length - 1))]] : [],
          conditions: Math.random() > 0.6 ? [conditions[Math.floor(Math.random() * (conditions.length - 1))]] : [],
          bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
          lastTreatment: treatments[Math.floor(Math.random() * treatments.length)]
        },
        recentAppointments: [
          { 
            date: lastVisitDate.toISOString().split('T')[0], 
            treatment: treatments[Math.floor(Math.random() * treatments.length)], 
            doctor: ['Dr. Sarah', 'Dr. Ahmad', 'Dr. Lisa', 'Dr. Budi'][Math.floor(Math.random() * 4)] 
          }
        ]
      };
    });
    
    return mockPatients;
  };

  useEffect(() => {
    const fetchPatientsData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPatients(generateMockPatients());
      setLoading(false);
    };

    fetchPatientsData();
  }, []);

  // Filter patients based on search query and active filter
  const filteredPatients = useMemo(() => {
    let filtered = patients;

    // Apply status filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'newPatients') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filtered = filtered.filter(patient => new Date(patient.createdAt) > oneMonthAgo);
      } else {
        filtered = filtered.filter(patient => patient.status === activeFilter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone.includes(searchQuery) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [patients, activeFilter, searchQuery]);

  const locale = language === 'id' ? 'id-ID' : 'en-US';

  const tabs = [
    { id: 'registry', label: t('patients.tabs.registry'), icon: 'Users' },
    { id: 'appointments', label: t('patients.tabs.appointments'), icon: 'Calendar' },
    { id: 'analytics', label: t('patients.tabs.analytics'), icon: 'BarChart2' },
    { id: 'reports', label: t('patients.tabs.reports'), icon: 'FileText' }
  ];

  // Debug logging
  console.log('PatientsPage loaded', { patients: patients.length, activeTab, loading });

  if (loading) {
    const statSkeletons = Array.from({ length: 4 });
    const tableRows = Array.from({ length: 6 });
    const recentSkeletons = Array.from({ length: 3 });

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-64 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-surface px-4 py-3 min-w-[160px] space-y-2">
                  <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-20 rounded bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-3">
                {tabs.map((tab) => (
                  <div key={tab.id} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {statSkeletons.map((_, idx) => (
                <div key={idx} className="rounded-xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-3">
                  <div className="h-3 w-24 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-16 rounded bg-accent/20 animate-pulse"></div>
                </div>
              ))}
            </section>

            <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                <div className="h-10 w-full sm:w-80 rounded-lg bg-accent/10 animate-pulse"></div>
                <div className="h-10 w-40 rounded-lg bg-accent/10 animate-pulse"></div>
              </div>
              <div className="h-10 w-36 rounded-lg bg-accent/20 animate-pulse"></div>
            </section>

            <section className="space-y-6">
              <div className="rounded-xl border border-primary/15 bg-surface-elevated skeleton-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-primary/15">
                  <div className="h-5 w-40 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="p-6 space-y-4">
                  {tableRows.map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-primary/10 bg-surface rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-accent/10"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-40 rounded bg-accent/10"></div>
                          <div className="h-3 w-28 rounded bg-accent/10"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-20 rounded bg-accent/10"></div>
                        <div className="h-3 w-24 rounded bg-accent/10"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
                <div className="h-5 w-40 rounded bg-accent/10 animate-pulse"></div>
                <div className="space-y-3">
                  {recentSkeletons.map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-primary/10 bg-surface rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10"></div>
                        <div className="space-y-2">
                          <div className="h-3 w-32 rounded bg-accent/10"></div>
                          <div className="h-3 w-24 rounded bg-accent/10"></div>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-3 w-16 rounded bg-accent/10"></div>
                        <div className="h-3 w-20 rounded bg-accent/10"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const handlePatientAction = (action, patient) => {
    switch (action) {
      case 'view':
        setSelectedPatient(patient);
        setShowDetailModal(true);
        break;
      case 'edit':
        alert(`Edit Patient: ${patient.name}\n\nThis will open the patient edit form with:\n- Personal information\n- Medical history\n- Contact details\n- Insurance information`);
        break;
      case 'schedule':
        alert(`Schedule Appointment for: ${patient.name}\n\nThis will open appointment booking with:\n- Available time slots\n- Doctor selection\n- Treatment type\n- Duration and notes`);
        break;
      case 'history':
        alert(`Medical History for: ${patient.name}\n\nShowing:\n- Previous visits: ${patient.totalVisits}\n- Last treatment: ${patient.medicalRecord.lastTreatment}\n- Allergies: ${patient.medicalRecord.allergies.join(', ') || 'None'}\n- Conditions: ${patient.medicalRecord.conditions.join(', ') || 'None'}`);
        break;
      default:
        break;
    }
  };

  const handleAddPatient = () => {
    alert('Add New Patient\n\nThis will open a form to register:\n- Personal information (name, age, gender)\n- Contact details (phone, email, address)\n- Medical history\n- Insurance information\n- Emergency contact');
  };

  const handleExport = () => {
    const exportData = filteredPatients.map(patient => ({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      status: patient.status,
      lastVisit: patient.lastVisit,
      totalVisits: patient.totalVisits
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert(`Exported ${filteredPatients.length} patients to JSON file!`);
  };

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'registry':
          return (
            <div className="space-y-6">
              {/* Simple stats test */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">{t('patients.registry.stats.totalPatients')}</p>
                      <p className="text-2xl font-bold text-primary">{patients.length}</p>
                    </div>
                    <Icon name="Users" className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">{t('patients.registry.stats.activePatients')}</p>
                      <p className="text-2xl font-bold text-primary">{patients.filter(p => p.status === 'active').length}</p>
                    </div>
                    <Icon name="UserCheck" className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">{t('patients.registry.stats.vipPatients')}</p>
                      <p className="text-2xl font-bold text-primary">{patients.filter(p => p.status === 'vip').length}</p>
                    </div>
                    <Icon name="Crown" className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">{t('patients.registry.stats.newThisMonth')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {patients.filter(p => {
                          const created = new Date(p.createdAt);
                          const now = new Date();
                          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                        }).length}
                      </p>
                    </div>
                    <Icon name="Calendar" className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Simple filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
                    <input
                      type="text"
                      placeholder={t('patients.registry.search.placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <select 
                    value={activeFilter} 
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="px-3 py-2 pr-8 border border-primary/20 rounded-lg bg-surface text-primary min-w-[120px]"
                  >
                    <option value="all">{t('patients.registry.filters.allStatus')}</option>
                    <option value="active">{t('patients.registry.filters.active')}</option>
                    <option value="vip">{t('patients.registry.filters.vip')}</option>
                    <option value="inactive">{t('patients.registry.filters.inactive')}</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleExport}
                    className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface transition-colors"
                  >
                    <Icon name="Download" className="w-4 h-4 mr-2" />
                    {t('patients.registry.actions.export')}
                  </button>
                </div>
              </div>

              {/* Simple table */}
              <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-primary/20">
                  <h3 className="text-lg font-semibold text-primary">{t('patients.registry.title')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('patients.registry.table.patient')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('patients.registry.table.contact')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('patients.registry.table.lastVisit')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('patients.registry.table.status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('patients.registry.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/20">
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-surface transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                                <Icon name="User" className="w-5 h-5 text-accent" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-primary">{patient.name}</div>
                                <div className="text-sm text-secondary">
                                  {t('patients.common.labels.years', { count: patient.age })} • {' '}
                                  {patient.gender === 'M' ? t('patients.common.gender.male') : t('patients.common.gender.female')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-primary">{patient.phone}</div>
                            <div className="text-sm text-secondary">{patient.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            {new Date(patient.lastVisit).toLocaleDateString(locale)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full uppercase ${
                              patient.status === 'active' ? 'bg-green-100 text-green-800' :
                              patient.status === 'vip' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {t(`patients.registry.status.${patient.status}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            <button 
                              onClick={() => handlePatientAction('view', patient)}
                              className="text-accent hover:text-accent-hover mr-3"
                            >
                              {t('patients.registry.actions.view')}
                            </button>
                            <button 
                              onClick={() => handlePatientAction('edit', patient)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              {t('patients.registry.actions.edit')}
                            </button>
                            <button 
                              onClick={() => handlePatientAction('schedule', patient)}
                              className="text-green-600 hover:text-green-800"
                            >
                              {t('patients.registry.actions.schedule')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        
        case 'appointments':
          return (
            <div className="space-y-6">
              {/* Appointment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">Today's Appointments</p>
                      <p className="text-2xl font-bold text-primary">8</p>
                    </div>
                    <Icon name="Calendar" className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">This Week</p>
                      <p className="text-2xl font-bold text-primary">24</p>
                    </div>
                    <Icon name="CalendarDays" className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary">Pending</p>
                      <p className="text-2xl font-bold text-primary">3</p>
                    </div>
                    <Icon name="Clock" className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
                <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button 
                    onClick={() => alert('Schedule new appointment functionality')}
                    className="p-4 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-left"
                  >
                    <Icon name="Plus" className="w-6 h-6 mb-2" />
                    <div className="font-medium">New Appointment</div>
                    <div className="text-sm opacity-90">Schedule for patient</div>
                  </button>
                  <button 
                    onClick={() => alert('View today\'s schedule')}
                    className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-left"
                  >
                    <Icon name="Calendar" className="w-6 h-6 mb-2" />
                    <div className="font-medium">Today's Schedule</div>
                    <div className="text-sm opacity-90">View daily agenda</div>
                  </button>
                  <button 
                    onClick={() => alert('Emergency booking functionality')}
                    className="p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-left"
                  >
                    <Icon name="AlertCircle" className="w-6 h-6 mb-2" />
                    <div className="font-medium">Emergency Slot</div>
                    <div className="text-sm opacity-90">Urgent appointment</div>
                  </button>
                  <button 
                    onClick={() => alert('Appointment reports functionality')}
                    className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-left"
                  >
                    <Icon name="BarChart" className="w-6 h-6 mb-2" />
                    <div className="font-medium">Reports</div>
                    <div className="text-sm opacity-90">View statistics</div>
                  </button>
                </div>
              </div>
              
              {/* Recent Appointments */}
              <div className="bg-surface-elevated rounded-xl border border-primary/20">
                <div className="px-6 py-4 border-b border-primary/20">
                  <h3 className="text-lg font-semibold text-primary">Recent Appointments</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {patients.slice(0, 3).map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                            <Icon name="User" className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <div className="font-medium text-primary">{patient.name}</div>
                            <div className="text-sm text-secondary">{patient.medicalRecord.lastTreatment}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-primary">{new Date(patient.lastVisit).toLocaleDateString()}</div>
                          <div className="text-sm text-secondary">Completed</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        
        case 'analytics':
          return <PatientAnalytics patients={patients} />;
        
        case 'reports':
          return <PatientReports patients={patients} />;
        
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="bg-surface-elevated rounded-xl p-8 border border-primary/20 text-center">
          <Icon name="AlertCircle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary mb-2">Error Loading Content</h3>
          <p className="text-secondary">Please refresh the page or try again later.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-primary">
                  {t('patients.title') || 'Patients & Medical Records'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  Manage your clinic's patient records and information
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-surface px-4 py-3 text-right min-w-[160px]">
                <div className="text-xs uppercase tracking-wide text-secondary">Total Patients</div>
                <div className="text-2xl font-bold text-primary">
                  {patients.length.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <nav className="flex flex-wrap gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    <Icon name={tab.icon} className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </section>

          {renderTabContent() || (
            <div className="bg-surface-elevated rounded-xl p-8 border border-primary/20 text-center">
              <Icon name="Users" className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">Loading Patients...</h3>
              <p className="text-secondary">Please wait while we load your patient data.</p>
            </div>
          )}
        </div>
      </div>

      {/* Patient Detail Modal */}
      <PatientDetailModal
        patient={selectedPatient}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPatient(null);
        }}
      />
    </div>
  );
};

export default PatientsPage;
