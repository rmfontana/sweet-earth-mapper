import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { getSupabaseUrl } from "@/lib/utils.ts";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    setMessage('');
    setError('');
  
    const supabaseUrl = await getSupabaseUrl();
  
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${supabaseUrl}/reset-password`,
    });
    
    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a password reset link.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
      <Input
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button onClick={handleReset} className="mt-4">Send Reset Link</Button>
      {message && <p className="text-green-600 mt-2">{message}</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
