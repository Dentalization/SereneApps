import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const ClaimsView = () => {
  const { t } = useLanguage();
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Mock data
  const claims = [
    {
      id: 'CLM-2024-001',
      claimNumber: 'BPJS-001-2024',
      patient: 'Budi Santoso',
      insurance: 'BPJS Kesehatan',
      policyNumber: 'BPJS-123456789',
      treatment: 'Scaling & Polishing',
      claimAmount: 500000,
      approvedAmount: 500000,
      status: 'approved',
      submittedAt: '2024-01-10',
      processedAt: '2024-01-15',
      notes: 'Klaim disetujui penuh'
    },
    {
      id: 'CLM-2024-002',
      claimNumber: 'AXA-002-2024',
      patient: 'Siti Aminah',
      insurance: 'AXA Mandiri',
      policyNumber: 'AXA-987654321',
      treatment: 'Root Canal Treatment',
      claimAmount: 2500000,
      approvedAmount: 2000000,
      status: 'partial',
      submittedAt: '2024-01-12',
      processedAt: '2024-01-16',
      notes: 'Klaim disetujui sebagian, excess limit'
    },
    {
      id: 'CLM-2024-003',
      claimNumber: 'BPJS-003-2024',
      patient: 'Ahmad Yani',
      insurance: 'BPJS Kesehatan',
      policyNumber: 'BPJS-456789123',
      treatment: 'Tooth Extraction',
      claimAmount: 300000,
      approvedAmount: 0,
      status: 'pending',
      submittedAt: '2024-01-14',
      notes: 'Menunggu verifikasi dokumen'
    },
    {
      id: 'CLM-2024-004',
      claimNumber: 'PRU-004-2024',
      patient: 'Diana Putri',
      insurance: 'Prudential',
      policyNumber: 'PRU-789123456',
      treatment: 'Dental Implant',
      claimAmount: 15000000,
      approvedAmount: 0,
      status: 'rejected',
      submittedAt: '2024-01-08',
      processedAt: '2024-01-13',
      notes: 'Tindakan tidak tercover di polis'
    },
    {
      id: 'CLM-2024-005',
      claimNumber: 'BPJS-005-2024',
      patient: 'Rahmat Hidayat',
      insurance: 'BPJS Kesehatan',
      policyNumber: 'BPJS-321654987',
      treatment: 'Composite Filling',
      claimAmount: 750000,
      approvedAmount: 0,
      status: 'processing',
      submittedAt: '2024-01-15',
      notes: 'Sedang dalam proses verifikasi'
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'partial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'processing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getInsuranceIcon = (insurance) => {
    if (insurance.toLowerCase().includes('bpjs')) return 'Shield';
    if (insurance.toLowerCase().includes('axa')) return 'ShieldCheck';
    if (insurance.toLowerCase().includes('prudential')) return 'ShieldAlert';
    return 'Shield';
  };

  const getStatusText = (status) => {
    const statusMap = {
      approved: t('clinic.billing.claims.status.approved') || 'Disetujui',
      partial: t('clinic.billing.claims.status.partial') || 'Sebagian',
      pending: t('clinic.billing.claims.status.pending') || 'Menunggu',
      processing: t('clinic.billing.claims.status.processing') || 'Diproses',
      rejected: t('clinic.billing.claims.status.rejected') || 'Ditolak'
    };
    return statusMap[status] || status;
  };

  // Calculate statistics
  const totalClaimed = claims.reduce((sum, claim) => sum + claim.claimAmount, 0);
  const totalApproved = claims.reduce((sum, claim) => sum + claim.approvedAmount, 0);
  const approvedClaims = claims.filter(c => c.status === 'approved').length;
  const pendingClaims = claims.filter(c => c.status === 'pending' || c.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="FileText" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.billing.claims.stats.totalClaimed') || 'Total Klaim'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
                {formatCurrency(totalClaimed)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="CheckCircle" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.billing.claims.stats.totalApproved') || 'Total Disetujui'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">
                {formatCurrency(totalApproved)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Award" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.billing.claims.stats.approved') || 'Disetujui'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">{approvedClaims}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Clock" size={20} className="text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {t('clinic.billing.claims.stats.pending') || 'Menunggu'}
              </p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">{pendingClaims}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={t('clinic.billing.claims.searchPlaceholder') || 'Cari klaim...'}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.billing.claims.allInsurance') || 'Semua Asuransi'}</option>
            <option value="bpjs">BPJS Kesehatan</option>
            <option value="axa">AXA Mandiri</option>
            <option value="prudential">Prudential</option>
            <option value="allianz">Allianz</option>
          </select>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.billing.claims.allStatus') || 'Semua Status'}</option>
            <option value="approved">{t('clinic.billing.claims.status.approved') || 'Disetujui'}</option>
            <option value="pending">{t('clinic.billing.claims.status.pending') || 'Menunggu'}</option>
            <option value="processing">{t('clinic.billing.claims.status.processing') || 'Diproses'}</option>
            <option value="rejected">{t('clinic.billing.claims.status.rejected') || 'Ditolak'}</option>
          </select>
        </div>
        <button 
          onClick={() => setShowClaimModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
        >
          <AppIcon name="Plus" size={16} />
          {t('clinic.billing.claims.submitClaim') || 'Ajukan Klaim'}
        </button>
      </div>

      {/* Claims List */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.billing.claims.title') || 'Daftar Klaim Asuransi'}
          </h3>
        </div>
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
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{claim.claimNumber}</div>
                      <div className="text-xs text-secondary">
                        {new Date(claim.submittedAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{claim.patient}</div>
                      <div className="text-xs text-secondary">{claim.policyNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <AppIcon name={getInsuranceIcon(claim.insurance)} size={14} />
                      <span className="text-sm text-primary">{claim.insurance}</span>
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
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(claim.approvedAmount)}
                      </div>
                    ) : (
                      <div className="text-sm text-secondary">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                      {getStatusText(claim.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <AppIcon name="Eye" size={16} />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                        <AppIcon name="Download" size={16} />
                      </button>
                      {(claim.status === 'pending' || claim.status === 'processing') && (
                        <button className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded">
                          <AppIcon name="Send" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClaimsView;
