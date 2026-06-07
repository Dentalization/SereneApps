import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import { useToast } from 'contexts/ToastContext';
import { redirectByRole } from 'utils/auth/redirectByRole';
import Icon from '../../components/AppIcon';

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Handle state from registration redirect
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      toast.success('Registration successful! Please log in.', 6000);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, toast]);

  // Handle forced logout reason from sessionStorage
  useEffect(() => {
    try {
      const reason = sessionStorage.getItem('auth.logout_reason');
      if (reason) {
        toast.error(reason, 6000);
        sessionStorage.removeItem('auth.logout_reason');
      }
    } catch (err) {
      // Ignore storage failures
    }
  }, [toast]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      toast.success(`Welcome back, ${user?.name || 'Doctor'}!`, 3000);
      const target = redirectByRole(user);

      setTimeout(() => {
        navigate(target, { replace: true });
      }, 500);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed';
      toast.error(msg, 7000);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* --- CSS Keyframes --- */}
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(3deg); } }
        @keyframes float-reverse { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(15px) rotate(-2deg); } }
        @keyframes glow-pulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        @keyframes scan-line { 0% { top: -2px; } 100% { top: 100%; } }
        @keyframes dash-flow { to { stroke-dashoffset: -100; } }
        @keyframes fade-up { 0% { opacity: 0; transform: translateY(24px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .anim-float { animation: float 8s ease-in-out infinite; }
        .anim-float-rev { animation: float-reverse 7s ease-in-out infinite; }
        .anim-glow { animation: glow-pulse 4s ease-in-out infinite; }
        .anim-scan { animation: scan-line 3s linear infinite; }
        .anim-dash { animation: dash-flow 8s linear infinite; }
        .anim-fade-up { animation: fade-up 0.7s ease-out both; }
      `}</style>

      {/* ============================== LEFT HERO ============================== */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden bg-slate-950">
        {/* Background Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: 'url("/assets/images/backgroundgambar.png")' }}
        />

        {/* Multi-Layer Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-teal-950/80 to-cyan-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Tech Grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(20,184,166,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating Orbs */}
        <div className="absolute top-16 right-16 w-80 h-80 rounded-full bg-teal-500/8 blur-[100px] anim-float" />
        <div className="absolute bottom-24 left-16 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] anim-float-rev" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-teal-400/5 blur-[80px] anim-glow" />

        {/* Decorative SVG Circuit Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(45,212,191,0)" />
              <stop offset="50%" stopColor="rgba(45,212,191,0.3)" />
              <stop offset="100%" stopColor="rgba(45,212,191,0)" />
            </linearGradient>
          </defs>
          <path d="M0,200 Q150,180 300,250 T600,200" fill="none" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="8 6" className="anim-dash" />
          <path d="M0,400 Q200,350 400,420 T800,380" fill="none" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="8 6" className="anim-dash" style={{ animationDelay: '2s' }} />
          <path d="M100,600 Q300,550 500,620 T900,580" fill="none" stroke="url(#lineGrad)" strokeWidth="0.5" strokeDasharray="6 8" className="anim-dash" style={{ animationDelay: '4s' }} />
        </svg>

        {/* Scan Line Effect */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/20 to-transparent anim-scan" />

        {/* Floating Nodes */}
        <div className="absolute top-[20%] right-[18%] flex flex-col items-center gap-1 anim-float" style={{ animationDelay: '1s' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]" />
          <div className="w-px h-16 bg-gradient-to-b from-teal-400/40 to-transparent" />
        </div>
        <div className="absolute bottom-[30%] right-[35%] flex flex-row items-center gap-1 anim-float-rev" style={{ animationDelay: '3s' }}>
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          <div className="h-px w-20 bg-gradient-to-r from-cyan-400/40 to-transparent" />
        </div>
        <div className="absolute top-[55%] right-[12%] anim-glow" style={{ animationDelay: '2s' }}>
          <div className="w-3 h-3 rounded-full border border-teal-400/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="relative z-30 flex flex-col justify-center px-16 xl:px-20 w-full">
          <div
            className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-300 text-xs font-semibold tracking-widest uppercase mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
              </span>
              Secure Clinical Portal
            </div>

            {/* Headline */}
            <h1 className="text-[3.25rem] xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-8">
              Precision in{' '}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-200">
                  Dental Diagnosis
                </span>
                <span className="absolute -bottom-1.5 left-0 right-0 h-px bg-gradient-to-r from-teal-400/60 via-cyan-400/40 to-transparent" />
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-lg font-light">
              Access the SereneAI dashboard to manage patient records, view AI-assisted diagnostics, and streamline your clinical workflow.
            </p>

            {/* Glassmorphism Stats Card */}
            <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 max-w-lg">
              <div className="grid grid-cols-3 gap-4">
                {/* Stat 1 */}
                <div className="text-center px-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Icon name="Activity" size={14} className="text-teal-400" />
                    <span className="text-2xl font-bold text-white">99.8%</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Uptime</span>
                </div>
                {/* Stat 2 */}
                <div className="text-center px-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Icon name="Shield" size={14} className="text-cyan-400" />
                    <span className="text-2xl font-bold text-white">HIPAA</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Compliant</span>
                </div>
                {/* Stat 3 */}
                <div className="text-center px-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Icon name="Zap" size={14} className="text-yellow-400" />
                    <span className="text-2xl font-bold text-white">0.3s</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">AI Speed</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex items-center gap-5 text-slate-600 text-xs">
              <div className="flex items-center gap-1.5">
                <Icon name="Lock" size={12} className="text-teal-500/60" />
                <span>256-bit Encrypted</span>
              </div>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <Icon name="Globe" size={12} className="text-teal-500/60" />
                <span>SOC 2 Certified</span>
              </div>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <Icon name="Clock" size={12} className="text-teal-500/60" />
                <span>24/7 Monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* ============================== RIGHT FORM ============================== */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 sm:p-8 relative bg-white overflow-hidden">
        {/* Decorative Corner Glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-teal-100/40 via-cyan-50/20 to-transparent rounded-full pointer-events-none blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-teal-50/30 to-transparent rounded-full pointer-events-none blur-xl" />

        {/* Subtle Grid on Form Side */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div
          className={`w-full max-w-[420px] relative z-10 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Brand Header */}
          <div className="mb-10 text-center">
            <div className="mb-5 relative inline-block">
              <img src="/icon.png" alt="SereneAI" className="w-32 h-32 object-contain relative" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 mt-2.5 text-[15px]">
              Sign in to access your clinical portal
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 ml-0.5">
                Professional Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon name="Mail" size={18} className="text-slate-400 group-focus-within:text-teal-600 transition-colors duration-200" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all duration-200 hover:border-slate-300"
                  placeholder="dr.name@clinic.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-0.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <a href="#" className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon name="Lock" size={18} className="text-slate-400 group-focus-within:text-teal-600 transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-11 pr-12 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all duration-200 hover:border-slate-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icon name={showPw ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center ml-0.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2.5 block text-sm text-slate-600 cursor-pointer select-none">
                Keep me logged in for 30 days
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <Icon name="AlertCircle" size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-semibold">Authentication Failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="relative w-full flex items-center justify-center py-4 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white text-base font-semibold rounded-xl shadow-lg shadow-teal-600/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-teal-600/35 hover:shadow-xl active:scale-[0.99] overflow-hidden group"
            >
              {/* Shimmer Overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
              </div>
              <span className="relative flex items-center gap-2">
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Access Dashboard
                    <Icon name="ArrowRight" size={18} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">New here?</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>

          {/* Register CTA */}
          <a
            href="/register"
            className="w-full flex items-center justify-center py-3.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-teal-200 text-slate-700 text-sm font-semibold rounded-xl transition-all duration-200 group"
          >
            Register Your Practice
            <Icon name="ArrowUpRight" size={16} className="ml-1.5 text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </a>

          {/* Footer Links */}
          <div className="mt-8 flex justify-center gap-6 text-xs text-slate-400">
            <a href="#" className="hover:text-teal-600 transition-colors">Privacy Policy</a>
            <span className="text-slate-200">|</span>
            <a href="#" className="hover:text-teal-600 transition-colors">Terms of Service</a>
            <span className="text-slate-200">|</span>
            <a href="#" className="hover:text-teal-600 transition-colors">Help Center</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
