import React, { useState, useEffect, useRef } from 'react';
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
  MapIcon,
  Droplets,
  Camera,
  Clock,
  FileText,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';

import { fetchCropTypes } from '../lib/fetchCropTypes';
import { fetchBrands } from '../lib/fetchBrands';
import { fetchStores } from '../lib/fetchStores';
import { getSupabaseUrl, getPublishableKey } from '@/lib/utils.ts';

async function getMapboxToken() {
  try {
    const supabaseUrl = getSupabaseUrl();
    const publishKey = getPublishableKey();
    const response = await fetch(`${supabaseUrl}/functions/v1/mapbox-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publishKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to fetch Mapbox token:', error);
    return null;
  }
}

interface LocationFeature {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  properties?: {
    category?: string;
  };
  center: [number, number]; // [longitude, latitude]
}

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
    purchaseDate: '',
    outlierNotes: '',
    brand: '',
    store: '',
    farmLocation: '',
    harvestTime: '',
    images: [] as File[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isManualLocationEntry, setIsManualLocationEntry] = useState(false);

  const [cropTypes, setCropTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [stores, setStores] = useState<string[]>([]);

  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationFeature[]>([]);
  // Store the user's current GPS location to use for proximity search
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [showCropDropdown, setShowCropDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  const MAX_NAME_LENGTH = 150;

  // Redirect if not authorized
  useEffect(() => {
    if (!user || (user.role !== 'contributor' && user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch Crop Types, Brands, Stores, and Mapbox token on mount
  useEffect(() => {
    fetchCropTypes()
      .then(setCropTypes)
      .catch(() => toast({ title: 'Error loading crop types', variant: 'destructive' }));

    fetchBrands()
      .then(setBrands)
      .catch(() => toast({ title: 'Error loading brands', variant: 'destructive' }));

    fetchStores()
      .then(setStores)
      .catch(() => toast({ title: 'Error loading stores', variant: 'destructive' }));

    (async () => {
      const token = await getMapboxToken();
      if (!token) {
        toast({ title: 'Could not load Mapbox token', variant: 'destructive' });
      }
      setMapboxToken(token);
    })();
  }, [toast]);

  // Centralized input change handler to keep form data in sync
  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear related errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle BRIX slider change
  const handleBrixSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    handleInputChange('brixLevel', [value]);
  };

  // Handle BRIX number input change
  const handleBrixNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > 100) value = 100;
    handleInputChange('brixLevel', [value]);
  };

  // Proper dropdown selection that maintains sync
  const selectDropdownValue = (field: 'cropType' | 'brand' | 'store', value: string) => {
    handleInputChange(field, value);

    if (field === 'cropType') setShowCropDropdown(false);
    else if (field === 'brand') setShowBrandDropdown(false);
    else if (field === 'store') setShowStoreDropdown(false);
  };

  // Sanitize inputs to prevent XSS and invalid chars
  const sanitizeInput = (input: string): string =>
    input
      .trim()
      .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
      .replace(/(javascript:|data:)/gi, '')
      .replace(/\s{2,}/g, ' ');

  // Add a simple check for inappropriate text content
  const containsInappropriateContent = (text: string): boolean => {
    if (!text) return false;
    const inappropriateKeywords = ['porn', 'explicit', 'nude', 'inappropriate', 'sexual', 'hate', 'slur', 'violence', 'gore'];
    const lowerText = text.toLowerCase();
    return inappropriateKeywords.some(keyword => lowerText.includes(keyword));
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

  // Use centralized handler for image updates
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);
    if (validFiles.length + formData.images.length > 3) {
      setErrors(prev => ({ ...prev, images: 'Maximum 3 images allowed' }));
      return;
    }
    handleInputChange('images', [...formData.images, ...validFiles]);
  };

  // Use centralized handler for image removal
  const removeImage = (index: number) => {
    handleInputChange('images', formData.images.filter((_, i) => i !== index));
  };

  // Handle location input change
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleInputChange('location', value);
    setIsManualLocationEntry(true); // Track that this is manual entry
  };

  // Refactored useEffect for location suggestions (best practice)
  // This is the key change to make the search more relevant
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const query = formData.location.trim();
      
      // The search only runs if we have a token, a query, and the user's location
      if (!mapboxToken || query.length < 3 || !userLocation) {
        setLocationSuggestions([]);
        return;
      }

      try {
        const searchParams = new URLSearchParams({
          access_token: mapboxToken,
          country: 'US',
          autocomplete: 'true',
          // CRITICAL: Bias search results towards the user's location
          proximity: `${userLocation.longitude},${userLocation.latitude}`, 
          // CRITICAL: Prioritize Points of Interest (stores, etc.) over general places
          types: 'poi,address,place', 
          limit: '5',
        });
        
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${searchParams.toString()}`,
          { signal: controller.signal }
        );

        const data = await res.json();
        const allSuggestions = data.features || [];

        setLocationSuggestions(allSuggestions);
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          console.error('Location search error:', e);
          toast({ title: 'Error fetching location suggestions', variant: 'destructive' });
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [formData.location, mapboxToken, userLocation, toast]); // userLocation is now a dependency

  // Use centralized handler for location selection
  const selectLocationSuggestion = (feature: LocationFeature) => {
    setFormData(prev => ({
      ...prev,
      location: feature.place_name,
      longitude: feature.center[0],
      latitude: feature.center[1],
    }));
    setLocationSuggestions([]);
    setIsManualLocationEntry(false); // No longer manual entry after selection
  };

  // Use centralized handler for location capture
  const handleLocationCapture = () => {
    if (!mapboxToken) {
      setErrors(prev => ({ ...prev, location: 'Mapbox token not loaded yet' }));
      return;
    }
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, location: 'Geolocation not supported' }));
      return;
    }
    setLocationLoading(true);
    setIsManualLocationEntry(false); // This is GPS, not manual

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        // IMPORTANT: Store the user's location for use in the search function
        setUserLocation({ latitude, longitude });
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`
          );
          const data = await res.json();
          const placeName = data.features?.[0]?.place_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, latitude, longitude, location: placeName }));
          setLocationSuggestions([]); // Clear suggestions after GPS capture
          toast({ title: 'Location captured', description: placeName });
        } catch {
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }));
          toast({ title: 'Location captured', description: 'Coordinates used' });
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location access denied.',
          2: 'Location unavailable.',
          3: 'Location request timed out.',
        };
        setErrors(prev => ({ ...prev, location: messages[err.code] || 'Failed to retrieve location.' }));
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const cropType = sanitizeInput(formData.cropType);
    const variety = sanitizeInput(formData.variety);
    const location = sanitizeInput(formData.location);
    const outlierNotes = sanitizeInput(formData.outlierNotes);
    const brand = sanitizeInput(formData.brand);
    const store = sanitizeInput(formData.store);
    const farmLocation = sanitizeInput(formData.farmLocation);
    const harvestTime = sanitizeInput(formData.harvestTime);

    // --- Data Integrity: Basic Inappropriate Content Check ---
    const allTextFields = [cropType, variety, brand, store, location, outlierNotes, farmLocation, harvestTime];
    if (allTextFields.some(containsInappropriateContent)) {
        newErrors.general = 'Please remove inappropriate content from your submission.';
    }

    // Required fields validation
    if (!cropType) newErrors.cropType = 'Crop type is required';
    if (!brand) newErrors.brand = 'Brand/Farm name is required';
    if (!store) newErrors.store = 'Point of purchase is required';
    if (!location) newErrors.location = 'Sample location is required';
    if (!formData.purchaseDate) newErrors.purchaseDate = 'Purchase date is required';
    if (!formData.measurementDate) newErrors.measurementDate = 'Assessment date is required';

    // Value validation
    if (formData.brixLevel[0] < 0 || formData.brixLevel[0] > 100)
      newErrors.brixLevel = 'BRIX must be between 0–100';

    // Date validation - ensure dates are not in the future
    const today = new Date();
    const purchaseDate = new Date(formData.purchaseDate);
    const measurementDate = new Date(formData.measurementDate);

    if (purchaseDate > today) newErrors.purchaseDate = 'Purchase date cannot be in the future';
    if (measurementDate > today) newErrors.measurementDate = 'Assessment date cannot be in the future';

    // Purchase date should be before or same as measurement date
    if (formData.purchaseDate && formData.measurementDate && purchaseDate > measurementDate) {
      newErrors.purchaseDate = 'Purchase date should be before or same as assessment date';
    }

    if (outlierNotes.length > 500) newErrors.outlierNotes = 'Notes too long (max 500 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form: create or get crop, brand, store, location, then insert submission + upload images
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ title: 'Please fix the errors in the form', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const cropName = sanitizeInput(formData.cropType);
      const brandName = sanitizeInput(formData.brand);
      const storeName = sanitizeInput(formData.store);
      const variety = sanitizeInput(formData.variety);
      const locationName = sanitizeInput(formData.location).slice(0, MAX_NAME_LENGTH);
      const brixValue = formData.brixLevel[0];
      const assessmentDate = new Date(formData.measurementDate + 'T00:00:00.000Z').toISOString();
      const purchaseDateISO = new Date(formData.purchaseDate + 'T00:00:00.000Z').toISOString();
      
      // Create a robust payload with all necessary data
      const payload = {
        cropName,
        brandName,
        storeName,
        variety,
        brixValue,
        assessmentDate,
        purchaseDate: purchaseDateISO,
        farmLocation: sanitizeInput(formData.farmLocation),
        harvestTime: sanitizeInput(formData.harvestTime),
        outlierNotes: sanitizeInput(formData.outlierNotes),
        latitude: formData.latitude,
        longitude: formData.longitude,
        locationName,
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
      
      // --- Image Upload and Database Insertion ---
      if (formData.images.length > 0) {
        const userId = user?.id;
        if (!userId) throw new Error('User not authenticated for image upload.');
        
        for (let i = 0; i < formData.images.length; i++) {
          const file = formData.images[i];
          const fileExtension = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
          const filePath = [userId, submission_id, `${Date.now()}_${i}.${fileExtension}`].join('/');
          
          // 1. Upload the image file to Supabase Storage
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
            continue; // Continue with the next image even if one fails
          }
          
          // 2. Insert the image's URL into the submissions_images table
          // We use the `from` and `select` APIs to interact with our tables
          const { error: insertError } = await supabase
            .from('submission_images')
            .insert({
              submission_id: submission_id,
              // The file path is what you need to store.
              // You can generate a public URL later for display.
              image_url: filePath,
            });
          
          if (insertError) {
            console.error('Failed to save image metadata:', insertError);
            // Handle this error case gracefully
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

                {/* Row 1: Crop Type and Brand */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Crop Type - required with dropdown */}
                  <div className="relative">
                    <Label htmlFor="cropType" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Package className="inline w-4 h-4 mr-2" />
                      Crop Type <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <input
                      id="cropType"
                      type="text"
                      placeholder="Type or select crop type"
                      autoComplete="off"
                      value={formData.cropType}
                      onChange={e => handleInputChange('cropType', e.target.value)}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                        ${errors.cropType ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                      onFocus={() => setShowCropDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCropDropdown(false), 150)}
                    />
                    {showCropDropdown && (
                      <ul className="absolute z-30 w-full max-h-48 overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl mt-1">
                        {cropTypes
                          .filter(crop => crop.toLowerCase().includes(formData.cropType.toLowerCase()))
                          .map(crop => (
                            <li
                              key={crop}
                              className="cursor-pointer px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-200"
                              onMouseDown={() => selectDropdownValue('cropType', crop)}
                            >
                              {crop}
                            </li>
                          ))}
                        {cropTypes.filter(crop => crop.toLowerCase().includes(formData.cropType.toLowerCase())).length === 0 && (
                          <li className="px-4 py-3 text-gray-500 italic">No matches found</li>
                        )}
                      </ul>
                    )}
                    {errors.cropType && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.cropType}
                      </p>
                    )}
                  </div>

                  {/* Brand/Farm Name - required with dropdown */}
                  <div className="relative">
                    <Label htmlFor="brand" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Store className="inline w-4 h-4 mr-2" />
                      Farm/Brand Name <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <input
                      id="brand"
                      type="text"
                      placeholder="Type or select farm/brand name"
                      autoComplete="off"
                      value={formData.brand}
                      onChange={e => handleInputChange('brand', e.target.value)}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                        ${errors.brand ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                      onFocus={() => setShowBrandDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBrandDropdown(false), 150)}
                    />
                    {showBrandDropdown && (
                      <ul className="absolute z-30 w-full max-h-48 overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl mt-1">
                        {brands
                          .filter(brand => brand.toLowerCase().includes(formData.brand.toLowerCase()))
                          .map(brand => (
                            <li
                              key={brand}
                              className="cursor-pointer px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-200"
                              onMouseDown={() => selectDropdownValue('brand', brand)}
                            >
                              {brand}
                            </li>
                          ))}
                        {brands.filter(brand => brand.toLowerCase().includes(formData.brand.toLowerCase())).length === 0 && (
                          <li className="px-4 py-3 text-gray-500 italic">No matches found</li>
                        )}
                      </ul>
                    )}
                    {errors.brand && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.brand}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Store and BRIX */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Store/Point of Purchase - required with dropdown */}
                  <div className="relative">
                    <Label htmlFor="store" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <MapIcon className="inline w-4 h-4 mr-2" />
                      Point of Purchase <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <input
                      id="store"
                      type="text"
                      placeholder="e.g., Whole Foods, Farmer's Market"
                      autoComplete="off"
                      value={formData.store}
                      onChange={e => handleInputChange('store', e.target.value)}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                        ${errors.store ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                      onFocus={() => setShowStoreDropdown(true)}
                      onBlur={() => setTimeout(() => setShowStoreDropdown(false), 150)}
                    />
                    {showStoreDropdown && (
                      <ul className="absolute z-30 w-full max-h-48 overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl mt-1">
                        {stores
                          .filter(store => store.toLowerCase().includes(formData.store.toLowerCase()))
                          .map(store => (
                            <li
                              key={store}
                              className="cursor-pointer px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-200"
                              onMouseDown={() => selectDropdownValue('store', store)}
                            >
                              {store}
                            </li>
                          ))}
                        {stores.filter(store => store.toLowerCase().includes(formData.store.toLowerCase())).length === 0 && (
                          <li className="px-4 py-3 text-gray-500 italic">No matches found</li>
                        )}
                      </ul>
                    )}
                    {errors.store && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.store}
                      </p>
                    )}
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
                        placeholder="e.g., 12.5"
                        value={formData.brixLevel[0]}
                        onChange={handleBrixNumberChange}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                          focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                          ${errors.brixLevel ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                      />
                      <span className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 text-lg font-bold"></span>
                    </div>
                    {errors.brixLevel && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.brixLevel}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 3: Location */}
                <div className="grid grid-cols-1 gap-8 mb-8">
                  <div className="relative">
                    <Label htmlFor="location" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <MapPin className="inline w-4 h-4 mr-2" />
                      Sample Location <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <div className="relative flex">
                      <Input
                        id="location"
                        type="text"
                        placeholder="Search for store (e.g., 'Walmart Oswego NY') or enter location"
                        autoComplete="off"
                        value={formData.location}
                        onChange={handleLocationChange}
                        className={`flex-grow border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                          focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                          ${errors.location ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                      />
                      <Button
                        type="button"
                        onClick={handleLocationCapture}
                        disabled={locationLoading}
                        className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-200"
                        title="Use GPS to get current location"
                      >
                        {locationLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Store/Location suggestions dropdown */}
                    {locationSuggestions.length > 0 && isManualLocationEntry && (
                      <ul className="absolute z-30 w-full max-h-48 overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl mt-1">
                        {locationSuggestions.map((feature) => (
                          <li
                            key={feature.id}
                            className="cursor-pointer px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                            onMouseDown={() => selectLocationSuggestion(feature)}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Show different icons based on feature type */}
                              {feature.place_name.toLowerCase().includes('store') ||
                                feature.place_name.toLowerCase().includes('market') ||
                                feature.place_name.toLowerCase().includes('walmart') ||
                                feature.place_name.toLowerCase().includes('target') ||
                                feature.place_name.toLowerCase().includes('grocery') ? (
                                <Store className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                              ) : (
                                <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {feature.place_name.split(',')[0]} {/* Store/location name */}
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                  {feature.place_name.split(',').slice(1).join(',').trim()} {/* Address */}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Show coordinates when location is selected */}
                    {formData.latitude !== 0 && formData.longitude !== 0 && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <strong>Selected:</strong> {formData.location}
                        </div>
                        <div className="text-xs text-blue-600 mt-1 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                        </div>
                      </div>
                    )}

                    {errors.location && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="border-l-4 border-purple-500 pl-6 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Optional Information</h3>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    Optional
                  </div>
                </div>

                {/* Row 4: Variety and Farm Location */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Variety */}
                  <div>
                    <Label htmlFor="variety" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Package className="inline w-4 h-4 mr-2" />
                      Variety
                    </Label>
                    <Input
                      id="variety"
                      type="text"
                      placeholder="e.g., Roma, Honeycrisp"
                      value={formData.variety}
                      onChange={e => handleInputChange('variety', e.target.value)}
                      className="w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-200 hover:border-gray-300 border-gray-200 focus:border-purple-500 bg-white"
                    />
                  </div>

                  {/* Farm Location */}
                  <div>
                    <Label htmlFor="farmLocation" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <MapPin className="inline w-4 h-4 mr-2" />
                      Farm Location (if known)
                    </Label>
                    <Input
                      id="farmLocation"
                      type="text"
                      placeholder="e.g., Local farm in Springfield"
                      value={formData.farmLocation}
                      onChange={e => handleInputChange('farmLocation', e.target.value)}
                      className="w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-200 hover:border-gray-300 border-gray-200 focus:border-purple-500 bg-white"
                    />
                  </div>
                </div>

                {/* Row 5: Dates */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                        ${errors.purchaseDate ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                    />
                    {errors.purchaseDate && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.purchaseDate}
                      </p>
                    )}
                  </div>

                  {/* Assessment Date */}
                  <div>
                    <Label htmlFor="measurementDate" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Assessment Date <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Input
                      id="measurementDate"
                      type="date"
                      value={formData.measurementDate}
                      onChange={e => handleInputChange('measurementDate', e.target.value)}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                        ${errors.measurementDate ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                    />
                    {errors.measurementDate && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.measurementDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 6: Harvest Time and Outlier Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Harvest Time */}
                  <div>
                    <Label htmlFor="harvestTime" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Clock className="inline w-4 h-4 mr-2" />
                      Harvest Time (e.g., "early season", "late fall")
                    </Label>
                    <Input
                      id="harvestTime"
                      type="text"
                      placeholder="e.g., Early Summer"
                      value={formData.harvestTime}
                      onChange={e => handleInputChange('harvestTime', e.target.value)}
                      className="w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-200 hover:border-gray-300 border-gray-200 focus:border-purple-500 bg-white"
                    />
                  </div>

                  {/* Outlier Notes */}
                  <div>
                    <Label htmlFor="outlierNotes" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <FileText className="inline w-4 h-4 mr-2" />
                      Outlier Notes (e.g., "unusually high reading")
                    </Label>
                    <Textarea
                      id="outlierNotes"
                      placeholder="Any observations about this measurement..."
                      value={formData.outlierNotes}
                      onChange={e => handleInputChange('outlierNotes', e.target.value)}
                      rows={3}
                      className="w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-200 hover:border-gray-300 border-gray-200 focus:border-purple-500 bg-white resize-y"
                    />
                    {errors.outlierNotes && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.outlierNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div className="mb-8">
                  <Label htmlFor="images" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <Camera className="inline w-4 h-4 mr-2" />
                    Upload Photos (Max 3)
                  </Label>
                  <Input
                    id="images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    className="h-14 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {errors.images && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <X className="w-4 h-4 mr-1" />
                      {errors.images}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative aspect-w-1 aspect-h-1">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg shadow"
                        />
                        <Button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 h-6 w-6 flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              {errors.general && (
                <p className="text-red-600 text-sm mb-4 text-center font-medium">
                  {errors.general}
                </p>
              )}
              <Button
                type="submit"
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>{isLoading ? 'Submitting...' : 'Submit Measurement'}</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataEntry;