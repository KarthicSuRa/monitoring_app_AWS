import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userPool, AuthenticationDetails, CognitoUser } from '../lib/cognitoClient';
import { Icon } from '../components/ui/Icon';

interface CognitoLoginPageProps {
  onLoginSuccess: () => void;
}

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

    const authenticationData = {
      Username: username,
      Password: password,
    };
    const authenticationDetails = new AuthenticationDetails(authenticationData);

    const userData = {
      Username: username,
      Pool: userPool,
    };
    const user = new CognitoUser(userData);
    setCognitoUser(user);

    user.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        console.log('Authentication successful', result);
        setIsLoading(false);
        onLoginSuccess();
        navigate('/');
      },
      onFailure: (err) => {
        console.error('Authentication failed', err);
        setError(err.message || 'An unknown error occurred');
        setIsLoading(false);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        console.log('New password required');
        setIsLoading(false);
        setIsNewPasswordRequired(true);
      },
    });
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (cognitoUser) {
      cognitoUser.completeNewPasswordChallenge(newPassword, null, {
        onSuccess: (result) => {
          console.log('New password set successfully', result);
          setIsLoading(false);
          onLoginSuccess();
          navigate('/');
        },
        onFailure: (err) => {
          console.error('Failed to set new password', err);
          setError(err.message || 'An unknown error occurred');
          setIsLoading(false);
        },
      });
    }
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
          {isNewPasswordRequired ? (
            <>
              <h2 className="text-2xl font-bold text-center text-foreground mb-6">Set New Password</h2>
              <form onSubmit={handleNewPasswordSubmit}>
                <div className="mb-4">
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
                {error && (
                  <div className="bg-destructive/10 text-destructive-foreground text-sm font-semibold p-3 rounded-md mb-4 text-center">
                    {error}
                  </div>
                )}
                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Setting Password...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-center text-foreground mb-6">Welcome Back</h2>
              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label className="block text-muted-foreground text-sm font-bold mb-2" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-background/50 border rounded w-full py-3 px-4 text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-muted-foreground text-sm font-bold" htmlFor="password">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border rounded w-full py-3 px-4 text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive-foreground text-sm font-semibold p-3 rounded-md mb-4 text-center">
                    {error}
                  </div>
                )}
                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
                <div className="text-center mt-6">
                  <Link to="/signup" className="text-sm text-muted-foreground hover:text-primary">
                    Don't have an account? <span className="font-bold">Sign up</span>
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
};
