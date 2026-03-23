import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userPool, CognitoUser } from '../lib/cognitoClient';
import { Icon } from '../components/ui/Icon';

export const CognitoForgotPasswordPage: React.FC = () => {
  const [stage, setStage] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        setIsLoading(false);
        setSuccess(`A verification code has been sent to ${email}.`);
        setStage('confirm');
      },
      onFailure: (err) => {
        setIsLoading(false);
        setError(err.message || 'An unknown error occurred');
      },
    });
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.confirmPassword(verificationCode, newPassword, {
      onSuccess: () => {
        setIsLoading(false);
        setSuccess('Your password has been successfully reset. Please log in with your new password.');
        setTimeout(() => navigate('/login'), 3000);
      },
      onFailure: (err) => {
        setIsLoading(false);
        setError(err.message || 'An unknown error occurred');
      },
    });
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-background overflow-hidden">
      <div className="absolute top-0 -left-40 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-secondary/10 rounded-full filter blur-3xl opacity-50 animate-pulse animation-delay-2000"></div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
          <div className="text-center mb-10">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <Icon name="mcmLogo" className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h1 className="text-4xl font-bold text-foreground">MCM Alerts</h1>
              </div>
          </div>
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border">
          {stage === 'request' ? (
            <form onSubmit={handleRequestCode}>
              <h2 className="text-2xl font-bold text-center text-foreground mb-6">Reset Password</h2>
              <div className="mb-4">
                <label className="block text-muted-foreground text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border rounded w-full py-3 px-4 text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              {error && <div className="bg-destructive/10 text-destructive-foreground text-sm font-semibold p-3 rounded-md mb-4 text-center">{error}</div>}
              {success && <div className="bg-green-500/10 text-green-500 text-sm font-semibold p-3 rounded-md mb-4 text-center">{success}</div>}
              <div className="mt-6">
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50" disabled={isLoading}>
                  {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset}>
              <h2 className="text-2xl font-bold text-center text-foreground mb-6">Create New Password</h2>
              <div className="mb-4">
                <label className="block text-muted-foreground text-sm font-bold mb-2" htmlFor="verificationCode">
                  Verification Code
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-background/50 border rounded w-full py-3 px-4 text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-muted-foreground text-sm font-bold mb-2" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50 border rounded w-full py-3 px-4 text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              {error && <div className="bg-destructive/10 text-destructive-foreground text-sm font-semibold p-3 rounded-md mb-4 text-center">{error}</div>}
              {success && <div className="bg-green-500/10 text-green-500 text-sm font-semibold p-3 rounded-md mb-4 text-center">{success}</div>}
              <div className="mt-6">
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50" disabled={isLoading}>
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
           <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Back to Login
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
};