import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.password || form.password.length < 8) errs.password = 'Minimum 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      errs.password = 'Must include upper, lower, and a number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.data.user, data.data.token);
      toast.success('Account created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,92,252,0.4)]">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <span className="font-display text-2xl font-bold text-white tracking-tight">NeuralQ</span>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-white mb-1">Create account</h1>
            <p className="text-gray-500 text-sm">Start processing AI tasks at scale</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="Ada Lovelace" autoComplete="name"
                  className={clsx('input-field pl-10', errors.name && 'border-red-500/50')} />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@company.com" autoComplete="email"
                  className={clsx('input-field pl-10', errors.email && 'border-red-500/50')} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type={showPass ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder="Min 8 characters" autoComplete="new-password"
                  className={clsx('input-field pl-10 pr-10', errors.password && 'border-red-500/50')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={clsx('h-1 flex-1 rounded-full transition-all duration-300',
                      i <= strength ? strengthColors[strength] : 'bg-white/10')} />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">{strengthLabels[strength]}</span>
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">Create account <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-light hover:text-white transition-colors font-medium">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
