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
  Info,
  Building2
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { getSupabaseUrl, getPublishableKey } from '@/lib/utils';
import ComboBoxAddable from '../components/ui/combo-box-addable';
import Combobox from '../components/ui/combo-box'; 
import LocationSearch from '../components/common/LocationSearch';
import { useStaticData } from '../hooks/useStaticData';
import { Slider } from '../components/ui/slider';

interface DetailedLocationInfo {
  name: string;
  latitude: number;
  longitude: number;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  poi_name?: string;
  normalized_address?: string;
  business_name?: string;
}

// Human-readable labels for validation/labels
const FIELD_LABELS: Record<string, string> = {
  cropType: 'Crop Type',
  brand: 'Farm/Brand Name',
  store: 'Point of Purchase',
  location: 'Sample Location',
  purchaseDate: 'Purchase Date',
  measurementDate: 'Assessment Date',
  brixLevel: 'BRIX Level',
  outlierNotes: 'Notes/Observations',
  images: 'Images',
};

const DataEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { crops, brands, locations, isLoading: staticDataLoading, error: staticDataError, refreshData } = useStaticData();

  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    brixLevel: 12,
    latitude: 0,
    longitude: 0,
    location: '',
    street_address: '',
    city: '',
    state: '',
    country: '',
    poi_name: '',
    business_name: '',
    normalized_address: '',
    measurementDate: new Date().toISOString().split('T')[0],
    purchaseDate: '',
    outlierNotes: '',
    brand: '',
    store: '',
    images: [] as File[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track pending additions to prevent database additions before form submission
  const [pendingBrands, setPendingBrands] = useState<string[]>([]);
  const [pendingStores, setPendingStores] = useState<string[]>([]);

  useEffect(() => {
    if (!user || (user.role !== 'contributor' && user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (staticDataError) {
      toast({
        title: 'Error loading form options',
        description: staticDataError,
        variant: 'destructive',
      });
    }
  }, [staticDataError, toast]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBrixChange = (value: number | number[]) => {
    const brixValue = Array.isArray(value) ? value[0] : value;
    
    if (typeof brixValue !== 'number' || isNaN(brixValue)) {
      handleInputChange('brixLevel', 0);
    } else {
      handleInputChange('brixLevel', Math.min(Math.max(brixValue, 0), 100));
    }
    
    if (errors.brixLevel) {
      setErrors(prev => ({ ...prev, brixLevel: '' }));
    }
  };

  // Modified brand handler - only adds to pending list
  const handleAddBrand = (newBrandName: string) => {
    if (!pendingBrands.includes(newBrandName)) {
      setPendingBrands(prev => [...prev, newBrandName]);
    }
    handleInputChange('brand', newBrandName);
  };

  // Modified store handler - only adds to pending list
  const handleAddStore = (newStoreName: string) => {
    if (!pendingStores.includes(newStoreName)) {
      setPendingStores(prev => [...prev, newStoreName]);
    }
    handleInputChange('store', newStoreName);
  };

  // Helper function to actually create brands and stores in database
  const createPendingEntries = async () => {
    const createdBrands = [];
    const createdStores = [];

    // Create pending brands
    for (const brandName of pendingBrands) {
      try {
        const { data, error } = await supabase
          .from('brands')
          .insert([{ name: brandName }])
          .select();

        if (error) {
          console.error('Error creating brand:', error);
          continue;
        }

        if (data && data.length > 0) {
          createdBrands.push(data[0]);
        }
      } catch (err) {
        console.error('Error creating brand:', err);
      }
    }

    // Create pending stores
    for (const storeName of pendingStores) {
      try {
        const { data, error } = await supabase
          .from('locations')
          .insert([{ name: storeName }])
          .select();

        if (error) {
          console.error('Error creating store:', error);
          continue;
        }
        
        if (data && data.length > 0) {
          createdStores.push(data[0]);
        }
      } catch (err) {
        console.error('Error creating store:', err);
      }
    }

    return { createdBrands, createdStores };
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
    const validFiles: File[] = [];
    let hasErrors = false;
    files.forEach((file) => {
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        hasErrors = true;
      }
    });
    if (validFiles.length + formData.images.length > 3) {
      setErrors(prev => ({ ...prev, images: 'Maximum 3 images allowed' }));
      return;
    }
    if (hasErrors) {
      toast({
        title: "File upload error",
        description: "Some files were too large or not supported. Please fix before submitting.",
        variant: "destructive",
      });
      return;
    }
    handleInputChange('images', [...formData.images, ...validFiles]);
  };

  const removeImage = (index: number) => {
    handleInputChange('images', formData.images.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (location: DetailedLocationInfo) => {
    setFormData(prev => ({
      ...prev,
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      street_address: location.street_address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      poi_name: location.poi_name || '',
      business_name: location.business_name || '',
      normalized_address: location.normalized_address || '',
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const requiredFields: (keyof typeof formData)[] = ['cropType', 'brand', 'store', 'location', 'purchaseDate', 'measurementDate'];
    requiredFields.forEach(field => {
      const value = formData[field];
      if (typeof value === 'string' && !value.trim()) {
        newErrors[field] = `Please select ${FIELD_LABELS[field] || field}`;
      }
    });

    if (typeof formData.brixLevel !== 'number' || isNaN(formData.brixLevel)) {
      newErrors.brixLevel = 'Please enter a valid BRIX value';
    } else if (formData.brixLevel < 0 || formData.brixLevel > 100) {
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
    if (e) e.preventDefault();
    if (!validateForm()) {
      // scroll to first errored field
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(firstErrorKey);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus?.();
        }
      }
      toast({
        title: "Submission blocked",
        description: "Please correct the highlighted errors before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // First, create any pending brands and stores in the database
      await createPendingEntries();
      
      // Clear pending lists since we've now created them
      setPendingBrands([]);
      setPendingStores([]);

      // Prepare the enhanced payload with detailed location information
      const payload = {
        cropName: formData.cropType,
        brandName: formData.brand,
        variety: formData.variety,
        brixValue: Number.isFinite(formData.brixLevel)
          ? Number(formData.brixLevel.toFixed(2))
          : 0,
        assessmentDate: new Date(formData.measurementDate + 'T00:00:00.000Z').toISOString(),
        purchaseDate: new Date(formData.purchaseDate + 'T00:00:00.000Z').toISOString(),
        outlierNotes: formData.outlierNotes,
        userId: user?.id,
        // Enhanced location data from Mapbox geocoding
        latitude: formData.latitude,
        longitude: formData.longitude,
        locationName: formData.location,
        street_address: formData.street_address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        poi_name: formData.poi_name || null,
        business_name: formData.business_name || null,
        normalized_address: formData.normalized_address || null,
        store_name: formData.store
      };

      // Call the Edge Function with enhanced location data
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
      
      // Handle image uploads
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
        toast({ 
          title: 'Submission successful', 
          description: 'Your BRIX reading was auto-verified. Thank you for contributing!', 
          variant: 'default'
        });
      } else {
        toast({ 
          title: 'Submission received',
          description: 'Your BRIX reading will be reviewed by an admin shortly.', 
          variant: 'default' 
        });
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

  if (staticDataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center p-6">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  // Combine existing items with pending items for display
  const allBrands = [
    ...brands,
    ...pendingBrands.map(name => ({ name, label: name }))
  ];

  const allStores = [
    ...locations,
    ...pendingStores.map(name => ({ name, label: name }))
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Submit BRIX Measurement
          </h1>
          <p className="text-md text-gray-600 max-w-2xl mx-auto">
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
          <CardContent className="p-4 sm:p-6 md:p-8">
            <form className="space-y-6 sm:space-y-8" autoComplete="off">
              <div className="border-l-4 border-blue-500 pl-4 sm:pl-6">
                <div className="flex items-center space-x-2 mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Required Information</h3>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Required
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                  {/* Crop Type - Using regular Combobox (no add new) */}
                  <div className="relative">
                    <Label htmlFor="cropType" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
                      <Package className="inline w-4 h-4 mr-2" />
                      Crop Type <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Combobox
                      items={crops}
                      value={formData.cropType}
                      onSelect={(value) => handleInputChange('cropType', value)}
                      placeholder="Select crop type"
                    />
                    {errors.cropType && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.cropType}</p>}
                  </div>

                  {/* Brand/Farm Name */}
                  <div className="relative">
                    <Label
                      htmlFor="brand"
                      className="flex items-center mb-2 text-sm font-semibold text-gray-700"
                    >
                      <Building2 className="inline w-4 h-4 mr-2 text-blue-600" />
                      Farm / Brand Name <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <ComboBoxAddable
                      items={allBrands}
                      value={formData.brand}
                      onSelect={(value) => handleInputChange('brand', value)}
                      onAddNew={handleAddBrand}
                      placeholder="Select or enter farm/brand name"
                    />
                    <p className="text-xs text-gray-500 flex items-center mt-2 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      <Info className="w-3 h-3 mr-1 text-blue-500" />
                      The name of the <b>farm</b> or <b>brand</b> that grew the produce.  
                      <span className="ml-1 hidden sm:inline">
                        Press <kbd className="px-1 border rounded">Enter</kbd> to select,  
                        <kbd className="px-1 border rounded">Shift+Enter</kbd> (or tap <b>+</b> on mobile) to add new.
                      </span>
                    </p>
                    {errors.brand && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.brand}
                      </p>
                    )}
                  </div>

                  {/* Point of Purchase */}
                  <div className="relative">
                    <Label
                      htmlFor="store"
                      className="flex items-center mb-2 text-sm font-semibold text-gray-700"
                    >
                      <Store className="inline w-4 h-4 mr-2 text-indigo-600" />
                      Point of Purchase <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <ComboBoxAddable
                      items={allStores}
                      value={formData.store}
                      onSelect={(value) => handleInputChange('store', value)}
                      onAddNew={handleAddStore}
                      placeholder="Select or enter point of purchase"
                    />
                    <p className="text-xs text-gray-500 flex items-center mt-2 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                      <Info className="w-3 h-3 mr-1 text-indigo-500" />
                      Where you <b>purchased</b> the item — e.g., grocery store,  
                      co-op, farmers market, or CSA pickup.
                    </p>
                    {errors.store && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.store}
                      </p>
                    )}
                  </div>

                  {/* BRIX Level */}
                  <div>
                    <Label htmlFor="brixLevel" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
                      <Droplets className="inline w-4 h-4 mr-2" />
                      BRIX Level <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <div className="flex items-center space-x-4">
                    <Input
                      id="brixLevel"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      value={isNaN(formData.brixLevel) ? '' : formData.brixLevel}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        handleBrixChange(isNaN(parsed) ? 0 : parsed);
                      }}
                      className={`w-24 text-center border-2 rounded-xl px-2 py-2 text-gray-900 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${errors.brixLevel ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                    />
                    <Slider
                      value={[formData.brixLevel]}
                      onValueChange={handleBrixChange}
                      max={100}
                      step={0.1}
                      className="flex-1"
                    />
                    </div>
                    {errors.brixLevel && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.brixLevel}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                  {/* Location - using the enhanced LocationSearch component */}
                  <div className="relative">
                    <Label htmlFor="location" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
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
                    <Label htmlFor="purchaseDate" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
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
              <div className="border-l-4 border-gray-300 pl-4 sm:pl-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Additional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                  {/* Measurement Date */}
                  <div>
                    <Label htmlFor="measurementDate" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
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
                    <Label htmlFor="variety" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
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
                    {errors.variety && <p className="text-red-600 text-sm mt-2 flex items-center"><X className="w-4 h-4 mr-1" />{errors.variety}</p>}
                  </div>
                </div>

                {/* Outlier Notes */}
                <div className="mb-8">
                  <Label htmlFor="outlierNotes" className="flex items-center mb-2 text-sm font-semibold text-gray-700">
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
              <div className="border-l-4 border-gray-300 pl-4 sm:pl-6">
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

            </form>
          </CardContent>
        </Card>
      </main>
      {/* Sticky footer submit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div className="max-w-5xl mx-auto flex justify-end">
      <Button
        onClick={() => handleSubmit()}
        className="w-full sm:w-auto px-12 py-6 text-lg font-semibold"
        disabled={isLoading}
        >
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
      </div>
    </div>
  );
};

export default DataEntry;