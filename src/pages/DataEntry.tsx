
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Slider } from '../components/ui/slider';
import { MapPin, Calendar, Camera, Upload, Loader2, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { cropTypes } from '../data/mockData';

const DataEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Security check - redirect if not authorized
  useEffect(() => {
    if (!user || (!user.isAdmin && user.username !== 'farmerjohn')) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    brixLevel: [12],
    latitude: 0,
    longitude: 0,
    location: '',
    measurementDate: new Date().toISOString().split('T')[0],
    notes: '',
    images: [] as File[]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Input sanitization function
  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  };

  // Validate file uploads
  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, images: 'Only JPEG, PNG, and WebP images are allowed' }));
      return false;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, images: 'File size must be less than 5MB' }));
      return false;
    }

    return true;
  };

  const handleLocationCapture = () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by this browser' }));
      return;
    }

    setLocationLoading(true);
    setErrors(prev => ({ ...prev, location: '' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));

        // Simulate reverse geocoding (in production, use a secure API)
        const mockLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData(prev => ({
          ...prev,
          location: mockLocation
        }));

        setLocationLoading(false);
        toast({
          title: "Location captured",
          description: "Your current location has been recorded.",
        });
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = 'Unable to retrieve your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        setErrors(prev => ({ ...prev, location: errorMessage }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validate each file
    const validFiles = files.filter(validateFile);
    
    if (validFiles.length !== files.length) {
      return; // Error already set by validateFile
    }

    if (formData.images.length + validFiles.length > 3) {
      setErrors(prev => ({ ...prev, images: 'Maximum 3 images allowed' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...validFiles]
    }));

    setErrors(prev => ({ ...prev, images: '' }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.cropType) {
      newErrors.cropType = 'Crop type is required';
    }

    if (!formData.variety.trim()) {
      newErrors.variety = 'Variety is required';
    } else if (formData.variety.length > 50) {
      newErrors.variety = 'Variety name too long (max 50 characters)';
    }

    if (formData.brixLevel[0] < 0 || formData.brixLevel[0] > 30) {
      newErrors.brixLevel = 'BRIX level must be between 0 and 30';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.measurementDate) {
      newErrors.measurementDate = 'Measurement date is required';
    } else {
      const selectedDate = new Date(formData.measurementDate);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.measurementDate = 'Measurement date cannot be in the future';
      }
    }

    if (formData.notes.length > 500) {
      newErrors.notes = 'Notes too long (max 500 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API submission with validation
      const submissionData = {
        ...formData,
        variety: sanitizeInput(formData.variety),
        location: sanitizeInput(formData.location),
        notes: sanitizeInput(formData.notes),
        submittedBy: user?.username,
        submittedAt: new Date().toISOString(),
        verified: false
      };

      // In production, submit to secure backend API
      console.log('Submitting data:', submissionData);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Data submitted successfully!",
        description: "Your BRIX measurement has been recorded.",
      });

      // Reset form
      setFormData({
        cropType: '',
        variety: '',
        brixLevel: [12],
        latitude: 0,
        longitude: 0,
        location: '',
        measurementDate: new Date().toISOString().split('T')[0],
        notes: '',
        images: []
      });

      navigate('/your-data');
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user is not authorized
  if (!user || (!user.isAdmin && user.username !== 'farmerjohn')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit BRIX Measurement
          </h1>
          <p className="text-gray-600">
            Record your bionutrient density measurement from refractometer readings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>New Measurement Entry</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="cropType">Crop Type</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, cropType: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a crop type" />
                  </SelectTrigger>
                  <SelectContent>
                    {cropTypes.map(crop => (
                      <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cropType && (
                  <p className="mt-1 text-sm text-red-600">{errors.cropType}</p>
                )}
              </div>

              <div>
                <Label htmlFor="variety">Variety</Label>
                <Input
                  id="variety"
                  type="text"
                  value={formData.variety}
                  onChange={(e) => setFormData(prev => ({ ...prev, variety: e.target.value }))}
                  placeholder="Enter the crop variety"
                />
                {errors.variety && (
                  <p className="mt-1 text-sm text-red-600">{errors.variety}</p>
                )}
              </div>

              <div>
                <Label>BRIX Level</Label>
                <Slider
                  defaultValue={formData.brixLevel}
                  max={30}
                  step={0.5}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, brixLevel: value }))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Selected BRIX level: {formData.brixLevel[0]}
                </p>
                {errors.brixLevel && (
                  <p className="mt-1 text-sm text-red-600">{errors.brixLevel}</p>
                )}
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter location or capture from map"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={locationLoading}
                    className="absolute right-1 top-1 rounded-md"
                    onClick={handleLocationCapture}
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Capture Location</span>
                      </>
                    )}
                  </Button>
                </div>
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                )}
              </div>

              <div>
                <Label htmlFor="measurementDate">Measurement Date</Label>
                <div className="relative">
                  <Input
                    id="measurementDate"
                    type="date"
                    value={formData.measurementDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, measurementDate: e.target.value }))}
                  />
                  <Calendar className="w-5 h-5 absolute right-2 top-2 text-gray-500" />
                </div>
                {errors.measurementDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.measurementDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any additional notes about the measurement"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
                )}
              </div>

              <div>
                <Label htmlFor="images">Images</Label>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-between">
                  <Button variant="secondary" asChild>
                    <label htmlFor="images" className="flex items-center space-x-2 cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <span>Upload Images</span>
                    </label>
                  </Button>
                  <p className="text-sm text-gray-500">
                    {formData.images.length} images selected (max 3)
                  </p>
                </div>
                {errors.images && (
                  <p className="mt-1 text-sm text-red-600">{errors.images}</p>
                )}

                {formData.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Uploaded image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 bg-white/50 hover:bg-white/80 text-gray-900"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/your-data')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Measurement'
                  )}
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
