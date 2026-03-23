import React, { useState } from 'react';
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js';
import { userPool } from '../lib/cognitoClient';

interface CognitoConfirmPageProps {
  username: string;
  onConfirmationSuccess: () => void;
  onNavigate: (page: 'login') => void;
}

export const CognitoConfirmPage: React.FC<CognitoConfirmPageProps> = ({ username, onConfirmationSuccess, onNavigate }) => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
      setIsLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      console.log('Confirmation result:', result);
      onConfirmationSuccess();
    });
  };

  const handleResendCode = () => {
    setError(null);
    setResendStatus('sending');
    const userData = {
      Username: username,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        setError(err.message);
        setResendStatus('error');
        return;
      }
      setResendStatus('sent');
      setTimeout(() => setResendStatus(null), 5000);
    });
  };

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Confirm Your Account</h1>
            <p className="text-balance text-muted-foreground">
              We've sent a confirmation code to your email. Please enter it below.
            </p>
          </div>
          <form onSubmit={handleConfirmation} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="confirmationCode">Confirmation Code</label>
              <input
                id="confirmationCode"
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
                className="input input-bordered"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
              {isLoading ? 'Confirming...' : 'Confirm Account'}
            </button>
          </form>
          <div className="text-center mt-4">
            <button onClick={handleResendCode} className="text-sm text-muted-foreground hover:text-primary" disabled={resendStatus === 'sending' || resendStatus === 'sent'}>
              {resendStatus === 'sending' ? 'Sending...' : resendStatus === 'sent' ? 'Code Sent!' : 'Resend Code'}
            </button>
          </div>
          <div className="text-center mt-2">
              <button onClick={() => onNavigate('login')} className="text-sm text-muted-foreground hover:text-primary">
                  Back to Log in
              </button>
          </div>
        </div>
      </div>
       <div className="hidden bg-muted lg:block">
            <img
                src="/img/hero-image.svg"
                alt="MCM Alerts"
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        </div>
    </div>
  );
};
