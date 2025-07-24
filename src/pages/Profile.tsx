import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';

const Profile = () => {
  const { user, updateUsername, authError } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      // Redirect to login if not logged in
      navigate('/login');
    } else {
      setDisplayName(user.display_name || '');
    }
  }, [user, navigate]);

  const validateDisplayName = (name: string) => {
    if (!name.trim()) return "Display name cannot be empty";
    if (name.length < 3) return "Display name must be at least 3 characters";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const validationError = validateDisplayName(displayName);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsLoading(true);
    const success = await updateUsername(displayName.trim());
    setIsLoading(false);

    if (success) {
      toast({
        title: 'Profile updated',
        description: 'Your display name was updated successfully.',
      });
    } else {
      setFormError(authError || 'Failed to update display name.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-gray-900">
              Your Profile
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  required
                  className={formError ? 'border-red-500' : ''}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
