import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MailCheck, ArrowLeft } from 'lucide-react';

const VerifyEmailNotice = () => {
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
            <CardTitle className="text-center text-2xl font-bold text-gray-900 flex flex-col items-center space-y-2">
              <MailCheck className="w-12 h-12 text-green-600" />
              <span>Verify Your Email</span>
            </CardTitle>
            <p className="text-center text-sm text-gray-600 mt-4">
              We've sent a confirmation email to your inbox. Please check your email and follow the instructions to activate your account.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-center text-sm text-gray-500">
              Didn’t receive the email? Check your spam folder or{' '}
              <Link to="/resend-confirmation" className="font-medium text-green-600 hover:text-green-500">resend confirmation</Link>.
            </p>

            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailNotice;
