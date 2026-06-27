import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

const getInsuranceIcon = (insurance) => {
  if (!insurance) return 'Shield';
  const lower = insurance.toLowerCase();
  if (lower.includes('bpjs')) return 'Shield';
  if (lower.includes('axa')) return 'ShieldCheck';
  if (lower.includes('prudential')) return 'ShieldAlert';
  return 'Shield';
};

const getStatusMeta = (status, t) => {
  const statusMap = {
    approved: {
      label: t('clinic.billing.claims.status.approved') || 'Disetujui',
      icon: 'CheckCircle',
      color: 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300 border border-green-200/50 dark:border-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    partial: {
      label: t('clinic.billing.claims.status.partial') || 'Sebagian',
      icon: 'AlertTriangle',
      color: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    pending: {
      label: t('clinic.billing.claims.status.pending') || 'Menunggu',
      icon: 'Clock',
      color: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    processing: {
      label: t('clinic.billing.claims.status.processing') || 'Diproses',
      icon: 'RefreshCw',
      color: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      spin: true
    },
    rejected: {
      label: t('clinic.billing.claims.status.rejected') || 'Ditolak',
      icon: 'XCircle',
      color: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200/50 dark:border-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400'
    }
  };
  return statusMap[status] || {
    label: '—',
    icon: 'HelpCircle',
    color: 'bg-gray-50 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border border-gray-200 dark:border-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400'
  };
};

const ClaimsView = ({ claims = [], loading = false, onAddClaim }) => {
  const { t } = useLanguage();

  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Calculate statistics
  const totalClaimed = claims.reduce((sum, claim) => sum + claim.claimAmount, 0);
  const totalApproved = claims.reduce((sum, claim) => sum + claim.approvedAmount, 0);
  const approvedClaims = claims.filter(c => c.status === 'approved').length;
  const pendingClaims = claims.filter(c => c.status === 'pending' || c.status === 'processing').length;

  // Filter logic
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      (claim.patient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.claimNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.policyNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.treatment || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesInsurance =
      !insuranceFilter ||
      (claim.insurance || '').toLowerCase().includes(insuranceFilter.toLowerCase());

    const matchesStatus =
      !statusFilter ||
      claim.status === statusFilter;

    return matchesSearch && matchesInsurance && matchesStatus;
  });

  const handleAddNewClaim = (newClaim) => {
    if (onAddClaim) {
      onAddClaim(newClaim);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Claimed */}
        <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 rounded-xl min-w-0 shadow-sm flex items-center space-x-3">
          <AppIcon name="FileText" size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 truncate">
              {t('clinic.billing.claims.stats.totalClaimed') || 'Total Klaim'}
            </p>
            <p className="text-lg font-extrabold text-blue-950 dark:text-blue-100 truncate">
              {formatCurrency(totalClaimed)}
            </p>
          </div>
        </div>

        {/* Total Approved */}
        <div className="p-4 bg-green-50/80 dark:bg-green-950/40 border border-green-100 dark:border-green-900/30 rounded-xl min-w-0 shadow-sm flex items-center space-x-3">
          <AppIcon name="CheckCircle" size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-green-800 dark:text-green-300 truncate">
              {t('clinic.billing.claims.stats.totalApproved') || 'Total Disetujui'}
            </p>
            <p className="text-lg font-extrabold text-green-950 dark:text-green-100 truncate">
              {formatCurrency(totalApproved)}
            </p>
          </div>
        </div>

        {/* Approved Claims Count */}
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/30 rounded-xl min-w-0 shadow-sm flex items-center space-x-3">
          <AppIcon name="Award" size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-purple-800 dark:text-purple-300 truncate">
              {t('clinic.billing.claims.stats.approved') || 'Disetujui'}
            </p>
            <p className="text-lg font-extrabold text-purple-950 dark:text-purple-100 truncate">
              {approvedClaims}
            </p>
          </div>
        </div>

        {/* Pending Claims Count */}
        <div className="p-4 bg-yellow-50/80 dark:bg-yellow-950/40 border border-yellow-100 dark:border-yellow-900/30 rounded-xl min-w-0 shadow-sm flex items-center space-x-3">
          <AppIcon name="Clock" size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 truncate">
              {t('clinic.billing.claims.stats.pending') || 'Menunggu'}
            </p>
            <p className="text-lg font-extrabold text-yellow-950 dark:text-yellow-100 truncate">
              {pendingClaims}
            </p>
          </div>
        </div>
      </div>

      {/* Actions and Filter Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('clinic.billing.claims.searchPlaceholder') || 'Cari klaim...'}
              className="pl-10 pr-4 py-2 w-72 md:w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
            />
          </div>
          <select
            value={insuranceFilter}
            onChange={(e) => setInsuranceFilter(e.target.value)}
            className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            <option value="">{t('clinic.billing.claims.allInsurance') || 'Semua Asuransi'}</option>
            <option value="bpjs">BPJS Kesehatan</option>
            <option value="axa">AXA Mandiri</option>
            <option value="prudential">Prudential</option>
            <option value="allianz">Allianz</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            <option value="">{t('clinic.billing.claims.allStatus') || 'Semua Status'}</option>
            <option value="approved">{t('clinic.billing.claims.status.approved') || 'Disetujui'}</option>
            <option value="partial">{t('clinic.billing.claims.status.partial') || 'Sebagian'}</option>
            <option value="pending">{t('clinic.billing.claims.status.pending') || 'Menunggu'}</option>
            <option value="processing">{t('clinic.billing.claims.status.processing') || 'Diproses'}</option>
            <option value="rejected">{t('clinic.billing.claims.status.rejected') || 'Ditolak'}</option>
          </select>
        </div>
        <button
          onClick={() => setShowClaimModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 text-sm font-semibold justify-center cursor-pointer shadow-sm shadow-accent/20"
        >
          <AppIcon name="Plus" size={16} />
          {t('clinic.billing.claims.submitClaim') || 'Ajukan Klaim'}
        </button>
      </div>

      {/* Claims List container */}
      {loading ? (
        /* Loading State */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-elevated rounded-xl border border-primary/20">
          <AppIcon name="Loader2" className="animate-spin text-accent mb-4" size={32} />
          <p className="text-sm text-secondary font-medium">Memuat data klaim dari database...</p>
        </div>
      ) : claims.length === 0 ? (
        /* Level 1 Empty State (System completely empty) */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-elevated rounded-xl border border-primary/20">
          <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-4">
            <AppIcon name="FileText" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-1">Belum Ada Klaim</h3>
          <p className="text-sm text-secondary max-w-sm mb-6">
            Sistem belum mencatat adanya klaim asuransi. Ajukan klaim baru untuk memulainya.
          </p>
          <button
            onClick={() => setShowClaimModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 text-sm font-semibold cursor-pointer"
          >
            <AppIcon name="Plus" size={16} />
            Ajukan Klaim Pertama
          </button>
        </div>
      ) : (
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.billing.claims.title') || 'Daftar Klaim Asuransi'}
            </h3>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-surface border border-primary/10 text-secondary">
              {filteredClaims.length} dari {claims.length} Klaim
            </span>
          </div>

          {filteredClaims.length === 0 ? (
            /* Level 2 Empty State (Filters returned no results) */
            <div className="p-12 text-center space-y-3 bg-surface-elevated">
              <AppIcon name="Search" className="mx-auto text-secondary/40 animate-pulse" size={44} />
              <p className="font-medium text-primary text-base">Tidak ada klaim yang cocok</p>
              <p className="text-xs text-secondary max-w-md mx-auto">
                Tidak ada klaim yang sesuai dengan kriteria pencarian atau filter yang Anda pilih. Coba sesuaikan filter Anda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setInsuranceFilter('');
                  setStatusFilter('');
                }}
                className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary/20 text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.claimNumber') || 'No. Klaim'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.patient') || 'Pasien'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.insurance') || 'Asuransi'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.treatment') || 'Tindakan'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.claimAmount') || 'Nilai Klaim'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.approvedAmount') || 'Disetujui'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.status') || 'Status'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.billing.claims.table.actions') || 'Aksi'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filteredClaims.map((claim) => {
                    const statusMeta = getStatusMeta(claim.status, t);
                    return (
                      <tr key={claim.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-primary">{claim.claimNumber}</div>
                            <div className="text-xs text-secondary">
                              {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString('id-ID') : '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-primary">{claim.patient}</div>
                            <div className="text-xs text-secondary">{claim.policyNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <AppIcon name={getInsuranceIcon(claim.insurance)} size={14} className="text-secondary" />
                            <span className="text-sm font-medium text-primary">{claim.insurance}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-primary">{claim.treatment}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-primary">
                            {formatCurrency(claim.claimAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {claim.approvedAmount > 0 ? (
                            <div className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(claim.approvedAmount)}
                            </div>
                          ) : (
                            <div className="text-sm text-secondary font-medium">-</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${statusMeta.color}`}>
                            <AppIcon name={statusMeta.icon} size={12} className={`${statusMeta.spin ? 'animate-spin' : ''} ${statusMeta.iconColor}`} />
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            <button
                              aria-label="Lihat Detail Klaim"
                              className="w-11 h-11 flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer transition-colors"
                            >
                              <AppIcon name="Eye" size={18} />
                            </button>
                            <button
                              aria-label="Unduh Dokumen Klaim"
                              className="w-11 h-11 flex items-center justify-center text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/40 rounded-lg cursor-pointer transition-colors"
                            >
                              <AppIcon name="Download" size={18} />
                            </button>
                            {(claim.status === 'pending' || claim.status === 'processing') && (
                              <button
                                aria-label="Kirim Ulang Klaim"
                                className="w-11 h-11 flex items-center justify-center text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40 rounded-lg cursor-pointer transition-colors"
                              >
                                <AppIcon name="Send" size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submit Claim Modal */}
      <NewClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onSubmit={handleAddNewClaim}
        t={t}
      />
    </div>
  );
};

// Form Field Wrapper
const Field = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</span>
    {children}
  </label>
);

// Submit Claim Modal Component
const NewClaimModal = ({ isOpen, onClose, onSubmit, t }) => {
  const [patientName, setPatientName] = useState('');
  const [insurance, setInsurance] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [treatment, setTreatment] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const isFormValid =
    patientName.trim() !== '' &&
    insurance.trim() !== '' &&
    policyNumber.trim() !== '' &&
    treatment.trim() !== '' &&
    Number(amount) > 0;

  const handleSubmit = () => {
    if (!isFormValid) return;
    onSubmit({
      patient: patientName,
      insurance,
      policyNumber,
      treatment,
      claimAmount: Number(amount),
      notes
    });
    // Reset form fields
    setPatientName('');
    setInsurance('');
    setPolicyNumber('');
    setTreatment('');
    setAmount('');
    setNotes('');
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg rounded-xl border border-primary/15 bg-surface-elevated p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <div>
              <h3 className="text-lg font-bold text-primary">Ajukan Klaim Baru</h3>
              <p className="text-xs text-secondary">Isi detail di bawah untuk mengirimkan klaim asuransi baru.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-secondary hover:bg-surface transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <AppIcon name="X" size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <Field label="Nama Pasien">
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Masukkan nama lengkap pasien"
                className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Penyedia Asuransi">
                <select
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent cursor-pointer"
                >
                  <option value="">Pilih Asuransi</option>
                  <option value="BPJS Kesehatan">BPJS Kesehatan</option>
                  <option value="AXA Mandiri">AXA Mandiri</option>
                  <option value="Prudential">Prudential</option>
                  <option value="Allianz">Allianz</option>
                </select>
              </Field>

              <Field label="Nomor Polis">
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="e.g. BPJS-12345"
                  className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tindakan / Perawatan">
                <input
                  type="text"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  placeholder="e.g. Tambal Gigi"
                  className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </Field>

              <Field label="Nilai Klaim (Rp)">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </Field>
            </div>

            <Field label="Catatan Tambahan (Opsional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan seperti detail kondisi..."
                rows={3}
                className="w-full rounded-lg border border-primary/20 bg-surface p-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
              />
            </Field>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-primary/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-primary/15 rounded-lg text-sm font-medium text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <AppIcon name="Send" size={16} />
              Kirim Klaim
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ClaimsView;
