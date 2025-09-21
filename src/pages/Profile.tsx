import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { MapPin, User, Mail, Award, TrendingUp, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LocationSelector from '../components/common/LocationSelector';

const Profile = () => {
  const { user, updateUsername, updateLocation, authError } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [location, setLocation] = useState({
    country: user?.country || '',
    countryCode: '',
    state: user?.state || '',
    stateCode: '',
    city: user?.city || '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState({
    username: false,
    location: false,
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      setDisplayName(user.display_name || '');
      setLocation({
        country: user.country || '',
        countryCode: '',
        state: user.state || '',
        stateCode: '',
        city: user.city || '',
      });
    }
  }, [user, navigate]);

  const validateDisplayName = (name: string) => {
    if (!name.trim()) return 'Display name cannot be empty';
    if (name.length < 3) return 'Display name must be at least 3 characters';
    return null;
  };

  const validateLocation = () => {
    const errors: Record<string, string> = {};
    if (!location.country) errors.country = 'Please select your country';
    if (location.country && !location.state) errors.state = 'Please select your state/province';
    if (location.state && !location.city) errors.city = 'Please select your city';
    return errors;
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validationError = validateDisplayName(displayName);
    if (validationError) {
      setFormErrors({ username: validationError });
      return;
    }
    setLoading(prev => ({ ...prev, username: true }));
    const success = await updateUsername(displayName.trim());
    setLoading(prev => ({ ...prev, username: false }));
    if (success) {
      toast({
        title: 'Profile updated',
        description: 'Your display name was updated successfully.',
      });
    } else {
      setFormErrors({ username: authError || 'Failed to update display name.' });
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const locationErrors = validateLocation();
    if (Object.keys(locationErrors).length > 0) {
      setFormErrors(locationErrors);
      return;
    }
    setLoading(prev => ({ ...prev, location: true }));
    const success = await updateLocation({
      country: location.country,
      state: location.state,
      city: location.city,
    });
    setLoading(prev => ({ ...prev, location: false }));
    if (success) {
      toast({
        title: 'Location updated',
        description: 'Your location was updated successfully.',
      });
    } else {
      setFormErrors({ location: authError || 'Failed to update location.' });
    }
  };

  const handleLocationChange = (newLocation: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
  }) => {
    setLocation(newLocation);
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.country;
      delete newErrors.state;
      delete newErrors.city;
      delete newErrors.location;
      return newErrors;
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" className="mb-4" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your account information and preferences
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Stats Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{user.points ?? '—'}</div>
                  <div className="text-xs text-gray-500">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{user.submission_count ?? '—'}</div>
                  <div className="text-xs text-gray-500">Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 capitalize">{user.role || 'User'}</div>
                  <div className="text-xs text-gray-500">Role</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {user.city || user.state || user.country
                      ? [user.city, user.state, user.country].filter(Boolean).join(', ')
                      : 'Not set'}
                  </div>
                  <div className="text-xs text-gray-500">Location</div>
                </div>
              </div>

              {user.email && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {user.email}
                  </div>
                  {user.last_submission && (
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Last submission: {new Date(user.last_submission).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Name Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Display Name
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                {formErrors.username && (
                  <Alert variant="destructive">
                    <AlertDescription>{formErrors.username}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={displayName}
                    onChange={e => {
                      setDisplayName(e.target.value);
                      if (formErrors.username) {
                        setFormErrors(prev => ({ ...prev, username: '' }));
                      }
                    }}
                    placeholder="Your display name"
                    required
                    className={formErrors.username ? 'border-red-500' : ''}
                    disabled={loading.username}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading.username || displayName === user.display_name}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading.username ? 'Saving...' : 'Update Display Name'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLocationSubmit} className="space-y-4">
                {formErrors.location && (
                  <Alert variant="destructive">
                    <AlertDescription>{formErrors.location}</AlertDescription>
                  </Alert>
                )}
                <div className="text-sm text-gray-600 mb-4">
                  Your location helps us show you relevant agricultural data and connect you with farmers in your area.
                </div>
                <LocationSelector
                  value={location}
                  onChange={handleLocationChange}
                  disabled={loading.location}
                  required={false}
                  showAutoDetect={true}
                />
                {(formErrors.country || formErrors.state || formErrors.city) && (
                  <div className="text-sm text-red-600">
                    {formErrors.country && <p>{formErrors.country}</p>}
                    {formErrors.state && <p>{formErrors.state}</p>}
                    {formErrors.city && <p>{formErrors.city}</p>}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={loading.location || !location.country}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading.location ? 'Saving...' : 'Update Location'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Settings Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-100">
                  <div>
                    <h4 className="font-medium text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Address
                    </h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Button variant="ghost" disabled className="text-gray-400 cursor-not-allowed">
                    Uneditable
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-100">
                  <div>
                    <h4 className="font-medium text-gray-500 flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Password
                    </h4>
                    <p className="text-sm text-gray-500">••••••••</p>
                  </div>
                  <Button variant="ghost" disabled className="text-gray-400 cursor-not-allowed">
                    Uneditable
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h4 className="font-medium text-red-600">Danger Zone</h4>
                    <p className="text-sm text-gray-600">Account deletion is not available at this time</p>
                  </div>
                  <Button variant="destructive" disabled className="opacity-50 cursor-not-allowed">
                    Unavailable
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Badge */}
        {user.role === 'admin' && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Award className="h-6 w-6 text-yellow-600 mr-3" />
                <div>
                  <h3 className="font-medium text-yellow-800">Administrator</h3>
                  <p className="text-sm text-yellow-700">
                    You have administrative privileges on this platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;