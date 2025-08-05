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
    contributorName: '',
    time: '',
    images: [] as File[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // FIXED: Centralized input change handler to keep form data in sync
  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // FIXED: Proper dropdown selection that maintains sync
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

  // FIXED: Use centralized handler for image updates
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);
    if (validFiles.length + formData.images.length > 3) {
      setErrors(prev => ({ ...prev, images: 'Maximum 3 images allowed' }));
      return;
    }
    handleInputChange('images', [...formData.images, ...validFiles]);
  };

  // FIXED: Use centralized handler for image removal
  const removeImage = (index: number) => {
    handleInputChange('images', formData.images.filter((_, i) => i !== index));
  };

  // Autocomplete location suggestions from Mapbox API
  useEffect(() => {
    if (!mapboxToken) return;
    if (formData.location.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

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
  }, [formData.location, mapboxToken, toast]);

  // FIXED: Use centralized handler for location selection
  const selectLocationSuggestion = (feature: LocationFeature) => {
    setFormData(prev => ({
      ...prev,
      location: feature.place_name,
      longitude: feature.center[0],
      latitude: feature.center[1],
    }));
    setLocationSuggestions([]);
  };

  // FIXED: Use centralized handler for location capture
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

    if (!cropType) newErrors.cropType = 'Please select or enter a crop type';
    if (formData.brixLevel[0] < 0 || formData.brixLevel[0] > 100)
      newErrors.brixLevel = 'BRIX must be between 0–100';
    if (!location) newErrors.location = 'Location is required';
    if (new Date(formData.measurementDate) > new Date())
      newErrors.measurementDate = 'Date cannot be in the future';
    if (outlierNotes.length > 500) newErrors.outlierNotes = 'Notes too long (max 500 characters)';
    if (!brand) newErrors.brand = 'Please select or enter a brand';
    if (!store) newErrors.store = 'Please select or enter a store';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form: create or get crop, brand, store, location, then insert submission + upload images
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ title: 'Fix errors in form.', variant: 'destructive' });
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

      // --- Variety: find or insert ---
      // TODO: Once varieties added to the database come back here and fix this
  
      // --- Brand: find or insert (optional) ---
      let brandId: string | null = null;
      if (brandName.trim()) {
        try {
          // First, try to find existing brand with better error handling
          const { data: brandData, error: brandErr } = await supabase
            .from('brands')
            .select('id')
            .ilike('name', brandName.trim()) // Use ilike for case-insensitive search
            .limit(1)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no match

          if (brandData) {
            // Found existing brand
            brandId = brandData.id;
          } else {
            // Try to insert new brand
            const { data: insertedBrand, error: insertBrandErr } = await supabase
              .from('brands')
              .insert({ name: brandName.trim() })
              .select('id')
              .single();

            if (insertBrandErr) {
              console.error('Brand insert error:', insertBrandErr);
              
              // Check if it's a duplicate key error (brand might have been created by another user)
              if (insertBrandErr.code === '23505') {
                // Try to find the brand again
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
          console.error('Brand handling error:', error);
          throw new Error(`Error handling brand "${brandName}": ${error.message}`);
        }
      }
  
      // --- Store: find or insert ---
      let storeId: string | null = null;
      if (storeName.trim()) {
        try {
          // First, try to find existing store
          const { data: storeData, error: storeErr } = await supabase
            .from('stores')
            .select('id')
            .ilike('name', storeName.trim()) // Use ilike for case-insensitive search
            .limit(1)
            .maybeSingle(); // Use maybeSingle() instead of single()

          if (storeData) {
            // Found existing store
            storeId = storeData.id;
          } else {
            // Try to insert new store
            const { data: insertedStore, error: insertStoreErr } = await supabase
              .from('stores')
              .insert({ name: storeName.trim() })
              .select('id')
              .single();

            if (insertStoreErr) {
              console.error('Store insert error:', insertStoreErr);
              
              // Check if it's a duplicate key error
              if (insertStoreErr.code === '23505') {
                // Try to find the store again
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
          console.error('Store handling error:', error);
          throw new Error(`Error handling store "${storeName}": ${error.message}`);
        }
      }
      const fixPrecision = (num: number): number =>
        parseFloat(num.toFixed(6)); // max 6 decimal digits for `numeric(9,6)`
      
      // --- Location ---
      const latitude = fixPrecision(formData.latitude);
      const longitude = fixPrecision(formData.longitude);

      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates');
      }

      // Use range-based search for floating point coordinates instead of exact equality
      let locationData;
      try {
        // First try to find existing location within a small radius (about 10 meters)
        const tolerance = 0.0001; // approximately 10 meters
        const { data: existingLocations, error: findLocationErr } = await supabase
          .from('locations')
          .select('*')
          .gte('latitude', latitude - tolerance)
          .lte('latitude', latitude + tolerance)
          .gte('longitude', longitude - tolerance)
          .lte('longitude', longitude + tolerance)
          .limit(1);

        if (findLocationErr) {
          console.error('Location search error:', findLocationErr);
          throw new Error('Failed to search for existing location');
        }

        if (existingLocations && existingLocations.length > 0) {
          // Use existing location
          locationData = existingLocations[0];
        } else {
          // Create new location
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
            console.error('Supabase location insert error:', insertErr);
            throw new Error(`Location insert failed: ${insertErr?.message || 'Unknown error'}`);
          }

          locationData = insertedLocation;
        }
      } catch (error) {
        console.error('Location handling error:', error);
        throw new Error(`Error handling location: ${error.message}`);
      }
      
      // --- Insert submission ---
      const { data: insertedSubmission, error: submitErr } = await supabase.from('submissions').insert({
        crop_id: cropData.id,
        location_id: locationData.id,
        store_id: storeId,
        brand_id: brandId,
        crop_variety: variety || null,                       
        brix_value: formData.brixLevel[0],
        user_id: user?.id,
        assessment_date: new Date(formData.measurementDate).toISOString(),  
        purchase_date: formData.purchaseDate || null,
        farm_location: formData.farmLocation || null,
        contributor_name: formData.contributorName || null,
        harvest_time: formData.time || null,
        outlier_notes: formData.outlierNotes || null,  
      })
      .select('id')
      .single();
  
      if (submitErr || !insertedSubmission) throw submitErr;

      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');

      // === COMPREHENSIVE AUTH DEBUGGING ===
      console.log('=== AUTHENTICATION CHECK ===');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session exists:', !!session);
      console.log('Session user ID:', session?.user?.id);
      console.log('Form user ID:', userId);
      console.log('User IDs match:', session?.user?.id === userId);
      console.log('Session error:', sessionError);

      // Check if user exists in users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();
      console.log('User record exists:', !!userRecord);
      console.log('User record error:', userError);

      if (formData.images.length > 0) {
        console.log('=== STARTING IMAGE UPLOAD ===');
        console.log('Number of images to upload:', formData.images.length);
        
        const uploadedImageUrls: string[] = [];

        for (let i = 0; i < formData.images.length; i++) {
          const file = formData.images[i];
          const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
          const timestamp = Date.now();
          const filePath = `${userId}/${insertedSubmission.id}/${timestamp}_${i}.${ext}`;

          console.log(`=== UPLOADING IMAGE ${i + 1}/${formData.images.length} ===`);
          console.log('File name:', file.name);
          console.log('File size:', file.size);
          console.log('File type:', file.type);
          console.log('Upload path:', filePath);
          console.log('Path starts with user ID:', filePath.startsWith(`${userId}/`));

          try {
            // Test bucket access first
            console.log('Testing bucket access...');
            const { data: bucketTest, error: bucketError } = await supabase.storage
              .from('submission-images-bucket')
              .list('', { limit: 1 });
            
            console.log('Bucket access test result:', bucketError ? 'FAILED' : 'SUCCESS');
            if (bucketError) {
              console.log('Bucket error:', bucketError);
            }

            // Attempt upload with maximum detail logging
            console.log('Attempting upload...');
            const uploadResult = await supabase.storage
              .from('submission-images-bucket')
              .upload(filePath, file, {
                contentType: file.type,
                upsert: false,
              });

            console.log('Upload result:', uploadResult);
            
            if (uploadResult.error) {
              console.log('=== UPLOAD ERROR DETAILS ===');
              console.log('Error message:', uploadResult.error.message);
              console.log('Error name:', uploadResult.error.name);
              console.log('Full error object:', JSON.stringify(uploadResult.error, null, 2));
              
              // Specific error handling
              if (uploadResult.error.message?.includes('row-level security') || 
                  uploadResult.error.message?.includes('Unauthorized') ||
                  uploadResult.error.message?.includes('403')) {
                throw new Error(`RLS Policy Error: Cannot upload ${file.name}. Auth issue detected.`);
              }
              throw uploadResult.error;
            }

            console.log('Upload successful for:', file.name);
            
            // Create signed URL
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('submission-images-bucket')
              .createSignedUrl(filePath, 60 * 60 * 24 * 365);

            if (urlError || !signedUrlData?.signedUrl) {
              console.error('Signed URL error:', urlError);
              throw new Error(`Failed to create signed URL for ${file.name}`);
            }

            uploadedImageUrls.push(signedUrlData.signedUrl);
            console.log(`Successfully processed image ${i + 1}/${formData.images.length}`);

          } catch (error: any) {
            console.log('=== CATCH BLOCK ERROR ===');
            console.log('Error type:', typeof error);
            console.log('Error message:', error.message);
            console.log('Error stack:', error.stack);
            console.log('Full error:', JSON.stringify(error, null, 2));
            
            throw new Error(`Upload failed for ${file.name}: ${error.message}`);
          }
        }

        // Continue with image record insertion...
        if (uploadedImageUrls.length > 0) {
          console.log('=== INSERTING IMAGE RECORDS ===');
          const imageInsertPayload = uploadedImageUrls.map((url) => ({
            submission_id: insertedSubmission.id,
            image_url: url,
          }));

          const { error: imageInsertErr } = await supabase
            .from('submission_images')
            .insert(imageInsertPayload);

          if (imageInsertErr) {
            console.error('Image record insert error:', imageInsertErr);
            throw new Error(`Failed to save image records: ${imageInsertErr.message}`);
          }

          console.log('Successfully saved all image records');
        }
      }
  
      toast({ title: 'Data submitted successfully' });
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-extrabold mb-3 text-gray-900">Submit BRIX Measurement</h1>
        <p className="text-gray-600 mb-8">
          Record your bionutrient density measurement from refractometer readings
        </p>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>New Measurement Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              {/* Grid layout for inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crop Type - required with dropdown */}
                <div className="relative">
                  <Label htmlFor="cropType" className="flex items-center">
                    Crop Type <span className="ml-1 text-red-600">*</span>
                  </Label>
                  <input
                    id="cropType"
                    type="text"
                    placeholder="Type or select crop type"
                    autoComplete="off"
                    value={formData.cropType}
                    onChange={e => handleInputChange('cropType', e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.cropType ? 'border-red-500' : 'border-gray-300'}`}
                    aria-describedby="cropType-list"
                    aria-invalid={!!errors.cropType}
                    onFocus={() => setShowCropDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCropDropdown(false), 150)} // delay to allow click
                  />
                  {/* Dropdown panel */}
                  {showCropDropdown && (
                    <ul
                      id="cropType-list"
                      className="absolute z-30 w-full max-h-48 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
                    >
                      {cropTypes
                        .filter(crop => crop.toLowerCase().includes(formData.cropType.toLowerCase()))
                        .map(crop => (
                          <li
                            key={crop}
                            className="cursor-pointer px-3 py-2 hover:bg-blue-100"
                            onMouseDown={() => selectDropdownValue('cropType', crop)}
                          >
                            {crop}
                          </li>
                        ))}
                      {cropTypes.filter(crop => crop.toLowerCase().includes(formData.cropType.toLowerCase())).length === 0 && (
                        <li className="px-3 py-2 text-gray-500">No matches found</li>
                      )}
                    </ul>
                  )}
                  {errors.cropType && (
                    <p className="text-red-600 text-sm mt-1">{errors.cropType}</p>
                  )}
                </div>
  
                {/* Variety - optional free text */}
                <div>
                  <Label htmlFor="variety">Variety</Label>
                  <Input
                    id="variety"
                    value={formData.variety}
                    onChange={e => handleInputChange('variety', e.target.value)}
                    autoComplete="off"
                    className={errors.variety ? 'border-red-500' : ''}
                  />
                  {errors.variety && <p className="text-red-600 text-sm mt-1">{errors.variety}</p>}
                </div>
  
                {/* Brand - required with dropdown */}
                <div className="relative">
                  <Label htmlFor="brand" className="flex items-center">
                    Brand <span className="ml-1 text-red-600">*</span>
                  </Label>
                  <input
                    id="brand"
                    type="text"
                    placeholder="Type or select brand"
                    autoComplete="off"
                    value={formData.brand}
                    onChange={e => handleInputChange('brand', e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.brand ? 'border-red-500' : 'border-gray-300'}`}
                    aria-describedby="brand-list"
                    aria-invalid={!!errors.brand}
                    onFocus={() => setShowBrandDropdown(true)}
                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 150)}
                  />
                  {showBrandDropdown && (
                    <ul
                      id="brand-list"
                      className="absolute z-30 w-full max-h-48 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
                    >
                      {brands
                        .filter(brand => brand.toLowerCase().includes(formData.brand.toLowerCase()))
                        .map(brand => (
                          <li
                            key={brand}
                            className="cursor-pointer px-3 py-2 hover:bg-blue-100"
                            onMouseDown={() => selectDropdownValue('brand', brand)}
                          >
                            {brand}
                          </li>
                        ))}
                      {brands.filter(brand => brand.toLowerCase().includes(formData.brand.toLowerCase())).length === 0 && (
                        <li className="px-3 py-2 text-gray-500">No matches found</li>
                      )}
                    </ul>
                  )}
                  {errors.brand && (
                    <p className="text-red-600 text-sm mt-1">{errors.brand}</p>
                  )}
                </div>
  
                {/* Store - required with dropdown */}
                <div className="relative">
                  <Label htmlFor="store" className="flex items-center">
                    Store <span className="ml-1 text-red-600">*</span>
                  </Label>
                  <input
                    id="store"
                    type="text"
                    placeholder="Type or select store"
                    autoComplete="off"
                    value={formData.store}
                    onChange={e => handleInputChange('store', e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.store ? 'border-red-500' : 'border-gray-300'}`}
                    aria-describedby="store-list"
                    aria-invalid={!!errors.store}
                    onFocus={() => setShowStoreDropdown(true)}
                    onBlur={() => setTimeout(() => setShowStoreDropdown(false), 150)}
                  />
                  {showStoreDropdown && (
                    <ul
                      id="store-list"
                      className="absolute z-30 w-full max-h-48 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
                    >
                      {stores
                        .filter(store => store.toLowerCase().includes(formData.store.toLowerCase()))
                        .map(store => (
                          <li
                            key={store}
                            className="cursor-pointer px-3 py-2 hover:bg-blue-100"
                            onMouseDown={() => selectDropdownValue('store', store)}
                          >
                            {store}
                          </li>
                        ))}
                      {stores.filter(store => store.toLowerCase().includes(formData.store.toLowerCase())).length === 0 && (
                        <li className="px-3 py-2 text-gray-500">No matches found</li>
                      )}
                    </ul>
                  )}
                  {errors.store && (
                    <p className="text-red-600 text-sm mt-1">{errors.store}</p>
                  )}
                </div>
              </div>
  
              {/* BRIX Level - required */}
              <div>
                <Label htmlFor="brixLevel" className="flex items-center">
                  BRIX Level <span className="ml-1 text-red-600">*</span>
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formData.brixLevel[0]}
                  onChange={e => handleInputChange('brixLevel', [parseFloat(e.target.value)])}
                  id="brixLevel"
                  className="w-full"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={formData.brixLevel[0]}
                />
                <p className="text-sm text-gray-600 mt-1">Selected BRIX: {formData.brixLevel[0]}</p>
                {errors.brixLevel && (
                  <p className="text-red-600 text-sm mt-1">{errors.brixLevel}</p>
                )}
              </div>
  
              {/* Location with autocomplete - required */}
              <div className="relative">
                <Label htmlFor="location" className="flex items-center">
                  Location <span className="ml-1 text-red-600">*</span>
                </Label>
                <input
                  id="location"
                  type="text"
                  placeholder="Start typing location..."
                  autoComplete="off"
                  value={formData.location}
                  onChange={e => handleInputChange('location', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                  aria-autocomplete="list"
                  aria-expanded={locationSuggestions.length > 0}
                  aria-haspopup="listbox"
                  aria-invalid={!!errors.location}
                />
                {errors.location && (
                  <p className="text-red-600 text-sm mt-1">{errors.location}</p>
                )}
  
                {locationSuggestions.length > 0 && (
                  <ul
                    role="listbox"
                    className="absolute z-30 top-full left-0 right-0 mt-1 max-h-40 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
                  >
                    {locationSuggestions.map(suggestion => (
                      <li
                        key={suggestion.id}
                        role="option"
                        tabIndex={-1}
                        className="cursor-pointer px-3 py-2 hover:bg-blue-100"
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
                  className="mt-3 inline-flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
  
              {/* Dates and other optional fields in grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="measurementDate" className="flex items-center">
                    Measurement Date <span className="ml-1 text-red-600">*</span>
                  </Label>
                  <Input
                    type="date"
                    id="measurementDate"
                    value={formData.measurementDate}
                    onChange={e => handleInputChange('measurementDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={errors.measurementDate ? 'border-red-500' : ''}
                  />
                  {errors.measurementDate && (
                    <p className="text-red-600 text-sm mt-1">{errors.measurementDate}</p>
                  )}
                </div>
  
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    type="date"
                    id="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={e => handleInputChange('purchaseDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
  
                <div>
                  <Label htmlFor="time">Harvest Time</Label>
                  <Input
                    type="time"
                    id="time"
                    value={formData.time}
                    onChange={e => handleInputChange('time', e.target.value)}
                  />
                </div>
              </div>
  
              {/* Farm Location & Contributor Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="farmLocation">Farm Location</Label>
                  <Input
                    id="farmLocation"
                    value={formData.farmLocation}
                    onChange={e => handleInputChange('farmLocation', e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="contributorName">Contributor Name</Label>
                  <Input
                    id="contributorName"
                    value={formData.contributorName}
                    onChange={e => handleInputChange('contributorName', e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
  
              {/* Notes */}
              <div>
                <Label htmlFor="outlierNotes">Notes</Label>
                <Textarea
                  id="outlierNotes"
                  value={formData.outlierNotes}
                  onChange={e => handleInputChange('outlierNotes', e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={errors.outlierNotes ? 'border-red-500' : ''}
                />
                <p className="text-sm text-gray-500 mt-1">{formData.outlierNotes.length}/500 characters</p>
                {errors.outlierNotes && (
                  <p className="text-red-600 text-sm mt-1">{errors.outlierNotes}</p>
                )}
              </div>
  
              {/* Images Upload */}
              <div>
                <Label htmlFor="images">Upload Images (max 3)</Label>
                <input
                  type="file"
                  id="images"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  disabled={formData.images.length >= 3}
                  className="mt-1 mb-2"
                />
                {errors.images && (
                  <p className="text-red-600 text-sm mt-1">{errors.images}</p>
                )}
  
                <div className="flex space-x-4 mt-2">
                  {formData.images.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-24 border border-gray-300 rounded overflow-hidden flex-shrink-0"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-red-400"
                        aria-label="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
  
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-lg font-semibold tracking-wide rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataEntry;