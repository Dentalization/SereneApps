import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useToast } from '../../../../contexts/ToastContext';
import { authHttp } from '../../../../utils/httpClient';

const todayJakarta = () => new Date().toISOString().slice(0, 10);

const initialPatientForm = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: ''
};

const initialAppointmentForm = {
  dentistId: '',
  date: todayJakarta(),
  time: '09:00',
  duration: 30,
  reason: 'Konsultasi Klinik',
  amount: ''
};

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0
}).format(amount || 0);

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

const isPaidStatus = (status) => ['paid', 'settled', 'completed'].includes(String(status || '').toLowerCase());

const methodLabel = (method) => {
  if (method === 'cash') return 'Tunai';
  if (method === 'midtrans') return 'Midtrans';
  if (method === 'qris') return 'Midtrans QRIS';
  if (method === 'transfer') return 'Midtrans Transfer';
  if (method === 'credit') return 'Midtrans Kartu';
  return method || 'Midtrans';
};

const statusLabel = (status) => {
  const value = status?.toLowerCase?.();
  if (value === 'settled') return 'Selesai';
  if (value === 'paid') return 'Lunas';
  if (value === 'issued') return 'Siap Dibayar';
  if (value === 'pending') return 'Menunggu';
  if (value === 'failed') return 'Gagal';
  if (value === 'refunded') return 'Dikembalikan';
  return status || 'Belum Ada';
};

const queueState = (appointment) => {
  const invoice = appointment?.invoice;
  if (!invoice) return 'needs_invoice';
  if (isPaidStatus(invoice.status)) return 'paid';
  if (invoice.paymentIntentId) return 'pending';
  return 'ready';
};

const queueStateMeta = {
  ready: {
    label: 'Siap Bayar',
    icon: 'ReceiptText',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
  },
  needs_invoice: {
    label: 'Perlu Invoice',
    icon: 'FilePlus2',
    className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200'
  },
  pending: {
    label: 'Menunggu',
    icon: 'Clock',
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
  },
  paid: {
    label: 'Lunas',
    icon: 'CheckCircle2',
    className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200'
  }
};

const paymentStatusClass = (status) => {
  const value = status?.toLowerCase?.();
  if (['paid', 'settled', 'completed'].includes(value)) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
  if (['pending', 'requires_action'].includes(value)) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
  if (['failed', 'expired', 'cancelled'].includes(value)) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
};

const buildAppointmentTimes = ({ date, time, duration }) => {
  const startsAt = new Date(`${date}T${time}:00`);
  const endsAt = new Date(startsAt.getTime() + Number(duration || 30) * 60 * 1000);
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
};

const invoiceAmount = (invoice) => Number(invoice?.grandTotal || invoice?.total || invoice?.amount || 0);

const settlementForInvoice = (invoice) => {
  const amount = invoiceAmount(invoice);
  const platformFee = Number(invoice?.platformFee ?? Math.round(amount * 0.1));
  const dentistShare = Number(invoice?.dentistShare ?? Math.round(amount * 0.3));
  const clinicShare = Number(invoice?.clinicShare ?? Math.max(amount - platformFee - dentistShare, 0));
  return { amount, clinicShare, dentistShare, platformFee };
};

const PaymentsView = ({ payments = [], loading = false, permission = null, onRefresh }) => {
  const toast = useToast();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [dentists, setDentists] = useState([]);
  const [dentistsLoading, setDentistsLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState('active');
  const [queueSearch, setQueueSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [invoiceDescription, setInvoiceDescription] = useState('Konsultasi Klinik');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirmCash, setConfirmCash] = useState(false);
  const [result, setResult] = useState(null);
  const [flowError, setFlowError] = useState('');

  const selectedBranch = useMemo(
    () => branches.find((branch) => String(branch.id) === String(selectedBranchId)) || null,
    [branches, selectedBranchId]
  );

  const selectedAppointment = useMemo(
    () => queue.find((item) => String(item.id) === String(selectedAppointmentId)) || null,
    [queue, selectedAppointmentId]
  );

  const selectedInvoice = selectedAppointment?.invoice || null;
  const settlement = settlementForInvoice(selectedInvoice);
  const isBranchLocked = Boolean(permission?.assignedBranchId) || branches.length <= 1;
  const cashierMissingBranch = permission?.role === 'cashier' && !permission?.assignedBranchId;

  const paidPayments = payments.filter((payment) => isPaidStatus(payment.status));
  const paidGross = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const paidClinicRevenue = paidPayments.reduce((sum, payment) => (
    sum + Number(payment.clinicShare ?? Math.round((payment.amount || 0) * 0.6))
  ), 0);
  const readyCount = queue.filter((item) => queueState(item) === 'ready').length;
  const needsInvoiceCount = queue.filter((item) => queueState(item) === 'needs_invoice').length;

  const filteredQueue = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return queue.filter((appointment) => {
      const state = queueState(appointment);
      const filterMatch = queueFilter === 'all'
        || (queueFilter === 'active' && ['ready', 'needs_invoice', 'pending'].includes(state))
        || queueFilter === state;
      if (!filterMatch) return false;
      if (!search) return true;
      const haystack = [
        appointment.patient?.name,
        appointment.patient?.phone,
        appointment.patient?.email,
        appointment.dentist?.name,
        appointment.reason,
        appointment.invoice?.reference
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }, [queue, queueFilter, queueSearch]);

  useEffect(() => {
    let mounted = true;
    const loadBranches = async () => {
      if (!permission?.canAccessPaymentMenu) return;
      setBranchesLoading(true);
      setFlowError('');
      try {
        const { data } = await authHttp.get('/clinic/billing/branches');
        if (!mounted) return;
        const nextBranches = data.branches || [];
        setBranches(nextBranches);
        const preferredBranch = permission.assignedBranchId || nextBranches[0]?.id || '';
        setSelectedBranchId((current) => current || preferredBranch);
      } catch (error) {
        if (!mounted) return;
        setFlowError(error.response?.data?.error || 'Gagal memuat cabang');
      } finally {
        if (mounted) setBranchesLoading(false);
      }
    };
    loadBranches();
    return () => {
      mounted = false;
    };
  }, [permission?.canAccessPaymentMenu, permission?.assignedBranchId]);

  const loadQueue = async (branchId = selectedBranchId) => {
    if (!branchId) return;
    setQueueLoading(true);
    try {
      const { data } = await authHttp.get('/clinic/billing/appointments', {
        params: { branchId }
      });
      const appointments = data.appointments || [];
      setQueue(appointments);
      setSelectedAppointmentId((current) => {
        if (current && appointments.some((item) => String(item.id) === String(current))) return current;
        const firstActionable = appointments.find((item) => ['ready', 'needs_invoice', 'pending'].includes(queueState(item)));
        return firstActionable?.id || appointments[0]?.id || '';
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal memuat antrean pembayaran');
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    let mounted = true;
    const loadDentists = async () => {
      if (!selectedBranchId) {
        setDentists([]);
        return;
      }
      setDentistsLoading(true);
      try {
        const { data } = await authHttp.get(`/clinic/billing/branches/${selectedBranchId}/dentists`);
        if (!mounted) return;
        setDentists(data.dentists || []);
        setAppointmentForm((current) => ({
          ...current,
          dentistId: current.dentistId || data.dentists?.[0]?.id || ''
        }));
      } catch (error) {
        if (!mounted) return;
        setDentists([]);
        toast.error(error.response?.data?.error || 'Gagal memuat dokter');
      } finally {
        if (mounted) setDentistsLoading(false);
      }
    };
    loadDentists();
    return () => {
      mounted = false;
    };
  }, [selectedBranchId, toast]);

  useEffect(() => {
    if (!selectedAppointment) return;
    setInvoiceDescription(selectedAppointment.reason || 'Konsultasi Klinik');
    setResult(null);
  }, [selectedAppointmentId]);

  const handleSearchPatients = async () => {
    if (!selectedBranchId) return;
    setPatientLoading(true);
    try {
      const { data } = await authHttp.get('/clinic/billing/patients', {
        params: { branchId: selectedBranchId, search: patientSearch }
      });
      setPatientResults(data.patients || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal mencari pasien');
    } finally {
      setPatientLoading(false);
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientResults((current) => [patient, ...current.filter((item) => item.id !== patient.id)]);
  };

  const handleCreatePatient = async (event) => {
    event.preventDefault();
    if (!selectedBranchId) return;
    setPatientLoading(true);
    try {
      const { data } = await authHttp.post('/clinic/billing/patients', {
        ...patientForm,
        branchId: selectedBranchId
      });
      selectPatient(data.patient);
      setPatientForm(initialPatientForm);
      setShowPatientModal(false);
      toast.success('Pasien walk-in tersimpan');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menambah pasien');
    } finally {
      setPatientLoading(false);
    }
  };

  const handleCreateAppointment = async (event) => {
    event.preventDefault();
    if (!selectedPatient || !selectedBranchId || !appointmentForm.dentistId) return;
    setAppointmentLoading(true);
    try {
      const times = buildAppointmentTimes(appointmentForm);
      const { data } = await authHttp.post('/clinic/billing/appointments', {
        branchId: selectedBranchId,
        patientId: selectedPatient.id,
        dentistId: appointmentForm.dentistId,
        startsAt: times.startsAt,
        endsAt: times.endsAt,
        reason: appointmentForm.reason
      });
      setQueue((current) => [data.appointment, ...current]);
      setSelectedAppointmentId(data.appointment.id);
      setInvoiceDescription(appointmentForm.reason);
      setShowWalkIn(false);
      toast.success('Kunjungan walk-in masuk antrean kasir');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal membuat kunjungan');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedAppointment || !selectedBranchId) return;
    const amount = Number(appointmentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Nominal tagihan belum valid');
      return;
    }
    setAppointmentLoading(true);
    try {
      const { data } = await authHttp.post('/clinic/billing/invoices', {
        branchId: selectedBranchId,
        appointmentId: selectedAppointment.id,
        amount,
        description: invoiceDescription || selectedAppointment.reason || 'Konsultasi Klinik'
      });
      setQueue((current) => current.map((item) => (
        item.id === selectedAppointment.id ? { ...item, invoice: data.invoice } : item
      )));
      setResult(null);
      toast.success('Invoice siap dibayar');
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal membuat invoice');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!selectedInvoice || !selectedAppointment || !selectedBranchId) return;
    setPaymentLoading(true);
    setConfirmCash(false);
    try {
      const payload = {
        invoiceId: selectedInvoice.id || selectedInvoice.dbId,
        appointmentId: selectedAppointment.id,
        branchId: selectedBranchId,
        amount: invoiceAmount(selectedInvoice),
        notes: paymentNotes
      };

      if (paymentMethod === 'cash') {
        const { data } = await authHttp.post('/clinic/billing/payments/cash', payload);
        setResult({ type: 'cash', payment: data.payment, message: data.message || 'Pembayaran Berhasil' });
        toast.success('Pembayaran tunai tercatat');
      } else {
        const { data } = await authHttp.post('/clinic/billing/payments/midtrans', payload);
        setResult({ type: 'midtrans', payment: data.payment, message: data.message || 'Link pembayaran dibuat' });
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
        }
        toast.success('Link Midtrans dibuat');
      }
      await loadQueue(selectedBranchId);
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal memproses pembayaran');
    } finally {
      setPaymentLoading(false);
    }
  };

  const methodOptions = [
    { id: 'cash', label: 'Tunai', icon: 'Wallet' },
    { id: 'midtrans', label: 'Link Digital', icon: 'CreditCard' }
  ];

  if (cashierMissingBranch) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900/40 dark:bg-yellow-950/20">
        <div className="flex items-center gap-3">
          <AppIcon name="MapPinOff" className="text-yellow-700 dark:text-yellow-300" size={22} />
          <p className="font-medium text-yellow-900 dark:text-yellow-200">Kasir tidak terhubung dengan cabang mana pun</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-primary">Meja Kasir</h3>
            <p className="text-sm text-secondary">
              {selectedBranch?.branchName || 'Pilih cabang'} - pilih tagihan, cek pendapatan, lalu selesaikan pembayaran.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                setSelectedAppointmentId('');
                setResult(null);
              }}
              disabled={branchesLoading || isBranchLocked}
              className="h-10 min-w-[240px] rounded-lg border border-primary/15 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
            >
              {!selectedBranchId && <option value="">Pilih cabang</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.branchName}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                loadQueue();
                onRefresh?.();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary/15 px-3 text-sm font-medium text-primary hover:bg-surface"
            >
              <AppIcon name="RefreshCw" size={15} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowWalkIn((current) => !current)}
              disabled={!selectedBranchId}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <AppIcon name={showWalkIn ? 'ChevronUp' : 'UserPlus'} size={16} />
              Walk-in Baru
            </button>
          </div>
        </div>

        {flowError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {flowError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <MetricCard icon="Banknote" label="Tunai/Digital Masuk" value={formatCurrency(paidGross)} />
          <MetricCard icon="Building2" label="Pendapatan Klinik" value={formatCurrency(paidClinicRevenue)} />
          <MetricCard icon="ReceiptText" label="Siap Dibayar" value={readyCount} />
          <MetricCard icon="FilePlus2" label="Perlu Invoice" value={needsInvoiceCount} />
        </div>
      </section>

      {showWalkIn && (
        <WalkInPanel
          dentists={dentists}
          dentistsLoading={dentistsLoading}
          appointmentForm={appointmentForm}
          setAppointmentForm={setAppointmentForm}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          patientResults={patientResults}
          selectedPatient={selectedPatient}
          selectPatient={selectPatient}
          patientLoading={patientLoading}
          handleSearchPatients={handleSearchPatients}
          setShowPatientModal={setShowPatientModal}
          handleCreateAppointment={handleCreateAppointment}
          appointmentLoading={appointmentLoading}
          selectedBranchId={selectedBranchId}
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-primary/15 bg-surface-elevated overflow-hidden">
          <div className="border-b border-primary/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-base font-semibold text-primary">Antrean Tagihan</h4>
                <p className="text-xs text-secondary">Tidak perlu mulai dari tambah pasien. Pilih kunjungan atau invoice yang sudah ada.</p>
              </div>
              <div className="relative w-full md:w-72">
                <AppIcon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Cari pasien, dokter, invoice"
                  className="h-10 w-full rounded-lg border border-primary/15 bg-surface pl-9 pr-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['active', 'Aktif'],
                ['ready', 'Siap Bayar'],
                ['needs_invoice', 'Perlu Invoice'],
                ['pending', 'Menunggu'],
                ['paid', 'Lunas'],
                ['all', 'Semua']
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setQueueFilter(id)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                    queueFilter === id
                      ? 'bg-accent text-white'
                      : 'border border-primary/10 bg-surface text-secondary hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {queueLoading || loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-accent/10" />
              ))}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-12 text-center">
              <AppIcon name="ReceiptText" className="mx-auto text-muted/40" size={44} />
              <p className="mt-3 font-medium text-primary">Belum ada tagihan di filter ini</p>
              <p className="text-sm text-secondary">Gunakan Walk-in Baru hanya kalau pasien belum punya kunjungan.</p>
            </div>
          ) : (
            <div className="divide-y divide-primary/10">
              {filteredQueue.map((appointment) => (
                <QueueRow
                  key={appointment.id}
                  appointment={appointment}
                  selected={String(appointment.id) === String(selectedAppointmentId)}
                  onClick={() => setSelectedAppointmentId(appointment.id)}
                />
              ))}
            </div>
          )}
        </div>

        <PaymentPanel
          appointment={selectedAppointment}
          invoice={selectedInvoice}
          invoiceDescription={invoiceDescription}
          setInvoiceDescription={setInvoiceDescription}
          amount={appointmentForm.amount}
          setAmount={(value) => setAppointmentForm((current) => ({ ...current, amount: value }))}
          settlement={settlement}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          methodOptions={methodOptions}
          paymentNotes={paymentNotes}
          setPaymentNotes={setPaymentNotes}
          handleCreateInvoice={handleCreateInvoice}
          appointmentLoading={appointmentLoading}
          paymentLoading={paymentLoading}
          setConfirmCash={setConfirmCash}
          submitPayment={submitPayment}
          result={result}
        />
      </section>

      <PaymentHistory payments={payments} loading={loading} />

      {showPatientModal && (
        <PatientModal
          patientForm={patientForm}
          setPatientForm={setPatientForm}
          patientLoading={patientLoading}
          onClose={() => setShowPatientModal(false)}
          onSubmit={handleCreatePatient}
        />
      )}

      {confirmCash && (
        <ConfirmCashModal
          invoice={selectedInvoice}
          paymentLoading={paymentLoading}
          onClose={() => setConfirmCash(false)}
          onSubmit={submitPayment}
        />
      )}
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</span>
    {children}
  </label>
);

const MetricCard = ({ icon, label, value }) => (
  <div className="rounded-xl border border-primary/10 bg-surface p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <AppIcon name={icon} size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-secondary">{label}</p>
        <p className="truncate text-lg font-bold text-primary">{value}</p>
      </div>
    </div>
  </div>
);

const QueueRow = ({ appointment, selected, onClick }) => {
  const state = queueState(appointment);
  const meta = queueStateMeta[state] || queueStateMeta.needs_invoice;
  const amount = invoiceAmount(appointment.invoice);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 text-left transition hover:bg-surface ${
        selected ? 'bg-accent/5 shadow-[inset_4px_0_0_var(--color-accent,#2f80ed)]' : ''
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-primary">{appointment.patient?.name || 'Pasien'}</p>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
              <AppIcon name={meta.icon} size={12} />
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-secondary">
            {formatDateTime(appointment.startsAt)} - {appointment.reason || 'Kunjungan Klinik'}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {appointment.dentist?.name || 'Dokter belum tercatat'} · {appointment.invoice?.reference || 'Belum ada invoice'}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 lg:min-w-[180px] lg:justify-end">
          <div className="text-left lg:text-right">
            <p className="text-xs text-secondary">Tagihan</p>
            <p className="font-bold text-primary">{amount ? formatCurrency(amount) : '-'}</p>
          </div>
          <AppIcon name="ChevronRight" size={18} className={selected ? 'text-accent' : 'text-muted'} />
        </div>
      </div>
    </button>
  );
};

const PaymentPanel = ({
  appointment,
  invoice,
  invoiceDescription,
  setInvoiceDescription,
  amount,
  setAmount,
  settlement,
  paymentMethod,
  setPaymentMethod,
  methodOptions,
  paymentNotes,
  setPaymentNotes,
  handleCreateInvoice,
  appointmentLoading,
  paymentLoading,
  setConfirmCash,
  submitPayment,
  result
}) => {
  const state = queueState(appointment);
  const paid = invoice && isPaidStatus(invoice.status);

  return (
    <aside className="rounded-2xl border border-primary/15 bg-surface-elevated overflow-hidden">
      <div className="border-b border-primary/10 p-5">
        <h4 className="text-base font-semibold text-primary">Settlement</h4>
        <p className="text-xs text-secondary">Ringkasan yang berubah sesuai tagihan terpilih.</p>
      </div>

      {!appointment ? (
        <div className="p-8 text-center">
          <AppIcon name="MousePointerClick" className="mx-auto text-muted/40" size={42} />
          <p className="mt-3 font-medium text-primary">Pilih tagihan dari antrean</p>
          <p className="text-sm text-secondary">Panel ini akan menampilkan nominal, split pendapatan, dan metode bayar.</p>
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-primary/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">{appointment.patient?.name || 'Pasien'}</p>
                <p className="mt-1 text-xs text-secondary">{appointment.reason || 'Kunjungan Klinik'}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${queueStateMeta[state]?.className || queueStateMeta.ready.className}`}>
                {queueStateMeta[state]?.label || 'Aktif'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Info label="Dokter" value={appointment.dentist?.name || '-'} />
              <Info label="Jadwal" value={formatDateTime(appointment.startsAt)} />
              <Info label="Invoice" value={invoice?.reference || '-'} />
              <Info label="Status" value={statusLabel(invoice?.status)} />
            </div>
          </div>

          {!invoice ? (
            <div className="rounded-xl border border-primary/10 bg-surface p-4 space-y-4">
              <h5 className="text-sm font-semibold text-primary">Terbitkan Tagihan</h5>
              <Field label="Layanan">
                <input
                  value={invoiceDescription}
                  onChange={(event) => setInvoiceDescription(event.target.value)}
                  className="h-10 w-full rounded-lg border border-primary/20 bg-surface-elevated px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </Field>
              <Field label="Nominal">
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="150000"
                  className="h-10 w-full rounded-lg border border-primary/20 bg-surface-elevated px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </Field>
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={appointmentLoading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <AppIcon name={appointmentLoading ? 'Loader2' : 'FilePlus2'} className={appointmentLoading ? 'animate-spin' : ''} size={16} />
                Jadikan Siap Bayar
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-primary/10 bg-surface p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-secondary">Total Tagihan</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(settlement.amount)}</p>
                  </div>
                  {paid && <AppIcon name="BadgeCheck" className="text-green-600" size={28} />}
                </div>
                <div className="mt-4 space-y-2">
                  <SettlementLine label="Pendapatan klinik" value={settlement.clinicShare} total={settlement.amount} tone="clinic" />
                  <SettlementLine label="Jasa dokter" value={settlement.dentistShare} total={settlement.amount} tone="dentist" />
                  <SettlementLine label="Platform" value={settlement.platformFee} total={settlement.amount} tone="platform" />
                </div>
              </div>

              {!paid && (
                <div className="rounded-xl border border-primary/10 bg-surface p-4 space-y-4">
                  <h5 className="text-sm font-semibold text-primary">Terima Pembayaran</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {methodOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
                          paymentMethod === option.id
                            ? 'border-accent bg-accent text-white'
                            : 'border-primary/15 bg-surface-elevated text-primary hover:bg-surface'
                        }`}
                      >
                        <AppIcon name={option.icon} size={16} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    placeholder="Catatan pembayaran"
                    className="h-20 w-full resize-none rounded-lg border border-primary/20 bg-surface-elevated px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => (paymentMethod === 'cash' ? setConfirmCash(true) : submitPayment())}
                    disabled={paymentLoading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <AppIcon name={paymentLoading ? 'Loader2' : paymentMethod === 'cash' ? 'Banknote' : 'Send'} className={paymentLoading ? 'animate-spin' : ''} size={17} />
                    {paymentMethod === 'cash' ? 'Catat Tunai Lunas' : 'Buat Link Pembayaran'}
                  </button>
                </div>
              )}

              {paid && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AppIcon name="CheckCircle2" size={16} />
                    Tagihan sudah lunas
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className={`rounded-xl border p-4 text-sm ${
              result.type === 'cash'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200'
                : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200'
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                <AppIcon name={result.type === 'cash' ? 'CheckCircle2' : 'Clock'} size={16} />
                {result.message}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="font-medium text-secondary">{label}</p>
    <p className="mt-1 truncate font-semibold text-primary">{value}</p>
  </div>
);

const SettlementLine = ({ label, value, total, tone }) => {
  const tones = {
    clinic: 'bg-emerald-500',
    dentist: 'bg-sky-500',
    platform: 'bg-slate-400'
  };
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-secondary">{label}</span>
        <span className="font-semibold text-primary">{formatCurrency(value)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div className={`h-full ${tones[tone] || tones.platform}`} style={{ width: `${Math.min(Math.max((value || 0) / Math.max(total || 1, 1), 0), 1) * 100}%` }} />
      </div>
    </div>
  );
};

const WalkInPanel = ({
  dentists,
  dentistsLoading,
  appointmentForm,
  setAppointmentForm,
  patientSearch,
  setPatientSearch,
  patientResults,
  selectedPatient,
  selectPatient,
  patientLoading,
  handleSearchPatients,
  setShowPatientModal,
  handleCreateAppointment,
  appointmentLoading,
  selectedBranchId
}) => (
  <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-5">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-base font-semibold text-primary">Walk-in Baru</h4>
        <p className="text-xs text-secondary">Dipakai hanya saat pasien belum punya kunjungan di antrean.</p>
      </div>
      {dentistsLoading && <AppIcon name="Loader2" className="animate-spin text-accent" size={17} />}
    </div>

    <form onSubmit={handleCreateAppointment} className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <Field label="Cari Pasien">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <AppIcon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearchPatients();
                  }
                }}
                placeholder="Nama, email, nomor HP"
                className="h-10 w-full rounded-lg border border-primary/20 bg-surface py-2 pl-9 pr-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button type="button" onClick={handleSearchPatients} disabled={!selectedBranchId || patientLoading} className="h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50">
              Cari
            </button>
            <button type="button" onClick={() => setShowPatientModal(true)} disabled={!selectedBranchId} className="h-10 rounded-lg border border-primary/15 px-3 text-sm font-medium text-primary hover:bg-surface disabled:opacity-50">
              Baru
            </button>
          </div>
        </Field>

        {(selectedPatient || patientResults.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedPatient && <PatientRow patient={selectedPatient} selected onClick={() => selectPatient(selectedPatient)} />}
            {patientResults
              .filter((patient) => patient.id !== selectedPatient?.id)
              .slice(0, 3)
              .map((patient) => (
                <PatientRow key={patient.id} patient={patient} onClick={() => selectPatient(patient)} />
              ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Dokter">
          <select
            value={appointmentForm.dentistId}
            onChange={(event) => setAppointmentForm((current) => ({ ...current, dentistId: event.target.value }))}
            className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={!selectedBranchId || dentistsLoading}
          >
            <option value="">Pilih dokter</option>
            {dentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>{dentist.title} {dentist.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Layanan">
          <input
            value={appointmentForm.reason}
            onChange={(event) => setAppointmentForm((current) => ({ ...current, reason: event.target.value }))}
            className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Field>
        <Field label="Tanggal">
          <input
            type="date"
            value={appointmentForm.date}
            onChange={(event) => setAppointmentForm((current) => ({ ...current, date: event.target.value }))}
            className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Field>
        <Field label="Waktu & Durasi">
          <div className="grid grid-cols-[1fr_86px] gap-2">
            <input
              type="time"
              value={appointmentForm.time}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, time: event.target.value }))}
              className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="number"
              min="15"
              step="15"
              value={appointmentForm.duration}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, duration: event.target.value }))}
              className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </Field>
        <Field label="Nominal awal">
          <input
            type="number"
            min="1"
            value={appointmentForm.amount}
            onChange={(event) => setAppointmentForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="150000"
            className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!selectedPatient || !appointmentForm.dentistId || appointmentLoading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <AppIcon name={appointmentLoading ? 'Loader2' : 'ArrowRight'} className={appointmentLoading ? 'animate-spin' : ''} size={16} />
            Masukkan Antrean
          </button>
        </div>
      </div>
    </form>
  </section>
);

const PatientRow = ({ patient, selected = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
      selected ? 'border-accent bg-accent/10' : 'border-primary/10 bg-surface hover:bg-surface-elevated'
    }`}
  >
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-primary">{patient.name}</p>
      <p className="truncate text-xs text-secondary">{patient.phone || patient.email || patient.id}</p>
    </div>
    {selected && <AppIcon name="Check" size={16} className="text-accent" />}
  </button>
);

const PaymentHistory = ({ payments, loading }) => (
  <section className="rounded-2xl border border-primary/15 bg-surface-elevated overflow-hidden">
    <div className="border-b border-primary/10 px-6 py-4">
      <h3 className="text-lg font-semibold text-primary">Aktivitas Pembayaran</h3>
      <p className="text-xs text-secondary">Riwayat uang masuk dan link digital yang sedang berjalan.</p>
    </div>
    {loading ? (
      <div className="p-8 text-center text-sm text-secondary">Memuat...</div>
    ) : payments.length === 0 ? (
      <div className="p-12 text-center space-y-2">
        <AppIcon name="CreditCard" className="mx-auto text-muted/40" size={44} />
        <p className="font-medium text-primary">Belum ada pembayaran</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Waktu</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Pasien</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Nominal</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Klinik</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Metode</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-surface">
                <td className="px-6 py-4 text-sm text-primary">{payment.receivedAt ? formatDateTime(payment.receivedAt) : '-'}</td>
                <td className="px-6 py-4 text-sm font-medium text-primary">{payment.patient || '-'}</td>
                <td className="px-6 py-4 text-sm text-primary">{payment.invoice || payment.invoiceId || '-'}</td>
                <td className="px-6 py-4 text-sm font-semibold text-primary">{formatCurrency(payment.amount)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-primary">{formatCurrency(payment.clinicShare ?? Math.round((payment.amount || 0) * 0.6))}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-medium text-primary">
                    <AppIcon name={payment.method === 'cash' ? 'Wallet' : 'CreditCard'} size={13} />
                    {methodLabel(payment.method)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${paymentStatusClass(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const PatientModal = ({ patientForm, setPatientForm, patientLoading, onClose, onSubmit }) => (
  <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative w-full max-w-md rounded-2xl border border-primary/15 bg-surface-elevated p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Pasien Walk-in Baru</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-secondary hover:bg-surface">
            <AppIcon name="X" size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Nama">
            <input required value={patientForm.name} onChange={(event) => setPatientForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary" />
          </Field>
          <Field label="Email">
            <input type="email" value={patientForm.email} onChange={(event) => setPatientForm((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary" />
          </Field>
          <Field label="Nomor HP">
            <input value={patientForm.phone} onChange={(event) => setPatientForm((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Lahir">
              <input type="date" value={patientForm.dateOfBirth} onChange={(event) => setPatientForm((current) => ({ ...current, dateOfBirth: event.target.value }))} className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary" />
            </Field>
            <Field label="Gender">
              <select value={patientForm.gender} onChange={(event) => setPatientForm((current) => ({ ...current, gender: event.target.value }))} className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary">
                <option value="">-</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </Field>
          </div>
        </div>
        <button type="submit" disabled={patientLoading} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-50">
          <AppIcon name={patientLoading ? 'Loader2' : 'UserPlus'} className={patientLoading ? 'animate-spin' : ''} size={16} />
          Simpan Pasien
        </button>
      </form>
    </div>
  </ModalPortal>
);

const ConfirmCashModal = ({ invoice, paymentLoading, onClose, onSubmit }) => (
  <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-primary/15 bg-surface-elevated p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-100 p-2 text-green-700">
            <AppIcon name="Wallet" size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Konfirmasi Tunai</h3>
            <p className="text-sm text-secondary">{formatCurrency(invoiceAmount(invoice))}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-primary/15 text-sm text-primary hover:bg-surface">
            Batal
          </button>
          <button type="button" onClick={onSubmit} disabled={paymentLoading} className="h-10 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-50">
            Lunas
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);

export default PaymentsView;
