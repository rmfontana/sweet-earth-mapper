import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LocationSelector from '../components/common/LocationSelector';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

const Register = () => {
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    countryCode: '',
    state: '',
    stateCode: '',
    city: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'basic' | 'location'>('basic');

  const { register, authError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];
    if (pass.length < 6) errors.push('Password must be at least 6 characters');
    if (!/[A-Z]/.test(pass)) errors.push('Password must contain an uppercase letter');
    if (!/[a-z]/.test(pass)) errors.push('Password must contain a lowercase letter');
    if (!/\d/.test(pass)) errors.push('Password must contain a number');
    return errors;
  };

  const validateBasicForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (formData.display_name.trim().length < 2) {
      newErrors.display_name = 'Display name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        newErrors.password = passwordErrors[0];
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLocationForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.country) {
      newErrors.country = 'Please select your country';
    }

    if (!formData.state && formData.countryCode) {
      newErrors.state = 'Please select your state/province';
    }

    if (!formData.city && formData.state) {
      newErrors.city = 'Please select your city';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error too
    if (formErrors.general) {
      setFormErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const handleLocationChange = (location: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      ...location
    }));

    // Clear location-related errors
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.country;
      delete newErrors.state;
      delete newErrors.city;
      return newErrors;
    });
  };

  const handleNextStep = () => {
    if (currentStep === 'basic') {
      if (validateBasicForm()) {
        setCurrentStep('location');
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'location') {
      setCurrentStep('basic');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 'basic') {
      handleNextStep();
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    if (!validateLocationForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const success = await register(
        formData.email.trim(),
        formData.password,
        formData.display_name.trim(),
        {
          country: formData.country,
          state: formData.state,
          city: formData.city
        }
      );

      if (success) {
        // Always show email verification message
        toast({
          title: 'Check Your Email!',
          description: 'We\'ve sent you a verification link. Please check your email and click the link to activate your account before logging in.',
          duration: 8000, // Show longer for this important message
        });
        
        // Reset form and redirect to login
        setFormData({
          display_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          country: '',
          countryCode: '',
          state: '',
          stateCode: '',
          city: '',
        });
        
        navigate('/login');
      } else {
        // Check if it's a 422 error specifically
        const errorMessage = authError?.includes('422') 
          ? 'Account creation failed due to server configuration. Please try again or contact support if the issue persists.'
          : authError || 'Registration failed. Please try again.';
          
        setFormErrors(prev => ({
          ...prev,
          general: errorMessage,
        }));
      }
    } catch (error) {
      console.error('Registration error:', error);
      setFormErrors(prev => ({
        ...prev,
        general: 'An unexpected error occurred. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center space-x-2 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">BRIX</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-gray-900">
              Create your account
            </CardTitle>
            <p className="text-center text-sm text-gray-600">
              {currentStep === 'basic' 
                ? 'Join the BRIX community and start contributing to agricultural knowledge.'
                : 'Tell us where you\'re located to personalize your experience.'
              }
            </p>
            
            {/* Step indicator */}
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'basic' ? 'bg-green-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  1
                </div>
                <div className={`w-12 h-0.5 ${currentStep === 'location' ? 'bg-green-600' : 'bg-gray-300'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'location' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  2
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formErrors.general && (
                <Alert variant="destructive">
                  <AlertDescription>{formErrors.general}</AlertDescription>
                </Alert>
              )}

              {currentStep === 'basic' ? (
                <>
                  {/* Display name */}
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="display_name"
                        name="display_name"
                        type="text"
                        value={formData.display_name}
                        onChange={handleInputChange}
                        required
                        className={`pl-10 ${formErrors.display_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="Choose a display name"
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.display_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.display_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`pl-10 ${formErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="Enter your email address"
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 ${formErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="Create a password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                      </button>
                    </div>
                     {formErrors.password && (
                       <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                     )}
                     
                     {formData.password && (
                       <div className="mt-3">
                         <PasswordStrengthIndicator password={formData.password} />
                       </div>
                     )}
                   </div>

                  {/* Confirm password */}
                  <div>
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 ${formErrors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Terms */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => {
                        setAgreedToTerms(!!checked);
                        if (formErrors.terms) {
                          setFormErrors(prev => ({ ...prev, terms: '' }));
                        }
                      }}
                      disabled={isLoading}
                      className={formErrors.terms ? 'border-red-300' : ''}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="terms" className="text-sm text-gray-600 leading-normal">
                        I agree to the{' '}
                        <Link to="/terms" className="text-green-600 hover:text-green-500 underline">
                          Terms and Conditions
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-green-600 hover:text-green-500 underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                  </div>
                  {formErrors.terms && (
                    <p className="text-sm text-red-600">{formErrors.terms}</p>
                  )}
                </>
              ) : (
                /* Location Step */
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Where are you located?</h3>
                    <p className="text-sm text-gray-600">
                      This helps us show you relevant brix data to show you bionutrient scores near you.
                    </p>
                  </div>

                  <LocationSelector
                    value={{
                      country: formData.country,
                      countryCode: formData.countryCode,
                      state: formData.state,
                      stateCode: formData.stateCode,
                      city: formData.city,
                    }}
                    onChange={handleLocationChange}
                    disabled={isLoading}
                    required={true}
                    showAutoDetect={true}
                  />

                  {(formErrors.country || formErrors.state || formErrors.city) && (
                    <div className="text-sm text-red-600">
                      {formErrors.country && <p>{formErrors.country}</p>}
                      {formErrors.state && <p>{formErrors.state}</p>}
                      {formErrors.city && <p>{formErrors.city}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex space-x-4">
                {currentStep === 'location' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentStep === 'location' ? 'flex-1' : 'w-full'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : currentStep === 'basic' ? (
                    'Next: Location'
                  ) : (
                    'Create account'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;