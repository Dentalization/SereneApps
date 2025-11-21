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

  // Handle state from registration redirect
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      // Show success toast if coming from registration
      toast.success('Registrasi berhasil! Silakan login dengan akun Anda.', 6000);
      
      // Clear state to prevent showing toast on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, toast]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      console.log('User after login:', user);
      console.log('User roles for redirect:', user?.roles);
      
      // Show success toast
      toast.success(`Selamat datang kembali, ${user?.name || 'Dokter'}!`, 3000);
      
      const target = redirectByRole(user?.roles || []);
      console.log('Redirect target:', target);
      
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 500);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed';
      const errorCode = err?.response?.data?.code;
      
      // Show error toast
      toast.error(msg, 7000);
      
      // Special handling for unverified dentist
      if (errorCode === 'DENTIST_NOT_VERIFIED') {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Left Side - Modern Hero Section */}
      <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
        {/* Background Image positioned above gradient - no blend mode */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-10"
          style={{
            backgroundImage: 'url(/assets/images/backgroundgambar2.png)',
            backgroundSize: '90%'
          }}
        ></div>

        {/* Modern decorative elements with enhanced visibility */}
        <div className="absolute inset-0 z-20">
          {/* Animated gradient orbs with better contrast */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-cyan-300/30 to-blue-400/30 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-32 right-24 w-24 h-24 bg-gradient-to-br from-purple-300/35 to-pink-400/35 rounded-full blur-lg animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-br from-indigo-300/40 to-blue-500/40 rounded-full blur-md animate-pulse delay-500"></div>
          
          {/* Enhanced geometric patterns */}
          <div className="absolute top-16 right-16 grid grid-cols-4 gap-3 rotate-12">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white/30 rounded-sm transform hover:scale-150 transition-transform duration-500 shadow-lg"></div>
            ))}
          </div>
          
          {/* Enhanced floating lines */}
          <div className="absolute top-1/3 right-1/3 w-20 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent rotate-45 shadow-sm"></div>
          <div className="absolute bottom-1/3 left-1/3 w-16 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45 shadow-sm"></div>
          
          {/* Additional modern elements */}
          <div className="absolute top-1/4 left-1/2 w-1 h-12 bg-gradient-to-b from-white/20 to-transparent"></div>
          <div className="absolute bottom-1/4 right-1/3 w-6 h-6 border border-white/25 rounded-full animate-spin-slow"></div>
        </div>

        {/* Modern welcome content */}
        <div className="relative z-30 flex flex-col justify-center px-16">
          <div className="space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-medium shadow-lg">
              ✨ SereneAI Dental Platform
            </div>
            <h1 className="text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg">
              <span className="bg-gradient-to-r from-white via-blue-50 to-cyan-100 bg-clip-text text-transparent">
                Welcome back,
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-100 via-blue-50 to-white bg-clip-text text-transparent">
                Doctor!
              </span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed font-light max-w-md drop-shadow-md">
              Access your intelligent dental dashboard and revolutionize patient care with AI-powered insights.
            </p>
            
            {/* Enhanced feature highlights */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center text-white/85 hover:text-white transition-colors duration-300">
                <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mr-4 animate-pulse shadow-lg"></div>
                <span className="text-sm font-medium">AI-powered diagnosis assistance</span>
              </div>
              <div className="flex items-center text-white/85 hover:text-white transition-colors duration-300">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mr-4 animate-pulse delay-300 shadow-lg"></div>
                <span className="text-sm font-medium">Smart patient management</span>
              </div>
              <div className="flex items-center text-white/85 hover:text-white transition-colors duration-300">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mr-4 animate-pulse delay-700 shadow-lg"></div>
                <span className="text-sm font-medium">Real-time analytics dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Modern Login Form */}
      <div className="w-full lg:w-[35%] flex items-center justify-center px-8 py-12 relative">
        {/* Advanced glassmorphism dengan multiple layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-slate-50/60 to-blue-50/50 backdrop-blur-2xl"></div>
        
        {/* Floating particles untuk efek dinamis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-300/20 rounded-full animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-300/30 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-blue-300/25 rounded-full animate-float delay-500"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Header yang Lebih Impresif */}
          <div className="text-center mb-10">
            {/* Icon tanpa background dengan ukuran lebih besar */}
            <div className="mb-6">
              <img src="/icon.png" alt="SereneAI" className="w-32 h-32 mx-auto drop-shadow-lg" />
            </div>
            {/* Typography yang lebih bold dengan font-black */}
            <h2 className="text-5xl font-black text-gray-900 mb-3 bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-lg text-gray-500 font-medium mb-1">
              Ready to transform dental care?
            </p>
            <p className="text-sm text-gray-400">
              Sign in to access your AI-powered dashboard
            </p>
            
            {/* Progress indicator yang elegan */}
            <div className="flex items-center justify-center mt-6 space-x-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <div className="w-8 h-0.5 bg-indigo-200 rounded-full"></div>
              <div className="w-2 h-2 bg-indigo-200 rounded-full"></div>
            </div>
          </div>

          {/* Form Card yang Lebih Sophisticated */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] p-8">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Input Fields yang Lebih Interactive - Email */}
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  {/* Icon lebih besar dengan animasi scale */}
                  <Icon name="Mail" size={22} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 group-focus-within:scale-110 transition-all duration-300" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-5 bg-white/80 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                    placeholder="doctor@sereneai.com"
                  />
                  {/* Double border effect dengan focus state */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-focus-within:border-indigo-200 transition-all duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Input Fields yang Lebih Interactive - Password */}
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  {/* Icon lebih besar dengan animasi scale */}
                  <Icon name="Lock" size={22} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 group-focus-within:scale-110 transition-all duration-300" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-5 bg-white/80 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 hover:scale-110 transition-all duration-300"
                  >
                    <Icon name={showPw ? 'EyeOff' : 'Eye'} size={20} />
                  </button>
                  {/* Double border effect dengan focus state */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-focus-within:border-indigo-200 transition-all duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-colors"
                  />
                  <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    Remember me
                  </span>
                </label>
                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl">
                  {error}
                </div>
              )}

              {/* Button yang Lebih Impressive */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-5 px-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white font-semibold rounded-2xl hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl relative overflow-hidden group"
              >
                {/* Shine effect saat hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                {submitting ? (
                  <div className="flex items-center justify-center relative z-10">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  <span className="relative z-10">Sign In to Dashboard</span>
                )}
              </button>
            </form>
          </div>

          {/* Create Account Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              New to SereneAI?{' '}
              <a href="/register" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                Create an Account
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
