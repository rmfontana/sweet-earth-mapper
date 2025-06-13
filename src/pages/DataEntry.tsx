
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Plus, MapPin, Calendar, Beaker } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const DataEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    brixLevel: '',
    latitude: '',
    longitude: '',
    measurementDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check if user has citizen scientist role
  const isCitizenScientist = user?.isAdmin || user?.username === 'farmerjohn'; // Mock role check

  if (!isCitizenScientist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <Beaker className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600 mb-6">
                Only users with Citizen Scientist role can access the data entry form.
              </p>
              <Button onClick={() => navigate('/map')}>
                Return to Map
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
          toast({
            title: "Location captured",
            description: "Current coordinates have been added to the form.",
          });
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Unable to get current location. Please enter coordinates manually.",
            variant: "destructive"
          });
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.cropType || !formData.brixLevel || !formData.latitude || !formData.longitude) {
        setError('Please fill in all required fields.');
        return;
      }

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Data submitted successfully!",
        description: "Your BRIX measurement has been added to the database.",
      });
      
      navigate('/map');
    } catch (err) {
      setError('Failed to submit data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit BRIX Measurement
          </h1>
          <p className="text-gray-600">
            Add a new bionutrient density measurement from your refractometer reading
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>New Measurement Entry</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Crop Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="cropType" className="required">Crop Type *</Label>
                  <Input
                    id="cropType"
                    name="cropType"
                    value={formData.cropType}
                    onChange={handleInputChange}
                    placeholder="e.g., Tomato, Carrot, Apple"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="variety">Variety (optional)</Label>
                  <Input
                    id="variety"
                    name="variety"
                    value={formData.variety}
                    onChange={handleInputChange}
                    placeholder="e.g., Cherry, Heirloom, Gala"
                  />
                </div>
              </div>

              {/* BRIX Measurement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="brixLevel" className="required flex items-center space-x-2">
                    <Beaker className="w-4 h-4" />
                    <span>BRIX Reading *</span>
                  </Label>
                  <Input
                    id="brixLevel"
                    name="brixLevel"
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={formData.brixLevel}
                    onChange={handleInputChange}
                    placeholder="0.0"
                    required
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Enter the refractometer reading (0-30 range)
                  </p>
                </div>

                <div>
                  <Label htmlFor="measurementDate" className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Measurement Date</span>
                  </Label>
                  <Input
                    id="measurementDate"
                    name="measurementDate"
                    type="date"
                    value={formData.measurementDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label className="flex items-center space-x-2 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>Location *</span>
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="latitude" className="text-sm">Latitude *</Label>
                    <Input
                      id="latitude"
                      name="latitude"
                      type="number"
                      step="0.000001"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="40.7128"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="longitude" className="text-sm">Longitude *</Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      type="number"
                      step="0.000001"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="-74.0060"
                      required
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      className="w-full"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any additional information about the sample, growing conditions, or measurement context..."
                  rows={4}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Measurement'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/map')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataEntry;
