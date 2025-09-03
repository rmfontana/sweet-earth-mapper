import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  MapPin,
  Upload,
  Loader2,
  X,
  Calendar,
  Package,
  Store,
  Droplets,
  Camera,
  Clock,
  FileText,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { getSupabaseUrl, getPublishableKey } from '@/lib/utils';
import Combobox from '../components/ui/combo-box';
import LocationSearch from '../components/common/LocationSearch';
import { useStaticData } from '../hooks/useStaticData'; // Updated import

const DataEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use the shared static data hook
  const { crops, brands, locations, isLoading: staticDataLoading, error: staticDataError } = useStaticData();

  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    brixLevel: 12,
    latitude: 0,
    longitude: 0,
    location: '',
    measurementDate: new Date().toISOString().split('T')[0],
    purchaseDate: '',
    outlierNotes: '',
    brand: '',
    store: '',
    images: [] as File[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authorized
  useEffect(() => {
    if (!user || (user.role !== 'contributor' && user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, navigate]);

  // Show static data errors
  useEffect(() => {
    if (staticDataError) {
      toast({ 
        title: 'Error loading form options', 
        description: staticDataError, 
        variant: 'destructive' 
      });
    }
  }, [staticDataError, toast]);

  // Centralized input change handler
  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBrixNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > 100) value = 100;
    handleInputChange('brixLevel', value);
  };

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);
    if (validFiles.length + formData.images.length > 3) {
      setErrors(prev => ({ ...prev, images: 'Maximum 3 images allowed' }));
      return;
    }
    handleInputChange('images', [...formData.images, ...validFiles]);
  };

  const removeImage = (index: number) => {
    handleInputChange('images', formData.images.filter((_, i) => i !== index));
  };
  
  const handleLocationSelect = (location: { name: string; latitude: number; longitude: number }) => {
    setFormData(prev => ({
      ...prev,
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const requiredFields: (keyof typeof formData)[] = ['cropType', 'brand', 'store', 'location', 'purchaseDate', 'measurementDate'];
    requiredFields.forEach(field => {
      const value = formData[field];
      if (typeof value === 'string' && !value.trim()) {
        newErrors[field] = `${field} is required.`;
      }
    });

    if (formData.brixLevel < 0 || formData.brixLevel > 100) {
      newErrors.brixLevel = 'BRIX must be between 0–100';
    }

    const today = new Date();
    const purchaseDate = new Date(formData.purchaseDate);
    const measurementDate = new Date(formData.measurementDate);

    if (purchaseDate > today) newErrors.purchaseDate = 'Purchase date cannot be in the future';
    if (measurementDate > today) newErrors.measurementDate = 'Assessment date cannot be in the future';
    
    if (purchaseDate > measurementDate) {
      newErrors.purchaseDate = 'Purchase date should be before or same as assessment date';
    }

    if (formData.outlierNotes.length > 500) newErrors.outlierNotes = 'Notes too long (max 500 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ title: 'Please fix the errors in the form', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const payload = {
        cropName: formData.cropType,
        brandName: formData.brand,
        storeName: formData.store,
        variety: formData.variety,
        brixValue: formData.brixLevel,
        assessmentDate: new Date(formData.measurementDate + 'T00:00:00.000Z').toISOString(),
        purchaseDate: new Date(formData.purchaseDate + 'T00:00:00.000Z').toISOString(),
        outlierNotes: formData.outlierNotes,
        latitude: formData.latitude,
        longitude: formData.longitude,
        locationName: formData.location,
        userId: user?.id, 
      };
      
      const supabaseUrl = getSupabaseUrl();
      const publishKey = getPublishableKey();
      const response = await fetch(`${supabaseUrl}/functions/v1/auto-verify-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publishKey}`, 
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to submit data via Edge Function.');
      }
      
      const result = await response.json();
      const { verified, submission_id } = result;
      
      if (!submission_id) {
        throw new Error('Submission ID was not returned by the server.');
      }
      
      if (formData.images.length > 0) {
        const userId = user?.id;
        if (!userId) throw new Error('User not authenticated for image upload.');
        
        for (let i = 0; i < formData.images.length; i++) {
          const file = formData.images[i];
          const fileExtension = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
          const filePath = [userId, submission_id, `${Date.now()}_${i}.${fileExtension}`].join('/');
          
          const { error: uploadError } = await supabase.storage
            .from('submission-images-bucket')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Image upload failed:', uploadError);
            toast({
              title: 'Image upload failed',
              description: `Some images could not be uploaded. Error: ${uploadError.message}`,
              variant: 'destructive',
            });
            continue;
          }
          
          const { error: insertError } = await supabase
            .from('submission_images')
            .insert({
              submission_id: submission_id,
              image_url: filePath,
            });
          
          if (insertError) {
            console.error('Failed to save image metadata:', insertError);
          }
        }
      }
      
      if (verified) {
        toast({ title: 'BRIX measurement automatically verified!', description: 'Thank you for your contribution!' });
      } else {
        toast({ title: 'BRIX measurement submitted for review.', description: 'An admin will review your entry shortly.' });
      }
      
      navigate('/your-data');
    } catch (err: any) {
      console.error(err);
      toast({ title: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || (user.role !== 'contributor' && user.role !== 'admin')) return null;

  // Show loading if static data is still loading
  if (staticDataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Header />
        <main className="max-w-5xl mx-auto p-6 lg:p-8 pb-24 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading form data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <main className="max-w-5xl mx-auto p-6 lg:p-8 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Submit BRIX Measurement
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Record your bionutrient density measurement from refractometer readings
          </p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl border-b">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <span>New Measurement Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">

              {/* Required Fields Section */}
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="flex items-center space-x-2 mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Required Information</h3>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Required
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Crop Type */}
                  <div className="relative">
                    <Label htmlFor="cropType" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Package className="inline w-4 h-4 mr-2" />
                      Crop Type <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Combobox
                      items={crops}
                      value={formData.cropType}
                      onSelect={(value) => handleInputChange('cropType', value)}
                      placeholder="Select or enter crop type"
                    />
                    {errors.cropType && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.cropType}</p>}
                  </div>

                  {/* Brand/Farm Name */}
                  <div className="relative">
                    <Label htmlFor="brand" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Store className="inline w-4 h-4 mr-2" />
                      Farm/Brand Name <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Combobox
                      items={brands}
                      value={formData.brand}
                      onSelect={(value) => handleInputChange('brand', value)}
                      placeholder="Select or enter farm/brand"
                    />
                    {errors.brand && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.brand}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Point of Purchase */}
                  <div className="relative">
                    <Label htmlFor="store" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Store className="inline w-4 h-4 mr-2" />
                      Point of Purchase <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Combobox
                      items={locations}
                      value={formData.store}
                      onSelect={(value) => handleInputChange('store', value)}
                      placeholder="Select or enter store"
                    />
                    {errors.store && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.store}</p>}
                  </div>
                  
                  {/* BRIX Level */}
                  <div>
                    <Label htmlFor="brixLevel" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Droplets className="inline w-4 h-4 mr-2" />
                      BRIX Level <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="brixLevel"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.brixLevel}
                        onChange={handleBrixNumberChange}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${errors.brixLevel ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">°Brix</span>
                    </div>
                    {errors.brixLevel && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.brixLevel}</p>}
                  </div>
                </div>

                {/* Row 3: Location and Dates */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Location - using the new LocationSearch component */}
                  <div className="relative">
                    <Label htmlFor="location" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <MapPin className="inline w-4 h-4 mr-2" />
                      Sample Location <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <LocationSearch
                      value={formData.location}
                      onChange={e => handleInputChange('location', e.target.value)}
                      onLocationSelect={handleLocationSelect}
                    />
                    {errors.location && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.location}</p>}
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <Label htmlFor="purchaseDate" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Purchase Date <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={e => handleInputChange('purchaseDate', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${errors.purchaseDate ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                    />
                    {errors.purchaseDate && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.purchaseDate}</p>}
                  </div>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="border-l-4 border-gray-300 pl-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Additional Information</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Measurement Date */}
                  <div>
                    <Label htmlFor="measurementDate" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Clock className="inline w-4 h-4 mr-2" />
                      Assessment Date
                    </Label>
                    <Input
                      id="measurementDate"
                      type="date"
                      value={formData.measurementDate}
                      onChange={e => handleInputChange('measurementDate', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${errors.measurementDate ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                    />
                    {errors.measurementDate && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.measurementDate}</p>}
                  </div>

                  {/* Variety */}
                  <div>
                    <Label htmlFor="variety" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Package className="inline w-4 h-4 mr-2" />
                      Variety
                    </Label>
                    <Input
                      id="variety"
                      type="text"
                      placeholder="e.g., Roma, Heirloom"
                      value={formData.variety}
                      onChange={e => handleInputChange('variety', e.target.value)}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${errors.variety ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                    />
                  </div>
                </div>

                {/* Outlier Notes */}
                <div className="mb-8">
                  <Label htmlFor="outlierNotes" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <FileText className="inline w-4 h-4 mr-2" />
                    Notes/Observations
                  </Label>
                  <Textarea
                    id="outlierNotes"
                    placeholder="Describe any anomalies or interesting details about the sample."
                    value={formData.outlierNotes}
                    onChange={e => handleInputChange('outlierNotes', e.target.value)}
                    rows={4}
                    className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${errors.outlierNotes ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                  />
                  {errors.outlierNotes && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.outlierNotes}</p>}
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="border-l-4 border-gray-300 pl-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Optional: Add Images</h3>
                <div className="flex flex-col space-y-4">
                  <Label htmlFor="images" className="flex items-center text-sm font-semibold text-gray-700">
                    <Camera className="inline w-4 h-4 mr-2" />
                    Upload Photos (Max 3, up to 5MB each)
                  </Label>
                  <div className="flex flex-wrap items-center space-x-2 space-y-2">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 group">
                        <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formData.images.length < 3 && (
                      <Label htmlFor="image-upload" className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500 cursor-pointer hover:border-blue-500 transition-colors">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs text-center">Add Photo</span>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleImageUpload}
                          className="sr-only"
                        />
                      </Label>
                    )}
                  </div>
                  {errors.images && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.images}</p>}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-8">
                <Button type="submit" className="w-full lg:w-auto px-12 py-6 text-lg font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Measurement'
                  )}
                </Button>
              </div>

              {errors.general && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm text-center">
                  <p>{errors.general}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataEntry;