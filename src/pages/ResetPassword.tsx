import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { updatePassword, authError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for Supabase password reset parameters
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    // Also check for potential error states
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      toast({
        title: "Invalid reset link",
        description: errorDescription || 'Password reset link is invalid or has expired.',
        variant: "destructive",
      });
      navigate('/forgot-password');
      return;
    }
    
    if (type === 'recovery' && accessToken && refreshToken) {
      // Valid recovery link - allow password reset
      return;
    } else {
      toast({
        title: "Invalid reset link",
        description: 'Invalid or expired password reset link. Please request a new one.',
        variant: "destructive",
      });
      navigate('/forgot-password');
      return;
    }
  }, [searchParams, navigate, toast]);

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];
    if (pass.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pass)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pass)) errors.push('One lowercase letter');
    if (!/\d/.test(pass)) errors.push('One number');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setFormError(`Password must contain: ${passwordErrors.join(', ')}`);
      return;
    }

    setIsLoading(true);
    const success = await updatePassword(password);
    setIsLoading(false);

    if (success) {
      setIsSuccess(true);
      toast({
        title: "Password updated!",
        description: "Your password has been successfully updated",
      });
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else {
      setFormError(authError || 'Failed to update password');
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
                <CheckCircle className="w-12 h-12 text-green-600" />
                <span>Password Updated!</span>
              </CardTitle>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Your password has been successfully updated. You'll be redirected to the login page shortly.
              </p>
            </CardHeader>

            <CardContent>
              <Button asChild className="w-full">
                <Link to="/login">Continue to Login</Link>
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
              Set New Password
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Please enter your new password below.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Enter your new password"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Confirm your new password"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;