import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userPool, AuthenticationDetails, CognitoUser } from '../lib/cognitoClient';

interface CognitoLoginPageProps {
  onLoginSuccess: () => void;
}

const FormField: React.FC<{
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rightSlot?: React.ReactNode;
}> = ({ id, label, type, value, onChange, placeholder, required, rightSlot }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">{label}</label>
      {rightSlot}
    </div>
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete={type === 'password' ? 'current-password' : 'username'}
      className="w-full bg-slate-900/60 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none transition-all"
    />
  </div>
);

export const CognitoLoginPage: React.FC<CognitoLoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const user = new CognitoUser({ Username: username, Pool: userPool });
    setCognitoUser(user);

    user.authenticateUser(new AuthenticationDetails({ Username: username, Password: password }), {
      onSuccess: () => { setIsLoading(false); onLoginSuccess(); navigate('/'); },
      onFailure: (err) => { setError(err.message || 'Authentication failed'); setIsLoading(false); },
      newPasswordRequired: () => { setIsLoading(false); setIsNewPasswordRequired(true); },
    });
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    cognitoUser?.completeNewPasswordChallenge(newPassword, null, {
      onSuccess: () => { setIsLoading(false); onLoginSuccess(); navigate('/'); },
      onFailure: (err) => { setError(err.message || 'Failed to set password'); setIsLoading(false); },
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
          {isNewPasswordRequired ? (
            <>
              <h1 className="text-2xl font-bold text-white">Set new password</h1>
              <p className="text-slate-400 text-sm mt-1">You must set a new password to continue.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-slate-400 text-sm mt-1">
                Don't have an account?{' '}
                <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
          {isNewPasswordRequired ? (
            <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
              <FormField
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password"
                required
              />
              {error && (
                <div className="flex items-start gap-2.5 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
                  <span className="text-base leading-none mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/25 text-sm mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : 'Set New Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <FormField
                id="username"
                label="Email / Username"
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="you@company.com"
                required
              />
              <FormField
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Your password"
                required
                rightSlot={
                  <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Forgot password?
                  </Link>
                }
              />
              {error && (
                <div className="flex items-start gap-2.5 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
                  <span className="text-base leading-none mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/25 text-sm mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          )}
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
