import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { Eye, EyeOff, ArrowLeft, Key, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

const ResetPasswordOTP = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { resetPasswordWithOTP, authError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    // Get email from URL parameters if available
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [isAuthenticated, navigate, searchParams]);

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];
    if (pass.length < 6) errors.push('Password must be at least 6 characters');
    if (!/[A-Z]/.test(pass)) errors.push('Password must contain an uppercase letter');
    if (!/[a-z]/.test(pass)) errors.push('Password must contain a lowercase letter');
    if (!/\d/.test(pass)) errors.push('Password must contain a number');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!otp.trim()) {
      newErrors.otp = 'Reset code is required';
    } else if (otp.length !== 6) {
      newErrors.otp = 'Reset code must be 6 digits';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        newErrors.password = passwordErrors[0];
      }
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    
    try {
      const success = await resetPasswordWithOTP(email.trim(), otp.trim(), password);
      
      if (success) {
        toast({
          title: "Password reset successful!",
          description: "Your password has been updated. You can now log in with your new password.",
        });
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setFormErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);
    
    // Clear specific field error
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

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
              Enter Reset Code
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-digit code sent to your email and create a new password.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {(formErrors.general || authError) && (
                <Alert variant="destructive">
                  <AlertDescription>{formErrors.general || authError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="mt-1 relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={formErrors.email ? 'border-destructive' : ''}
                    placeholder="Enter your email address"
                    required
                    disabled={isLoading}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1 text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="otp">Reset Code</Label>
                <div className="mt-1 flex justify-center">
                  <InputOTP 
                    value={otp} 
                    onChange={setOtp}
                    maxLength={6}
                    pattern="[0-9]*"
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      {[...Array(6)].map((_, index) => (
                        <InputOTPSlot 
                          key={index} 
                          index={index}
                          className={formErrors.otp ? 'border-destructive' : ''}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {formErrors.otp && (
                  <p className="mt-1 text-sm text-destructive text-center">{formErrors.otp}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground text-center">
                  Check your email for the 6-digit reset code
                </p>
              </div>

              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 ${formErrors.password ? 'border-destructive' : ''}`}
                    placeholder="Enter new password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-destructive">{formErrors.password}</p>
                )}
                
                {password && (
                  <div className="mt-3">
                    <PasswordStrengthIndicator password={password} />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`pl-10 pr-10 ${formErrors.confirmPassword ? 'border-destructive' : ''}`}
                    placeholder="Confirm new password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-destructive">{formErrors.confirmPassword}</p>
                )}
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
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back to Reset Password
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordOTP;