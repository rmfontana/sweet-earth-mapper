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

  // Autocomplete location suggestions from Mapbox API
  useEffect(() => {
    if (!mapboxToken) return;
    if (formData.location.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    // Only show suggestions for manual entry, not GPS captures
    if (!isManualLocationEntry) return;

    const controller = new AbortController();

    async function fetchLocations() {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            formData.location
          )}.json?access_token=${mapboxToken}&autocomplete=true&limit=5&types=poi,address,place`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (data.features) setLocationSuggestions(data.features);
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          toast({ title: 'Error fetching location suggestions', variant: 'destructive' });
        }
      }
    }

    fetchLocations();

    return () => controller.abort();
  }, [formData.location, mapboxToken, toast, isManualLocationEntry]);

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
    const location = sanitizeInput(formData.location);
    const outlierNotes = sanitizeInput(formData.outlierNotes);
    const brand = sanitizeInput(formData.brand);
    const store = sanitizeInput(formData.store);

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
      // Sanitize inputs once
      const cropName = sanitizeInput(formData.cropType);
      const brandName = sanitizeInput(formData.brand);
      const storeName = sanitizeInput(formData.store);
      const variety = sanitizeInput(formData.variety);
      const locationName = sanitizeInput(formData.location).slice(0, MAX_NAME_LENGTH);

      // --- Crop: find or insert ---
      let { data: cropData, error: cropErr } = await supabase
        .from('crops')
        .select('id')
        .eq('name', cropName)
        .single();
  
      if (cropErr || !cropData) {
        // Insert new crop type if not found
        const { data: insertedCrop, error: insertCropErr } = await supabase
          .from('crops')
          .insert({ name: cropName })
          .select('id')
          .single();
  
        if (insertCropErr || !insertedCrop) throw new Error('Failed to create new crop type');
        cropData = insertedCrop;
      }
  
      // --- Brand: find or insert ---
      let brandId: string | null = null;
      if (brandName.trim()) {
        try {
          const { data: brandData, error: brandErr } = await supabase
            .from('brands')
            .select('id')
            .ilike('name', brandName.trim())
            .limit(1)
            .maybeSingle();

          if (brandData) {
            brandId = brandData.id;
          } else {
            const { data: insertedBrand, error: insertBrandErr } = await supabase
              .from('brands')
              .insert({ name: brandName.trim() })
              .select('id')
              .single();

            if (insertBrandErr) {
              if (insertBrandErr.code === '23505') {
                const { data: retryBrandData } = await supabase
                  .from('brands')
                  .select('id')
                  .ilike('name', brandName.trim())
                  .limit(1)
                  .single();
                
                if (retryBrandData) {
                  brandId = retryBrandData.id;
                } else {
                  throw new Error(`Brand "${brandName}" could not be created or found`);
                }
              } else {
                throw new Error(`Failed to create brand "${brandName}": ${insertBrandErr.message}`);
              }
            } else if (insertedBrand) {
              brandId = insertedBrand.id;
            }
          }
        } catch (error) {
          throw new Error(`Error handling brand "${brandName}": ${error.message}`);
        }
      }
  
      // --- Store: find or insert ---
      let storeId: string | null = null;
      if (storeName.trim()) {
        try {
          const { data: storeData, error: storeErr } = await supabase
            .from('stores')
            .select('id')
            .ilike('name', storeName.trim())
            .limit(1)
            .maybeSingle();

          if (storeData) {
            storeId = storeData.id;
          } else {
            const { data: insertedStore, error: insertStoreErr } = await supabase
              .from('stores')
              .insert({ name: storeName.trim() })
              .select('id')
              .single();

            if (insertStoreErr) {
              if (insertStoreErr.code === '23505') {
                const { data: retryStoreData } = await supabase
                  .from('stores')
                  .select('id')
                  .ilike('name', storeName.trim())
                  .limit(1)
                  .single();
                
                if (retryStoreData) {
                  storeId = retryStoreData.id;
                } else {
                  throw new Error(`Store "${storeName}" could not be created or found`);
                }
              } else {
                throw new Error(`Failed to create store "${storeName}": ${insertStoreErr.message}`);
              }
            } else if (insertedStore) {
              storeId = insertedStore.id;
            }
          }
        } catch (error) {
          throw new Error(`Error handling store "${storeName}": ${error.message}`);
        }
      }

      const fixPrecision = (num: number): number =>
        parseFloat(num.toFixed(6));
      
      // --- Location ---
      const latitude = fixPrecision(formData.latitude);
      const longitude = fixPrecision(formData.longitude);

      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates');
      }

      let locationData;
      try {
        const tolerance = 0.0001;
        const { data: existingLocations, error: findLocationErr } = await supabase
          .from('locations')
          .select('*')
          .gte('latitude', latitude - tolerance)
          .lte('latitude', latitude + tolerance)
          .gte('longitude', longitude - tolerance)
          .lte('longitude', longitude + tolerance)
          .limit(1);

        if (findLocationErr) {
          throw new Error('Failed to search for existing location');
        }

        if (existingLocations && existingLocations.length > 0) {
          locationData = existingLocations[0];
        } else {
          const { data: insertedLocation, error: insertErr } = await supabase
            .from('locations')
            .insert({
              name: locationName || null,
              latitude,
              longitude,
              place_id: null,
            })
            .select()
            .single();

          if (insertErr || !insertedLocation) {
            throw new Error(`Location insert failed: ${insertErr?.message || 'Unknown error'}`);
          }

          locationData = insertedLocation;
        }
      } catch (error) {
        throw new Error(`Error handling location: ${error.message}`);
      }
      
      // Create proper ISO date strings for database insertion
      const assessmentDate = new Date(formData.measurementDate + 'T00:00:00.000Z').toISOString();
      const purchaseDateISO = new Date(formData.purchaseDate + 'T00:00:00.000Z').toISOString();
      
      // --- Insert submission ---
      const { data: insertedSubmission, error: submitErr } = await supabase.from('submissions').insert({
        crop_id: cropData.id,
        location_id: locationData.id,
        store_id: storeId,
        brand_id: brandId,
        crop_variety: variety || null,                       
        brix_value: formData.brixLevel[0],
        user_id: user?.id,
        assessment_date: assessmentDate,  
        purchase_date: purchaseDateISO,
        farm_location: formData.farmLocation || null,
        harvest_time: formData.harvestTime || null,
        outlier_notes: formData.outlierNotes || null,  
      })
      .select('id')
      .single();
  
      if (submitErr || !insertedSubmission) throw submitErr;

      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');

      if (formData.images.length > 0) {
        const uploadedImageUrls: string[] = [];

        for (let i = 0; i < formData.images.length; i++) {
          const file = formData.images[i];
          const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
          const timestamp = Date.now();
          const filePath = `${userId}/${insertedSubmission.id}/${timestamp}_${i}.${ext}`;

          try {
            const uploadResult = await supabase.storage
              .from('submission-images-bucket')
              .upload(filePath, file, {
                contentType: file.type,
                upsert: false,
              });

            if (uploadResult.error) {
              if (uploadResult.error.message?.includes('row-level security') || 
                  uploadResult.error.message?.includes('Unauthorized') ||
                  uploadResult.error.message?.includes('403')) {
                throw new Error(`RLS Policy Error: Cannot upload ${file.name}. Auth issue detected.`);
              }
              throw uploadResult.error;
            }
            
            // Create signed URL
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('submission-images-bucket')
              .createSignedUrl(filePath, 60 * 60 * 24 * 365);

            if (urlError || !signedUrlData?.signedUrl) {
              throw new Error(`Failed to create signed URL for ${file.name}`);
            }

            uploadedImageUrls.push(signedUrlData.signedUrl);

          } catch (error: any) {
            throw new Error(`Upload failed for ${file.name}: ${error.message}`);
          }
        }

        if (uploadedImageUrls.length > 0) {
          const imageInsertPayload = uploadedImageUrls.map((url) => ({
            submission_id: insertedSubmission.id,
            image_url: url,
          }));

          const { error: imageInsertErr } = await supabase
            .from('submission_images')
            .insert(imageInsertPayload);

          if (imageInsertErr) {
            throw new Error(`Failed to save image records: ${imageInsertErr.message}`);
          }
        }
      }
  
      toast({ title: 'BRIX measurement submitted successfully!' });
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
      <main className="max-w-5xl mx-auto p-6 lg:p-8">
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

                  {/* BRIX Level - Enhanced with dual input */}
                  <div>
                    <Label htmlFor="brixLevel" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Droplets className="inline w-4 h-4 mr-2" />
                      BRIX Level <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={formData.brixLevel[0]}
                          onChange={handleBrixSliderChange}
                          id="brixLevel"
                          className="w-full h-3 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formData.brixLevel[0]}%, #e2e8f0 ${formData.brixLevel[0]}%, #e2e8f0 100%)`
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={formData.brixLevel[0]}
                          onChange={handleBrixNumberChange}
                          className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <span className="text-sm font-medium text-gray-600">°Bx</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      BRIX Level: <span className="font-semibold text-blue-600">{formData.brixLevel[0]}°</span>
                    </p>
                    {errors.brixLevel && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.brixLevel}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 3: Dates */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div>
                    <Label htmlFor="purchaseDate" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Date of Purchase <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Input
                      type="date"
                      id="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={e => handleInputChange('purchaseDate', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${
                        errors.purchaseDate ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.purchaseDate && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.purchaseDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="measurementDate" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Date of Assessment <span className="ml-1 text-red-600">*</span>
                    </Label>
                    <Input
                      type="date"
                      id="measurementDate"
                      value={formData.measurementDate}
                      onChange={e => handleInputChange('measurementDate', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-200 hover:border-gray-300 ${
                        errors.measurementDate ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.measurementDate && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {errors.measurementDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location with enhanced autocomplete */}
                <div className="relative">
                  <Label htmlFor="location" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <MapPin className="inline w-4 h-4 mr-2" />
                    Sample Location <span className="ml-1 text-red-600">*</span>
                  </Label>
                  <input
                    id="location"
                    type="text"
                    placeholder="Start typing location..."
                    autoComplete="off"
                    value={formData.location}
                    onChange={handleLocationChange}
                    className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200
                      focus:outline-none focus:ring-4 focus:ring-blue-200 hover:border-gray-300
                      ${errors.location ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 bg-white'}`}
                  />
                  {errors.location && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <X className="w-4 h-4 mr-1" />
                      {errors.location}
                    </p>
                  )}

                  {/* Only show dropdown for manual entry, not GPS captures */}
                  {locationSuggestions.length > 0 && isManualLocationEntry && (
                    <ul className="absolute z-30 top-full left-0 right-0 mt-1 max-h-40 overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl">
                      {locationSuggestions.map(suggestion => (
                        <li
                          key={suggestion.id}
                          className="cursor-pointer px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-200"
                          onMouseDown={() => selectLocationSuggestion(suggestion)}
                        >
                          {suggestion.place_name}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={handleLocationCapture}
                    disabled={locationLoading}
                    className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Getting location...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        <span>Use current location</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="border-l-4 border-green-500 pl-6 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Additional Information</h3>
                  <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Optional
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Variety */}
                  <div>
                    <Label htmlFor="variety" className="mb-3 text-sm font-semibold text-gray-700">Variety</Label>
                    <Input
                      id="variety"
                      value={formData.variety}
                      onChange={e => handleInputChange('variety', e.target.value)}
                      placeholder="e.g., Honeycrisp, Beefsteak"
                      autoComplete="off"
                      className="border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-200 hover:border-gray-300 border-gray-200 focus:border-blue-500"
                    />
                  </div>

                  {/* Harvest Time */}
                  <div>
                    <Label htmlFor="harvestTime" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                      <Clock className="inline w-4 h-4 mr-2" />
                      Harvest Time (if known)
                    </Label>
                    <Input
                      type="time"
                      id="harvestTime"
                      value={formData.harvestTime}
                      onChange={e => handleInputChange('harvestTime', e.target.value)}
                      className="border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-200 hover:border-gray-300 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Farm Location */}
                <div className="mb-8">
                  <Label htmlFor="farmLocation" className="mb-3 text-sm font-semibold text-gray-700">Farm Location</Label>
                  <Input
                    id="farmLocation"
                    value={formData.farmLocation}
                    onChange={e => handleInputChange('farmLocation', e.target.value)}
                    placeholder="e.g., Salinas Valley, CA or Local Farm"
                    autoComplete="off"
                    className="border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-200 hover:border-gray-300 border-gray-200 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-2">Where was this crop grown? (if known)</p>
                </div>

                {/* Notes */}
                <div className="mb-8">
                  <Label htmlFor="outlierNotes" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <FileText className="inline w-4 h-4 mr-2" />
                    Notes for Outlier Readings
                  </Label>
                  <Textarea
                    id="outlierNotes"
                    value={formData.outlierNotes}
                    onChange={e => handleInputChange('outlierNotes', e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Provide context if BRIX reading is unusually high or low..."
                    className={`border-2 rounded-xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-200 hover:border-gray-300 resize-none ${
                      errors.outlierNotes ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  <p className="text-sm text-gray-500 mt-2">{formData.outlierNotes.length}/500 characters</p>
                  {errors.outlierNotes && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <X className="w-4 h-4 mr-1" />
                      {errors.outlierNotes}
                    </p>
                  )}
                </div>

                {/* Images Upload */}
                <div>
                  <Label htmlFor="images" className="flex items-center mb-3 text-sm font-semibold text-gray-700">
                    <Camera className="inline w-4 h-4 mr-2" />
                    Photo of the Crop (max 3)
                  </Label>
                  <input
                    type="file"
                    id="images"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    disabled={formData.images.length >= 3}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {errors.images && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <X className="w-4 h-4 mr-1" />
                      {errors.images}
                    </p>
                  )}

                  <div className="flex space-x-4 mt-4">
                    {formData.images.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative w-24 h-24 border-2 border-gray-200 rounded-xl overflow-hidden flex-shrink-0 shadow-md"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview-${idx}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors duration-200"
                          aria-label="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-lg font-bold tracking-wide rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 transition-all duration-200 hover:shadow-2xl transform hover:-translate-y-1"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit BRIX Measurement'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataEntry;