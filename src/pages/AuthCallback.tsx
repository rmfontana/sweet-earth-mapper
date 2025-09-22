import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const { handleAuthCallback, authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Check for error in URL params first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          return;
        }

        // Handle the auth callback
        const success = await handleAuthCallback();
        
        if (success) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          // Redirect to the main app after successful verification
          setTimeout(() => {
            navigate('/leaderboard', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage(authError || 'Failed to verify email');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred during verification');
      }
    };

    processCallback();
  }, [handleAuthCallback, authError, navigate, searchParams]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...';
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <span className="text-2xl font-bold text-foreground">BRIX</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-foreground flex flex-col items-center space-y-2">
              {getIcon()}
              <span>{getTitle()}</span>
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {message}
            </p>
          </CardHeader>

          {status === 'error' && (
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Back to Login
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Need a new verification email?
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/register')}
                    className="w-full"
                  >
                    Try Registering Again
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AuthCallback;