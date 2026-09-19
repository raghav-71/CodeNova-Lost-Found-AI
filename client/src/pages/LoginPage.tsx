import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export function LoginPage() {
  const { login, demoLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      showToast({
        type: 'success',
        title: 'Welcome Back',
        message: 'Successfully logged in to FindIt AI.'
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Please check your credentials.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, roleName: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await demoLogin(demoEmail);
      showToast({
        type: 'success',
        title: 'Demo Session Active',
        message: `Logged in as ${roleName}.`
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <img src="/logo.png" alt="FindIt AI" className="w-12 h-12 rounded-full shadow-sm object-cover border border-[#D5ECD9]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
            Log in to FindIt AI
          </h2>
          <p className="text-xs text-[#66756C]">
            Access your campus lost reports, matches, and recovery claims
          </p>
        </div>

        {/* Demo Fast-Login Strip for Evaluation */}
        <div className="rounded-2xl bg-white border border-brand-200 p-4 card-3d">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Instant Evaluation / Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('alex.turner@campus.edu', 'Alex Turner (CS Student)')}
              className="px-3 py-2 rounded-xl text-left bg-[#F7FBF8] hover:bg-[#EEF8F1] border border-[#E3ECE6] hover:border-brand-300 text-[#102018] transition-all text-xs flex flex-col group cursor-pointer"
            >
              <span className="font-bold text-[#102018] text-[11px] truncate group-hover:text-brand-700">Alex Turner</span>
              <span className="text-[10px] text-brand-600 font-medium">Lost MacBook</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('sarah.lin@campus.edu', 'Sarah Lin (Design Student)')}
              className="px-3 py-2 rounded-xl text-left bg-[#F7FBF8] hover:bg-[#EEF8F1] border border-[#E3ECE6] hover:border-brand-300 text-[#102018] transition-all text-xs flex flex-col group cursor-pointer"
            >
              <span className="font-bold text-[#102018] text-[11px] truncate group-hover:text-brand-700">Sarah Lin</span>
              <span className="text-[10px] text-brand-700 font-medium">Found MacBook</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('marcus.vance@campus.edu', 'Marcus Vance (Bio Student)')}
              className="px-3 py-2 rounded-xl text-left bg-[#F7FBF8] hover:bg-[#EEF8F1] border border-[#E3ECE6] hover:border-brand-300 text-[#102018] transition-all text-xs flex flex-col group cursor-pointer"
            >
              <span className="font-bold text-[#102018] text-[11px] truncate group-hover:text-brand-700">Marcus Vance</span>
              <span className="text-[10px] text-amber-600 font-medium">Lost Wallet</span>
            </button>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl bg-white border border-[#E3ECE6] p-6 sm:p-8 card-3d">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                Campus Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student.name@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#102018]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66756C] hover:text-[#102018]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Link */}
          <div className="mt-6 pt-5 border-t border-[#E3ECE6] text-center text-xs text-[#66756C]">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700 transition-colors">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
