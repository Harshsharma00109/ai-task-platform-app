import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.data.user, data.data.token);
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,92,252,0.4)]">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <span className="font-display text-2xl font-bold text-white tracking-tight">NeuralQ</span>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-white mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm">Access your AI task workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@company.com" autoComplete="email"
                  className={clsx('input-field pl-10', errors.email && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type={showPass ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder="••••••••" autoComplete="current-password"
                  className={clsx('input-field pl-10 pr-10', errors.password && 'border-red-500/50')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-light hover:text-white transition-colors font-medium">
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
