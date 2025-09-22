import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { resetPassword, authError } = useAuth();
  const { toast } = useToast();

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const success = await resetPassword(email.trim());
    setIsLoading(false);

    if (success) {
      setIsSuccess(true);
      toast({
        title: "Reset link sent!",
        description: "Check your email for password reset instructions",
      });
    } else {
      toast({
        title: "Error",
        description: authError || "Failed to send reset email",
        variant: "destructive",
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link to="/" className="flex justify-center items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-foreground">BRIX</span>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold text-foreground flex flex-col items-center space-y-2">
                <Mail className="w-12 h-12 text-green-600" />
                <span>Check Your Email</span>
              </CardTitle>
              <p className="text-center text-sm text-muted-foreground mt-4">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder.
              </p>

              <Button asChild className="w-full">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center space-x-2 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <span className="text-2xl font-bold text-foreground">BRIX</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-foreground">
              Reset Your Password
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your email address"
                    maxLength={100}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
