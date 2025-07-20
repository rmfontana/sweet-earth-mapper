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
import { Slider } from '../components/ui/slider';
import { MapPin, Calendar, Camera, Upload, Loader2, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

import { fetchCropTypes } from '../lib/fetchCropTypes';

const DataEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
  const [cropTypes, setCropTypes] = useState<string[]>([]);

  const isAdmin = user?.role === 'admin';


  // AUTH REDIRECT
  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [user, navigate]);

  // FETCH CROP TYPES
  useEffect(() => {
    fetchCropTypes().then(setCropTypes).catch(() => {
      toast({ title: 'Error loading crop types', variant: 'destructive' });
    });
  }, [toast]);

  const sanitizeInput = (input: string) => input.trim().replace(/[<>]/g, '');

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
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
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        const location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, latitude, longitude, location }));
        toast({ title: 'Location captured', description: location });
        setLocationLoading(false);
      },
      (error) => {
        const messages = {
          1: 'Location access denied.',
          2: 'Location unavailable.',
          3: 'Location request timed out.'
        };
        setErrors(prev => ({ ...prev, location: messages[error.code] ?? 'Failed to retrieve location.' }));
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);
    if (validFiles.length + formData.images.length > 3) {
      setErrors(prev => ({ ...prev, images: 'Maximum 3 images allowed' }));
      return;
    }
    setFormData(prev => ({ ...prev, images: [...prev.images, ...validFiles] }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.cropType) newErrors.cropType = 'Crop type is required';
    if (!formData.variety.trim()) newErrors.variety = 'Variety is required';
    if (formData.brixLevel[0] < 0 || formData.brixLevel[0] > 30) newErrors.brixLevel = 'BRIX must be between 0-30';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (new Date(formData.measurementDate) > new Date()) newErrors.measurementDate = 'Date cannot be in the future';
    if (formData.notes.length > 500) newErrors.notes = 'Notes too long (max 500 characters)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return toast({ title: 'Fix errors in form.', variant: 'destructive' });

    setIsLoading(true);
    try {
      const submissionData = {
        ...formData,
        variety: sanitizeInput(formData.variety),
        location: sanitizeInput(formData.location),
        notes: sanitizeInput(formData.notes),
        submittedBy: user?.display_name,
        submittedAt: new Date().toISOString(),
        verified: false
      };
      console.log('Submitting:', submissionData);
      await new Promise(res => setTimeout(res, 2000));
      toast({ title: 'Data submitted successfully' });
      setFormData({ ...formData, cropType: '', variety: '', brixLevel: [12], latitude: 0, longitude: 0, location: '', measurementDate: new Date().toISOString().split('T')[0], notes: '', images: [] });
      navigate('/your-data');
    } catch {
      toast({ title: 'Submission failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Submit BRIX Measurement</h1>
        <p className="text-gray-600 mb-6">Record your bionutrient density measurement from refractometer readings</p>
        <Card>
          <CardHeader><CardTitle className="flex items-center space-x-2"><Upload className="w-5 h-5" />New Measurement Entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Crop Type */}
              <div>
                <Label>Crop Type</Label>
                <Select onValueChange={(v) => setFormData(p => ({ ...p, cropType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                  <SelectContent>
                    {cropTypes.map(crop => <SelectItem key={crop} value={crop}>{crop}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.cropType && <p className="text-red-600 text-sm">{errors.cropType}</p>}
              </div>

              {/* Variety */}
              <div>
                <Label>Variety</Label>
                <Input value={formData.variety} onChange={e => setFormData(p => ({ ...p, variety: e.target.value }))} />
                {errors.variety && <p className="text-red-600 text-sm">{errors.variety}</p>}
              </div>

              {/* BRIX Level */}
              <div>
                <Label>BRIX Level</Label>
                <Slider defaultValue={formData.brixLevel} max={30} step={0.5} onValueChange={(v) => setFormData(p => ({ ...p, brixLevel: v }))} />
                <p className="text-sm text-gray-500">Selected BRIX: {formData.brixLevel[0]}</p>
                {errors.brixLevel && <p className="text-red-600 text-sm">{errors.brixLevel}</p>}
              </div>

              {/* Location */}
              <div>
                <Label>Location</Label>
                <div className="relative">
                  <Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
                  <Button type="button" variant="secondary" size="sm" className="absolute right-1 top-1 rounded-md" onClick={handleLocationCapture} disabled={locationLoading}>
                    {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.location && <p className="text-red-600 text-sm">{errors.location}</p>}
              </div>

              {/* Date */}
              <div>
                <Label>Date</Label>
                <div className="relative">
                  <Input type="date" value={formData.measurementDate} onChange={(e) => setFormData(p => ({ ...p, measurementDate: e.target.value }))} />
                  <Calendar className="w-5 h-5 absolute right-2 top-2 text-gray-500" />
                </div>
                {errors.measurementDate && <p className="text-red-600 text-sm">{errors.measurementDate}</p>}
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
                {errors.notes && <p className="text-red-600 text-sm">{errors.notes}</p>}
              </div>

              {/* Images */}
              <div>
                <Label>Images</Label>
                <Input type="file" multiple accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} className="hidden" id="images" />
                <Button asChild variant="secondary"><label htmlFor="images" className="cursor-pointer flex space-x-2"><Camera className="w-4 h-4" /><span>Upload</span></label></Button>
                <p className="text-sm text-gray-500">{formData.images.length}/3 images</p>
                {errors.images && <p className="text-red-600 text-sm">{errors.images}</p>}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {formData.images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(img)} alt={`img-${i}`} className="w-full h-32 object-cover rounded-md" />
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-white/70" onClick={() => removeImage(i)}><X className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate('/your-data')} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : 'Submit'}
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
