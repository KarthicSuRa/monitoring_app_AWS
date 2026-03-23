import React, { useState } from 'react';
import { userPool } from '../lib/cognitoClient';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { Link, useNavigate } from 'react-router-dom';

export const CognitoSignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
        <div className="flex items-center justify-center py-12">
            <div className="mx-auto grid w-[350px] gap-6">
                <div className="grid gap-2 text-center">
                    <h1 className="text-3xl font-bold">Sign Up</h1>
                    <p className="text-balance text-muted-foreground">Create your account to get started</p>
                </div>
                <form onSubmit={handleSignUp} className="grid gap-4">
                    <div className="grid gap-2">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input input-bordered" />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input input-bordered" />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                        {isLoading ? 'Signing Up...' : 'Sign Up'}
                    </button>
                </form>
                <div className="text-center mt-4">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                        Already have an account? <span className="font-bold">Log in</span>
                    </Link>
                </div>
				<div className="text-center mt-6">
					<Link to="/" className="text-sm text-muted-foreground hover:text-primary">
						Back to Landing Page
					</Link>
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
