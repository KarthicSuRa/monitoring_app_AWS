import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { userPool, CognitoUser } from '../lib/cognitoClient';
import { Icon } from '../components/ui/Icon';

interface CognitoConfirmSignUpPageProps {
  onSignUpSuccess: () => void;
}

export const CognitoConfirmSignUpPage: React.FC<CognitoConfirmSignUpPageProps> = ({ onSignUpSuccess }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username;

  const handleVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!username) {
      setError('Username not found. Please sign up again.');
      setIsLoading(false);
      return;
    }

    const userData = {
      Username: username,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
      if (err) {
        console.error('Verification failed', err);
        setError(err.message || 'An unknown error occurred');
        setIsLoading(false);
        return;
      }
      console.log('Verification successful', result);
      setIsLoading(false);
      onSignUpSuccess();
      navigate('/login');
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
          <h2 className="text-2xl font-bold text-center text-foreground mb-6">Verify Your Account</h2>
          <form onSubmit={handleVerification}>
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
            {error && 
                <div className="bg-destructive/10 text-destructive-foreground text-sm font-semibold p-3 rounded-md mb-4 text-center">
                    {error}
                </div>
            }
            <div className="mt-6">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
