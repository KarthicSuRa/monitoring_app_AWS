import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userPool } from '../lib/cognitoClient';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';

// ─── Shared UI atoms ──────────────────────────────────────────────────────

const FormField: React.FC<{
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}> = ({ id, label, type, value, onChange, placeholder, required, hint }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'off'}
      className="w-full bg-slate-900/60 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none transition-all"
    />
    {hint && <p className="mt-1.5 text-xs text-slate-600">{hint}</p>}
  </div>
);

// ─── Password strength indicator ──────────────────────────────────────────

const getStrength = (pwd: string) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
const STRENGTH_TEXT   = ['', 'text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400'];

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const s = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= s ? STRENGTH_COLORS[s] : 'bg-slate-800'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${STRENGTH_TEXT[s]}`}>{STRENGTH_LABELS[s]}</p>
    </div>
  );
};

// ─── Sign Up Page ─────────────────────────────────────────────────────────

export const CognitoSignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name',  Value: fullName }),
    ];

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      setIsLoading(false);
      if (err) { setError(err.message); return; }
      if (result) navigate('/confirm-signup', { state: { username: email } });
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-base">M</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MCM Alerts</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">
            Already have one?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSignUp} className="space-y-4">
            <FormField
              id="fullName"
              label="Full Name"
              type="text"
              value={fullName}
              onChange={setFullName}
              placeholder="Jane Smith"
              required
            />

            <FormField
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="jane@company.com"
              required
            />

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
                className="w-full bg-slate-900/60 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none transition-all"
              />
              <PasswordStrength password={password} />
              <p className="mt-1.5 text-xs text-slate-600">Use 8+ chars, uppercase, number, and a symbol.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
                <span className="text-base leading-none mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/25 text-sm mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-5">
            By creating an account you agree to our{' '}
            <span className="text-slate-500">Terms of Service</span>.
          </p>
        </div>

        {/* Back link */}
        <p className="text-center mt-5">
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
};
