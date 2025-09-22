import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  className = '' 
}) => {
  const requirements = [
    { label: 'At least 6 characters', test: (pass: string) => pass.length >= 6 },
    { label: 'One uppercase letter', test: (pass: string) => /[A-Z]/.test(pass) },
    { label: 'One lowercase letter', test: (pass: string) => /[a-z]/.test(pass) },
    { label: 'One number', test: (pass: string) => /\d/.test(pass) },
  ];

  const getStrengthColor = () => {
    const passedCount = requirements.filter(req => req.test(password)).length;
    if (passedCount === 0) return 'text-muted-foreground';
    if (passedCount <= 2) return 'text-destructive';
    if (passedCount === 3) return 'text-orange-500';
    return 'text-green-600';
  };

  const getStrengthText = () => {
    const passedCount = requirements.filter(req => req.test(password)).length;
    if (passedCount === 0) return 'Enter a password';
    if (passedCount <= 2) return 'Weak password';
    if (passedCount === 3) return 'Good password';
    return 'Strong password';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className={`text-sm font-medium ${getStrengthColor()}`}>
        {getStrengthText()}
      </div>
      <div className="space-y-1">
        {requirements.map((requirement, index) => {
          const passed = requirement.test(password);
          return (
            <div key={index} className="flex items-center space-x-2 text-sm">
              {passed ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={passed ? 'text-green-600' : 'text-muted-foreground'}>
                {requirement.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};