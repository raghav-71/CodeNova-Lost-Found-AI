import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Sparkles, Mail, Lock, User, Building, Phone, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [campus, setCampus] = useState('Central Campus • Student');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, campus, phone.trim() || undefined);
      showToast({
        type: 'success',
        title: 'Account Created',
        message: 'Welcome to FindIt AI!'
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-3.5 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <img src="/logo.png" alt="FindIt AI" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-sm object-cover border border-[#D5ECD9]" />
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
            Create Your Account
          </h2>
          <p className="text-xs text-[#66756C]">
            Join the FindIt AI intelligent campus network to report and recover items
          </p>
        </div>

        {/* Registration Card */}
        <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-8 card-3d">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                Campus Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campus / Department Affiliation */}
            <div>
              <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                Campus / Faculty Affiliation
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                <select
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                >
                  <option value="Central Campus • Student">Central Campus • Undergraduate</option>
                  <option value="North Campus • Computer Science">North Campus • Computer Science & Engineering</option>
                  <option value="East Campus • Biomedical Sciences">East Campus • Medicine & Bio Sciences</option>
                  <option value="West Campus • Business & Law">West Campus • Business & Law</option>
                  <option value="South Campus • Design & Arts">South Campus • Design & Architecture</option>
                  <option value="Campus Faculty / Staff">Campus Faculty / Staff</option>
                </select>
              </div>
            </div>

            {/* Phone (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                Contact Phone (Optional - kept private)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="flex items-center gap-2 text-[11px] text-[#66756C] bg-[#EEF8F1] p-3 rounded-xl border border-brand-200">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
              <span>Contact details are never published publicly. Protected under campus safety guidelines.</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 btn-primary flex items-center justify-center gap-2 py-3 sm:py-2.5 touch-target"
            >
              {isLoading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E3ECE6] text-center text-xs text-[#66756C]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 transition-colors">
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
