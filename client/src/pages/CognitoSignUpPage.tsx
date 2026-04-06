import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userPool } from '../lib/cognitoClient';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { Icon } from '../components/ui/Icon';

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
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
      new CognitoUserAttribute({
        Name: 'name',
        Value: fullName,
      }),
    ];

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      setIsLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (result) {
        navigate('/confirm-signup', { state: { username: email } });
      }
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
            <h1 className="text-4xl font-bold text-foreground">Create your Account</h1>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border">
          <form onSubmit={handleSignUp}>
            <div className="mb-4">
              <label className="block text-muted-foreground text-sm font-bold mb-2" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-background/50 border rounded w-full py-3 px-4 text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
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
            <div className="mb-4">
              <label className="block text-muted-foreground text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                Already have an account? <span className="font-bold">Log in</span>
              </Link>
            </div>
          </form>
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
