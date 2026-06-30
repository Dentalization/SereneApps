import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useToast } from '../../../../contexts/ToastContext';
import { authHttp } from '../../../../utils/httpClient';

const todayJakarta = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

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
  time: '',
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
  if (method === 'qris') return 'QRIS';
  if (['transfer', 'bank_transfer'].includes(method)) return 'Transfer Bank / VA';
  if (method === 'credit') return 'Kartu';
  if (method === 'midtrans') return 'Pembayaran Digital';
  return method || 'Belum dipilih';
};

const statusLabel = (status) => {
  const value = status?.toLowerCase?.();
  if (value === 'settled') return 'Selesai';
  if (value === 'paid') return 'Lunas';
  if (value === 'issued') return 'Siap Dibayar';
  if (value === 'pending') return 'Menunggu';
  if (value === 'requires_action') return 'Menunggu';
  if (value === 'expired') return 'Kedaluwarsa';
  if (value === 'cancelled') return 'Dibatalkan';
  if (value === 'failed') return 'Gagal';
  if (value === 'refunded') return 'Dikembalikan';
  return status || 'Belum Ada';
};

const queueState = (appointment) => {
  const invoice = appointment?.invoice;
  if (!invoice && appointment?.source === 'patient_mobile') return 'mobile_waiting';
  if (!invoice) return 'needs_invoice';
  if (isPaidStatus(invoice.status) || isPaidStatus(invoice.payment?.status)) return 'paid';
  if (['pending', 'requires_action'].includes(String(invoice.payment?.rawStatus || invoice.payment?.status || '').toLowerCase())) return 'pending';
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
    label: 'Menunggu Pasien',
    icon: 'Clock',
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
  },
  mobile_waiting: {
    label: 'Menunggu Mobile',
    icon: 'Smartphone',
    className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200'
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
  const startsAt = new Date(`${date}T${time}:00+07:00`);
  const endsAt = new Date(startsAt.getTime() + Number(duration || 30) * 60 * 1000);
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
};

const invoiceAmount = (invoice) => Number(invoice?.grandTotal || invoice?.total || invoice?.amount || 0);

const PaymentsView = ({ payments = [], loading = false, permission = null, onRefresh }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [dentists, setDentists] = useState([]);
  const [dentistsLoading, setDentistsLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState('active');
  const [queueSource, setQueueSource] = useState('clinic_walk_in');
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

  const selectedDentist = useMemo(
    () => dentists.find((dentist) => String(dentist.id) === String(appointmentForm.dentistId)) || null,
    [appointmentForm.dentistId, dentists]
  );

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');

  useEffect(() => {
    let active = true;
    const fetchSlots = async () => {
      const dentistId = selectedDentist?.id;
      const date = appointmentForm.date;
      const duration = appointmentForm.duration;

      if (!dentistId || !date || !selectedBranchId) {
        setAvailableSlots([]);
        setSlotsMessage('');
        return;
      }

      setSlotsLoading(true);
      setSlotsMessage('');
      try {
        const { data } = await authHttp.get(
          `/clinic/billing/branches/${selectedBranchId}/dentists/${dentistId}/availability`,
          { params: { date, duration } }
        );
        if (active) {
          const slots = Array.from(
            new Map((data.slots || []).map((slot) => [slot.time, slot])).values()
          );
          setAvailableSlots(slots);
          setSlotsMessage(data.message || '');

          if (slots.length > 0) {
            const isCurrentAvailable = slots.some((slot) => slot.time === appointmentForm.time);
            if (!isCurrentAvailable) {
              setAppointmentForm((current) => ({ ...current, time: slots[0].time }));
            }
          } else {
            setAppointmentForm((current) => ({ ...current, time: '' }));
          }
        }
      } catch (err) {
        console.error('Error fetching available slots:', err);
        if (active) {
          setAvailableSlots([]);
          setSlotsMessage(
            err.response?.data?.message
            || err.response?.data?.error
            || 'Jadwal dokter gagal dimuat. Coba lagi.'
          );
          setAppointmentForm((current) => ({ ...current, time: '' }));
        }
      } finally {
        if (active) {
          setSlotsLoading(false);
        }
      }
    };

    fetchSlots();
    return () => {
      active = false;
    };
  }, [selectedDentist?.id, appointmentForm.date, appointmentForm.duration, selectedBranchId]);

  const selectedAppointment = useMemo(
    () => queue.find((item) => String(item.id) === String(selectedAppointmentId)) || null,
    [queue, selectedAppointmentId]
  );

  const selectedInvoice = selectedAppointment?.invoice || null;
  const isBranchLocked = Boolean(permission?.assignedBranchId) || branches.length <= 1;
  const cashierMissingBranch = permission?.role === 'cashier' && !permission?.assignedBranchId;

  const paidPayments = payments.filter((payment) => isPaidStatus(payment.status));
  const paidGross = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const readyCount = queue.filter((item) => queueState(item) === 'ready').length;
  const needsInvoiceCount = queue.filter((item) => queueState(item) === 'needs_invoice').length;
  const pendingCount = queue.filter((item) => queueState(item) === 'pending').length;
  const walkInCount = queue.filter((item) => item.source === 'clinic_walk_in').length;
  const mobileCount = queue.filter((item) => item.source === 'patient_mobile').length;

  const filteredQueue = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return queue.filter((appointment) => {
      if (appointment.source !== queueSource) return false;
      const state = queueState(appointment);
      const filterMatch = queueFilter === 'all'
        || (queueFilter === 'active' && ['ready', 'needs_invoice', 'pending', 'mobile_waiting'].includes(state))
        || (queueFilter === 'pending' && state === 'mobile_waiting')
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
  }, [queue, queueFilter, queueSearch, queueSource]);

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
      const [walkInResponse, mobileResponse] = await Promise.all([
        authHttp.get('/clinic/billing/appointments', {
          params: { branchId, source: 'clinic_walk_in' }
        }),
        authHttp.get('/clinic/billing/appointments', {
          params: { branchId, source: 'patient_mobile' }
        })
      ]);
      const appointments = [
        ...(walkInResponse.data.appointments || []),
        ...(mobileResponse.data.appointments || [])
      ];
      setQueue(appointments);
      setSelectedAppointmentId((current) => {
        if (current && appointments.some((item) => String(item.id) === String(current) && item.source === queueSource)) return current;
        const sameSource = appointments.filter((item) => item.source === queueSource);
        const firstActionable = sameSource.find((item) => ['ready', 'needs_invoice', 'pending'].includes(queueState(item)));
        return firstActionable?.id || sameSource[0]?.id || '';
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
    const activePayment = selectedAppointment.invoice?.payment;
    setResult(activePayment ? {
      type: activePayment.method === 'cash' ? 'cash' : 'digital',
      payment: activePayment,
      invoice: selectedAppointment.invoice,
      appointment: selectedAppointment,
      redirectUrl: activePayment.redirectUrl,
      message: isPaidStatus(activePayment.status)
        ? 'Pembayaran sudah diterima.'
        : 'Instruksi pembayaran masih aktif. Lanjutkan transaksi yang sama.'
    } : null);
  }, [selectedAppointmentId, selectedAppointment?.invoice?.payment?.id, selectedAppointment?.invoice?.payment?.status]);

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
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (!selectedPatient || !selectedBranchId || !appointmentForm.dentistId) return;

    if (!appointmentForm.time) {
      toast.error('Silakan pilih jam kunjungan yang tersedia');
      return;
    }

    const times = buildAppointmentTimes(appointmentForm);
    const startsAtDate = new Date(times.startsAt);
    if (startsAtDate < new Date()) {
      toast.error('Waktu kunjungan tidak boleh di masa lampau');
      return;
    }

    setAppointmentLoading(true);
    try {
      const { data } = await authHttp.post('/clinic/billing/appointments', {
        branchId: selectedBranchId,
        patientId: selectedPatient.id,
        dentistId: appointmentForm.dentistId,
        startsAt: times.startsAt,
        endsAt: times.endsAt,
        reason: appointmentForm.reason
      });
      setQueue((current) => [data.appointment, ...current]);
      setQueueSource('clinic_walk_in');
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
        setResult({
          type: 'cash',
          payment: data.payment,
          invoice: selectedInvoice,
          appointment: selectedAppointment,
          message: data.message || 'Pembayaran Berhasil'
        });
        toast.success('Pembayaran tunai tercatat');
      } else {
        const { data } = await authHttp.post('/clinic/billing/payments/midtrans', {
          ...payload,
          channel: paymentMethod
        });
        const redirectUrl = data.redirectUrl || data.payment?.redirectUrl || data.payment?.checkoutUrl || data.payment?.paymentUrl;
        setResult({
          type: 'digital',
          payment: data.payment,
          invoice: selectedInvoice,
          appointment: selectedAppointment,
          redirectUrl,
          message: data.message || 'Instruksi pembayaran dibuat'
        });
        if (redirectUrl) {
          window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        }
        toast.success(data.outcome === 'resumed' ? 'Pembayaran aktif dilanjutkan' : 'Instruksi pembayaran siap');
      }
      await loadQueue(selectedBranchId);
      onRefresh?.();
    } catch (error) {
      const activePayment = error.response?.data?.details?.payment;
      if (activePayment) {
        setResult({
          type: activePayment.method === 'cash' ? 'cash' : 'digital',
          payment: activePayment,
          invoice: selectedInvoice,
          appointment: selectedAppointment,
          redirectUrl: activePayment.redirectUrl,
          message: error.response?.data?.details?.message
        });
        toast.error('Pembayaran lain masih aktif. Lanjutkan transaksi tersebut.');
      } else {
        toast.error(error.response?.data?.error || 'Gagal memproses pembayaran');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleBackToQueue = () => {
    setResult(null);
    setSelectedAppointmentId('');
    setQueueFilter('active');
  };

  const handleOpenAppointment = () => {
    const appointmentId = result?.appointment?.id || selectedAppointment?.id;
    if (appointmentId) {
      navigate(`/clinic-portal/schedule?appointmentId=${appointmentId}`);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCopyPaymentLink = async () => {
    const redirectUrl = result?.redirectUrl;
    if (!redirectUrl) {
      toast.error('Link pembayaran belum tersedia');
      return;
    }
    try {
      await navigator.clipboard.writeText(redirectUrl);
      toast.success('Link pembayaran disalin');
    } catch {
      toast.error('Gagal menyalin link pembayaran');
    }
  };

  const handleRefreshPaymentStatus = async () => {
    const paymentId = result?.payment?.id || selectedInvoice?.payment?.id;
    if (!paymentId) return;
    setPaymentLoading(true);
    try {
      const { data } = await authHttp.post(`/clinic/billing/payments/${paymentId}/reconcile`);
      setResult((current) => ({
        ...current,
        type: data.payment?.method === 'cash' ? 'cash' : 'digital',
        payment: data.payment,
        invoice: data.invoice || current?.invoice || selectedInvoice,
        redirectUrl: data.payment?.redirectUrl || current?.redirectUrl,
        message: data.message
      }));
      await loadQueue(selectedBranchId);
      onRefresh?.();
      toast.success(data.message || 'Status pembayaran diperbarui');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal memperbarui status pembayaran');
    } finally {
      setPaymentLoading(false);
    }
  };

  const methodOptions = [
    { id: 'cash', label: 'Tunai', icon: 'Wallet', helper: 'Catat lunas hanya setelah uang diterima dan nominal sudah dihitung.' },
    { id: 'qris', label: 'QRIS', icon: 'QrCode', helper: 'Tampilkan QRIS kepada pasien. Status diverifikasi otomatis melalui Midtrans.' },
    { id: 'bank_transfer', label: 'Transfer / VA', icon: 'Landmark', helper: 'Pasien memilih bank lalu menerima nomor virtual account pada halaman pembayaran.' }
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
      <section className="space-y-6">
        {/* Cashier Banner Card in style of Home Dashboard Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 md:p-8 text-white shadow-xl theme-transition">
          {/* Decorative blur elements */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-black/10 blur-2xl" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 z-10">
            {/* Left section: Title & Subtitle */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                <AppIcon name="ScanLine" size={12} />
                Meja Kasir
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {selectedBranch?.branchName || 'Kasir Klinik'}
              </h1>
              <p className="text-sm text-white/95 max-w-xl">
                Tagih pasien walk-in dan pantau status pembayaran secara real-time.
              </p>
            </div>

            {/* Right section: Control widgets (Branch select, Lock, Refresh, Register) */}
            <div className="flex flex-wrap items-center gap-3 relative z-20">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-1">
                <select
                  aria-label="Cabang kasir"
                  value={selectedBranchId}
                  onChange={(event) => {
                    setSelectedBranchId(event.target.value);
                    setSelectedAppointmentId('');
                    setResult(null);
                  }}
                  disabled={branchesLoading || isBranchLocked}
                  className="h-10 min-w-[200px] rounded-xl border-0 bg-transparent px-3 text-sm text-white focus:outline-none focus:ring-0 cursor-pointer font-semibold"
                >
                  {!selectedBranchId && <option value="" className="text-primary">Pilih cabang</option>}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="text-primary">{branch.branchName}</option>
                  ))}
                </select>

                {isBranchLocked && (
                  <span className="inline-flex h-8 items-center gap-1 rounded-xl bg-amber-500/80 px-3 text-xs font-bold text-white shadow-inner flex-shrink-0">
                    <AppIcon name="Lock" size={12} />
                    Terkunci
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  loadQueue();
                  onRefresh?.();
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all cursor-pointer shadow-inner"
                title="Refresh"
              >
                <AppIcon name="RefreshCw" size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowWalkIn((current) => !current)}
                disabled={!selectedBranchId}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white text-teal-800 hover:bg-white/90 px-5 text-sm font-extrabold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AppIcon name={showWalkIn ? 'ChevronUp' : 'UserPlus'} size={16} />
                Daftarkan Walk-in
              </button>
            </div>
          </div>

          {/* Stats grid rendered as frosted glass cards inside the banner */}
          <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/15 pt-6 z-10">
            {/* Stat 1: Pembayaran Diterima */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-xs font-medium text-white/80">Pembayaran diterima</p>
              <p className="text-lg md:text-xl font-extrabold text-white mt-1 truncate">{formatCurrency(paidGross)}</p>
            </div>

            {/* Stat 2: Siap Ditagih */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-xs font-medium text-white/80">Siap ditagih</p>
              <p className="text-lg md:text-xl font-extrabold text-white mt-1">{readyCount}</p>
            </div>

            {/* Stat 3: Belum Ada Tagihan */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-xs font-medium text-white/80">Belum ada tagihan</p>
              <p className="text-lg md:text-xl font-extrabold text-white mt-1">{needsInvoiceCount}</p>
            </div>

            {/* Stat 4: Menunggu Digital */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-xs font-medium text-white/80">Menunggu digital</p>
              <p className="text-lg md:text-xl font-extrabold text-white mt-1">{pendingCount}</p>
            </div>
          </div>
        </div>

        {flowError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {flowError}
          </div>
        )}
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
          selectedBranch={selectedBranch}
          selectedDentist={selectedDentist}
          availableSlots={availableSlots}
          slotsLoading={slotsLoading}
          slotsMessage={slotsMessage}
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-primary/15 bg-surface-elevated">
          <div className="border-b border-primary/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-base font-semibold text-primary">Antrean Pembayaran</h4>
                <p className="text-xs text-secondary">Pilih pasien, lalu selesaikan tindakan yang muncul di panel tagihan.</p>
              </div>
              <div className="relative w-full md:w-72">
                <AppIcon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  aria-label="Cari antrean pembayaran"
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Cari pasien, dokter, invoice"
                  className="h-10 w-full rounded-lg border border-primary/15 bg-surface pl-9 pr-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 rounded-lg bg-surface p-1">
              <button
                type="button"
                onClick={() => {
                  setQueueSource('clinic_walk_in');
                  const first = queue.find((item) => item.source === 'clinic_walk_in');
                  setSelectedAppointmentId(first?.id || '');
                }}
                className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold ${queueSource === 'clinic_walk_in' ? 'bg-surface-elevated text-primary shadow-sm' : 'text-secondary'
                  }`}
              >
                <AppIcon name="Footprints" size={15} />
                Walk-in Klinik <span className="text-xs font-normal">({walkInCount})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQueueSource('patient_mobile');
                  const first = queue.find((item) => item.source === 'patient_mobile');
                  setSelectedAppointmentId(first?.id || '');
                }}
                className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold ${queueSource === 'patient_mobile' ? 'bg-surface-elevated text-primary shadow-sm' : 'text-secondary'
                  }`}
              >
                <AppIcon name="Smartphone" size={15} />
                Serene Mobile <span className="text-xs font-normal">({mobileCount})</span>
              </button>
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
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${queueFilter === id
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
              <p className="text-sm text-secondary">
                {queueSource === 'clinic_walk_in'
                  ? 'Daftarkan pasien yang datang langsung untuk membuat kunjungan baru.'
                  : 'Pembayaran dari aplikasi pasien akan muncul otomatis di sini.'}
              </p>
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
          onBackToQueue={handleBackToQueue}
          onOpenAppointment={handleOpenAppointment}
          onPrintReceipt={handlePrintReceipt}
          onCopyPaymentLink={handleCopyPaymentLink}
          onRefreshPaymentStatus={handleRefreshPaymentStatus}
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

const OperationalMetric = ({ label, value }) => (
  <div className="min-w-0 border-primary/10 px-3 py-4 odd:border-r md:border-r md:last:border-r-0">
    <p className="text-xs font-medium text-secondary">{label}</p>
    <p className="mt-1 truncate text-lg font-bold text-primary">{value}</p>
  </div>
);

const PanelHeading = ({ icon, title }) => (
  <div className="flex items-center gap-2">
    <AppIcon name={icon} className="text-accent" size={16} />
    <h5 className="text-sm font-semibold text-primary">{title}</h5>
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
      className={`w-full p-4 text-left transition hover:bg-surface ${selected ? 'bg-accent/5 shadow-[inset_4px_0_0_var(--color-accent,#2f80ed)]' : ''
        }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-primary">{appointment.patient?.name || 'Pasien'}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
              <AppIcon name={appointment.source === 'clinic_walk_in' ? 'Footprints' : 'Smartphone'} size={12} />
              {appointment.sourceLabel || (appointment.source === 'clinic_walk_in' ? 'Walk-in Klinik' : 'Serene Mobile')}
            </span>
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
  result,
  onBackToQueue,
  onOpenAppointment,
  onPrintReceipt,
  onCopyPaymentLink,
  onRefreshPaymentStatus
}) => {
  const toast = useToast();
  const state = queueState(appointment);
  const paid = invoice && (isPaidStatus(invoice.status) || isPaidStatus(invoice.payment?.status));
  const mobileManaged = appointment?.source === 'patient_mobile';
  const selectedMethod = methodOptions.find((option) => option.id === paymentMethod);

  return (
    <aside className="overflow-hidden rounded-lg border border-primary/15 bg-surface-elevated">
      <div className="border-b border-primary/10 p-5">
        <h4 className="text-base font-semibold text-primary">Detail Tagihan</h4>
        <p className="text-xs text-secondary">Nominal, kanal pembayaran, dan tindakan berikutnya.</p>
      </div>

      {!appointment ? (
        <div className="p-8 text-center">
          <AppIcon name="MousePointerClick" className="mx-auto text-muted/40" size={42} />
          <p className="mt-3 font-medium text-primary">Pilih pasien dari antrean</p>
          <p className="text-sm text-secondary">Detail kunjungan dan tindakan kasir akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-primary/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">{appointment.patient?.name || 'Pasien'}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-secondary">
                  <AppIcon name={mobileManaged ? 'Smartphone' : 'Footprints'} size={12} />
                  {appointment.sourceLabel} · {appointment.reason || 'Kunjungan Klinik'}
                </p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${queueStateMeta[state]?.className || queueStateMeta.ready.className}`}>
                {queueStateMeta[state]?.label || 'Aktif'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Info label="Dokter" value={appointment.dentist?.name || '-'} />
              <Info label="Jadwal" value={formatDateTime(appointment.startsAt)} />
              <Info label="Invoice" value={invoice?.reference || '-'} />
              <Info label="Status" value={statusLabel(invoice?.payment?.status || invoice?.status)} />
            </div>
          </div>

          {mobileManaged && (
            <div className="space-y-4">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
                <div className="flex items-start gap-2">
                  <AppIcon name="Smartphone" className="mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="font-semibold">Dikelola dari aplikasi pasien</p>
                    <p className="mt-1 text-xs opacity-80">Kasir hanya memantau status. Invoice dan instruksi pembayaran dibuat dari alur Serene Mobile.</p>
                  </div>
                </div>
              </div>

              {state === 'mobile_waiting' && (
                <div className="rounded-xl border border-primary/10 bg-surface p-4 space-y-3">
                  <PanelHeading icon="MessageSquare" title="Tindakan Kasir" />
                  <p className="text-xs text-secondary">
                    Pasien ini masuk melalui aplikasi mobile. Anda dapat menghubungi mereka untuk konfirmasi atau mengirimkan link billing manual.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const phone = appointment.patient?.phone_number || appointment.patient?.phone || '';
                        if (phone) {
                          window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
                        } else {
                          toast.error('Nomor telepon pasien tidak tersedia');
                        }
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/15 bg-surface-elevated text-xs font-semibold text-primary hover:bg-surface transition-colors cursor-pointer"
                    >
                      <AppIcon name="MessageCircle" size={14} className="text-green-500" />
                      Hubungi Pasien
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success('Link pembayaran berhasil dikirim ke nomor WhatsApp pasien!');
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-accent text-xs font-semibold text-white hover:bg-accent-hover transition-colors cursor-pointer"
                    >
                      <AppIcon name="Send" size={14} />
                      Kirim Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!invoice && !mobileManaged ? (
            <div className="rounded-xl border border-primary/10 bg-surface p-4 space-y-4">
              <PanelHeading icon="FilePlus2" title="Siapkan tagihan" />
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
                Buat Invoice
              </button>
            </div>
          ) : invoice ? (
            <>
              <div className="rounded-lg border border-primary/10 bg-surface p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-secondary">Yang harus dibayar pasien</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(invoiceAmount(invoice))}</p>
                  </div>
                  {paid && <AppIcon name="BadgeCheck" className="text-green-600" size={28} />}
                </div>
                <div className="mt-4 border-t border-primary/10 pt-3 text-xs text-secondary">
                  {(invoice.items || []).map((item) => (
                    <div key={item.id || item.description} className="flex justify-between gap-3">
                      <span>{item.description}</span>
                      <span className="font-medium text-primary">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!paid && !mobileManaged && !result && (
                <div className="rounded-xl border border-primary/10 bg-surface p-4 space-y-4">
                  <PanelHeading icon="HandCoins" title="Bagaimana pasien membayar?" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    {methodOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${paymentMethod === option.id
                          ? 'border-accent bg-accent text-white'
                          : 'border-primary/15 bg-surface-elevated text-primary hover:bg-surface'
                          }`}
                      >
                        <AppIcon name={option.icon} size={16} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {selectedMethod?.helper && (
                    <p className="rounded-lg bg-surface-elevated px-3 py-2 text-xs text-secondary">
                      {selectedMethod.helper}
                    </p>
                  )}
                  <Field label="Catatan (opsional)">
                    <textarea
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      placeholder="Contoh: diterima oleh kasir pagi"
                      className="h-20 w-full resize-none rounded-lg border border-primary/20 bg-surface-elevated px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => (paymentMethod === 'cash' ? setConfirmCash(true) : submitPayment())}
                    disabled={paymentLoading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <AppIcon name={paymentLoading ? 'Loader2' : paymentMethod === 'cash' ? 'Banknote' : 'Send'} className={paymentLoading ? 'animate-spin' : ''} size={17} />
                    {paymentMethod === 'cash'
                      ? 'Konfirmasi Uang Diterima'
                      : paymentMethod === 'qris'
                        ? 'Tampilkan QRIS'
                        : 'Buat Nomor Transfer'}
                  </button>
                </div>
              )}

              {paid && !result && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AppIcon name="CheckCircle2" size={16} />
                    Tagihan sudah lunas
                  </div>
                </div>
              )}
            </>
          ) : null}

          {result && (
            <PaymentResultPanel
              result={result}
              onBackToQueue={onBackToQueue}
              onOpenAppointment={onOpenAppointment}
              onPrintReceipt={onPrintReceipt}
              onCopyPaymentLink={onCopyPaymentLink}
              onRefreshPaymentStatus={onRefreshPaymentStatus}
              readOnly={mobileManaged}
            />
          )}
        </div>
      )}
    </aside>
  );
};

const PaymentResultPanel = ({
  result,
  onBackToQueue,
  onOpenAppointment,
  onPrintReceipt,
  onCopyPaymentLink,
  onRefreshPaymentStatus,
  readOnly = false
}) => {
  const isCash = result.type === 'cash';
  const paid = isPaidStatus(result.payment?.status) || isPaidStatus(result.invoice?.status);
  const redirectUrl = result.redirectUrl;
  const channel = methodLabel(result.payment?.method || (isCash ? 'cash' : 'midtrans'));
  return (
    <div className={`rounded-xl border p-4 text-sm ${paid
      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200'
      : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200'
      }`}>
      <div className="flex items-start gap-3">
        <AppIcon name={paid ? 'CheckCircle2' : 'Clock3'} size={18} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{paid ? 'Pembayaran diterima' : `Menunggu pembayaran ${channel}`}</p>
          <p className="mt-1 text-xs opacity-80">
            {paid
              ? 'Tagihan sudah lunas dan transaksi tercatat pada riwayat kasir.'
              : result.message || 'Minta pasien menyelesaikan pembayaran, lalu periksa statusnya.'}
          </p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Info label="Invoice" value={result.invoice?.reference || result.payment?.invoice || '-'} />
            <Info label="Status transaksi" value={statusLabel(result.payment?.status || (isCash ? 'paid' : 'pending'))} />
            <Info label="Nominal" value={formatCurrency(result.payment?.amount || invoiceAmount(result.invoice))} />
            <Info label="Kanal pembayaran" value={channel} />
            {!isCash && <Info label="Pemroses" value="Midtrans" />}
            <Info label="Asal transaksi" value={result.payment?.flowSourceLabel || 'Kasir Klinik'} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {paid && readOnly ? (
              <>
                <ResultButton icon="CalendarCheck" label="Buka Kunjungan" onClick={onOpenAppointment} />
                <ResultButton icon="ListChecks" label="Antrean" onClick={onBackToQueue} />
              </>
            ) : paid ? (
              <>
                <ResultButton icon="Printer" label="Cetak Bukti" onClick={onPrintReceipt} />
                <ResultButton icon="CalendarCheck" label="Buka Kunjungan" onClick={onOpenAppointment} />
                <ResultButton icon="ListChecks" label="Selesai" onClick={onBackToQueue} />
              </>
            ) : readOnly ? (
              <>
                <ResultButton icon="RefreshCw" label="Periksa Status" onClick={onRefreshPaymentStatus} />
                <ResultButton icon="ListChecks" label="Antrean" onClick={onBackToQueue} />
              </>
            ) : (
              <>
                <ResultButton
                  icon="ExternalLink"
                  label={result.payment?.method === 'qris' ? 'Tampilkan QRIS' : 'Buka Instruksi'}
                  onClick={() => redirectUrl && window.open(redirectUrl, '_blank', 'noopener,noreferrer')}
                  disabled={!redirectUrl}
                />
                <ResultButton icon="Copy" label="Salin Link" onClick={onCopyPaymentLink} disabled={!redirectUrl} />
                <ResultButton icon="RefreshCw" label="Periksa Status" onClick={onRefreshPaymentStatus} />
                <ResultButton icon="ListChecks" label="Antrean" onClick={onBackToQueue} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultButton = ({ icon, label, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex h-9 items-center gap-2 rounded-lg border border-current/20 bg-white/50 px-3 text-xs font-semibold transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/10 dark:hover:bg-black/20"
  >
    <AppIcon name={icon} size={14} />
    {label}
  </button>
);

const Info = ({ label, value }) => (
  <div>
    <p className="font-medium text-secondary">{label}</p>
    <p className="mt-1 truncate font-semibold text-primary">{value}</p>
  </div>
);

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
  selectedBranchId,
  selectedBranch,
  selectedDentist,
  availableSlots = [],
  slotsLoading = false,
  slotsMessage = ''
}) => {
  const candidatePatients = patientResults
    .filter((patient) => patient.id !== selectedPatient?.id)
    .slice(0, 4);

  return (
    <section className="rounded-lg border border-primary/15 bg-surface-elevated p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-primary">Daftarkan Pasien Walk-in</h4>
          <p className="text-xs text-secondary">Khusus pasien yang datang langsung ke klinik. Cari data lama sebelum membuat pasien baru.</p>
        </div>
        {dentistsLoading && <AppIcon name="Loader2" className="animate-spin text-accent" size={17} />}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <PanelHeading icon="ContactRound" title="Identitas pasien" />
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
                Pasien Baru
              </button>
            </div>
          </Field>

          {selectedPatient && <SelectedPatientCard patient={selectedPatient} />}

          {candidatePatients.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {candidatePatients.map((patient) => (
                <PatientRow key={patient.id} patient={patient} onClick={() => selectPatient(patient)} />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <PanelHeading icon="Stethoscope" title="Detail kunjungan" />
          </div>
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
          <Field label="Jam tersedia">
            <select
              aria-label="Waktu kunjungan"
              value={appointmentForm.time}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, time: event.target.value }))}
              disabled={slotsLoading || !appointmentForm.dentistId || !appointmentForm.date || availableSlots.length === 0}
              className="h-10 w-full cursor-pointer rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              {slotsLoading ? (
                <option value="">Memuat jadwal...</option>
              ) : !appointmentForm.dentistId || !appointmentForm.date ? (
                <option value="">Pilih dokter dan tanggal</option>
              ) : availableSlots.length === 0 ? (
                <option value="">Tidak ada jadwal tersedia</option>
              ) : (
                <>
                  <option value="">Pilih jam</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id || slot.time} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
                </>
              )}
            </select>
            {!slotsLoading && slotsMessage && (
              <p className="text-xs font-normal normal-case text-red-600 dark:text-red-300">{slotsMessage}</p>
            )}
          </Field>
          <Field label="Durasi (Menit)">
            <select
              aria-label="Durasi kunjungan"
              value={appointmentForm.duration}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, duration: Number(event.target.value) }))}
              className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              <option value={15}>15 Menit</option>
              <option value={30}>30 Menit</option>
              <option value={45}>45 Menit</option>
              <option value={60}>60 Menit</option>
              <option value={90}>90 Menit</option>
              <option value={120}>120 Menit</option>
            </select>
          </Field>
          <Field label="Estimasi Tagihan">
            <input
              type="number"
              min="1"
              value={appointmentForm.amount}
              onChange={(event) => setAppointmentForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="150000"
              className="h-10 w-full rounded-lg border border-primary/20 bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </Field>

          <div className="md:col-span-2">
            <PanelHeading icon="ClipboardCheck" title="Periksa sebelum masuk antrean" />
            <div className="mt-2 rounded-xl border border-primary/10 bg-surface p-4">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <Info label="Cabang" value={selectedBranch?.branchName || '-'} />
                <Info label="Dokter" value={selectedDentist ? `${selectedDentist.title || ''} ${selectedDentist.name}`.trim() : '-'} />
                <Info label="Pasien" value={selectedPatient?.name || '-'} />
                <Info label="Jadwal" value={`${appointmentForm.date || '-'} ${appointmentForm.time || ''}`.trim()} />
              </div>
              <button
                type="button"
                onClick={handleCreateAppointment}
                disabled={!selectedPatient || !appointmentForm.dentistId || appointmentLoading}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <AppIcon name={appointmentLoading ? 'Loader2' : 'CalendarPlus'} className={appointmentLoading ? 'animate-spin' : ''} size={16} />
                Masukkan ke Antrean Kasir
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SelectedPatientCard = ({ patient }) => (
  <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pasien terpilih</p>
        <p className="mt-1 truncate text-sm font-semibold text-primary">{patient.name}</p>
        <p className="truncate text-xs text-secondary">{patient.phone || patient.email || patient.id}</p>
      </div>
      <AppIcon name="CheckCircle2" className="text-accent" size={18} />
    </div>
  </div>
);

const PatientRow = ({ patient, selected = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${selected ? 'border-accent bg-accent/10' : 'border-primary/10 bg-surface hover:bg-surface-elevated'
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
  <section className="overflow-hidden rounded-lg border border-primary/15 bg-surface-elevated">
    <div className="border-b border-primary/10 px-6 py-4">
      <h3 className="text-lg font-semibold text-primary">Riwayat Transaksi</h3>
      <p className="text-xs text-secondary">Tunai, QRIS, dan transfer bank dengan asal transaksi yang terpisah.</p>
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">Asal</th>
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
                    <AppIcon name={payment.method === 'cash' ? 'Wallet' : payment.method === 'qris' ? 'QrCode' : 'Landmark'} size={13} />
                    {methodLabel(payment.method)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary">{payment.flowSourceLabel || 'Aplikasi Pasien'}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${paymentStatusClass(payment.status)}`}>
                    {statusLabel(payment.status)}
                  </span>
                  {payment.reconciliationStatus && payment.method !== 'cash' && (
                    <p
                      className={`mt-1 text-[10px] ${
                        payment.reconciliationStatus === 'failed' ? 'text-red-600' : 'text-secondary'
                      }`}
                      title={payment.reconciliationError || undefined}
                    >
                      Rekonsiliasi: {payment.reconciliationStatus}
                      {payment.reconciliationAttempts ? ` · ${payment.reconciliationAttempts}x` : ''}
                    </p>
                  )}
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
      <div className="relative w-full max-w-md rounded-lg border border-primary/15 bg-surface-elevated p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Pasien Walk-in Baru</h3>
            <p className="text-xs text-secondary">Data ini dibuat oleh klinik untuk kunjungan langsung.</p>
          </div>
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
        <button type="button" onClick={onSubmit} disabled={patientLoading} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-50">
          <AppIcon name={patientLoading ? 'Loader2' : 'UserPlus'} className={patientLoading ? 'animate-spin' : ''} size={16} />
          Simpan Pasien
        </button>
      </div>
    </div>
  </ModalPortal>
);

const ConfirmCashModal = ({ invoice, paymentLoading, onClose, onSubmit }) => (
  <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-lg border border-primary/15 bg-surface-elevated p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-100 p-2 text-green-700">
            <AppIcon name="Wallet" size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Uang sudah diterima?</h3>
            <p className="text-sm text-secondary">{formatCurrency(invoiceAmount(invoice))}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-primary/15 text-sm text-primary hover:bg-surface">
            Batal
          </button>
          <button type="button" onClick={onSubmit} disabled={paymentLoading} className="h-10 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-50">
            Ya, Catat Lunas
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);

export default PaymentsView;
