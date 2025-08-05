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
    outlierNotes: '',    // keep this, remove notes
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
          )}.json?access_token=${mapboxToken}&autocomplete=true&limit=5`,
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

  const selectLocationSuggestion = (feature: LocationFeature) => {
    setFormData(p => ({
      ...p,
      location: feature.place_name,
      longitude: feature.center[0],
      latitude: feature.center[1],
    }));
    setLocationSuggestions([]);
  };

  // Reverse geocode user location on capture button
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
          setFormData(p => ({ ...p, latitude, longitude, location: placeName }));
          toast({ title: 'Location captured', description: placeName });
        } catch {
          setFormData(p => ({
            ...p,
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

    if (!cropType) newErrors.cropType = 'Please select or enter a crop type';
    if (!variety) newErrors.variety = 'Variety is required';
    if (formData.brixLevel[0] < 0 || formData.brixLevel[0] > 100)
      newErrors.brixLevel = 'BRIX must be between 0–100';
    if (!location) newErrors.location = 'Location is required';
    if (new Date(formData.measurementDate) > new Date())
      newErrors.measurementDate = 'Date cannot be in the future';
    if (outlierNotes.length > 500) newErrors.outlierNotes = 'Notes too long (max 500 characters)';
    if (brand && !brands.includes(brand)) newErrors.brand = 'Brand not recognized';
    if (store && !stores.includes(store)) newErrors.store = 'Store not recognized';

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
      const locationName = sanitizeInput(formData.location);
  
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
  
      // --- Brand: find or insert (optional) ---
      let brandId: string | null = null;
      if (brandName) {
        let { data: brandData, error: brandErr } = await supabase
          .from('brands')
          .select('id')
          .eq('name', brandName)
          .single();
  
        if (brandErr || !brandData) {
          // Insert new brand
          const { data: insertedBrand, error: insertBrandErr } = await supabase
            .from('brands')
            .insert({ name: brandName })
            .select('id')
            .single();
  
          if (insertBrandErr || !insertedBrand) throw new Error('Failed to create new brand');
          brandData = insertedBrand;
        }
        brandId = brandData.id;
      }
  
      // --- Store: find or insert (optional) ---
      let storeId: string | null = null;
      if (storeName) {
        let { data: storeData, error: storeErr } = await supabase
          .from('stores')
          .select('id')
          .eq('name', storeName)
          .single();
  
        if (storeErr || !storeData) {
          // Insert new store
          const { data: insertedStore, error: insertStoreErr } = await supabase
            .from('stores')
            .insert({ name: storeName })
            .select('id')
            .single();
  
          if (insertStoreErr || !insertedStore) throw new Error('Failed to create new store');
          storeData = insertedStore;
        }
        storeId = storeData.id;
      }
  
      // --- Location ---
      const { data: locationData, error: locErr } = await supabase
        .from('locations')
        .insert({
          latitude: formData.latitude,
          longitude: formData.longitude,
          name: locationName,
        })
        .select()
        .single();
  
      if (locErr || !locationData) throw new Error('Location insert failed');
  
      // --- Insert submission ---
      const { error: submitErr } = await supabase.from('submissions').insert({
        crop_id: cropData.id,
        location_id: locationData.id,
        store_id: storeId,
        brand_id: brandId,
        crop_variety: variety,                       
        brix_value: formData.brixLevel[0],
        user_id: user?.id,
        assessment_date: new Date(formData.measurementDate).toISOString(),  
        purchase_date: formData.purchaseDate || null,
        farm_location: formData.farmLocation || null,
        contributor_name: formData.contributorName || null,
        harvest_time: formData.time || null,
        outlier_notes: formData.outlierNotes || null,  
      });
  
      if (submitErr) throw submitErr;
  
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
                {/* Crop Type */}
                <div className="relative">
                  <Label htmlFor="cropType">Crop Type</Label>
                  <input
                    id="cropType"
                    list="crop-types"
                    className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.cropType ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Type or select crop type"
                    value={formData.cropType}
                    onChange={e => setFormData(p => ({ ...p, cropType: e.target.value }))}
                    autoComplete="off"
                  />
                  <datalist id="crop-types">
                    {cropTypes.map(crop => (
                      <option key={crop} value={crop} />
                    ))}
                  </datalist>
                  {errors.cropType && <p className="text-red-600 text-sm mt-1">{errors.cropType}</p>}
                </div>

                {/* Variety */}
                <div>
                  <Label htmlFor="variety">Variety</Label>
                  <Input
                    id="variety"
                    value={formData.variety}
                    onChange={e => setFormData(p => ({ ...p, variety: e.target.value }))}
                    autoComplete="off"
                    className={errors.variety ? 'border-red-500' : ''}
                  />
                  {errors.variety && <p className="text-red-600 text-sm mt-1">{errors.variety}</p>}
                </div>

                {/* Brand */}
                <div className="relative">
                  <Label htmlFor="brand">Brand</Label>
                  <input
                    id="brand"
                    list="brand-list"
                    className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.brand ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Type or select brand"
                    value={formData.brand}
                    onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))}
                    autoComplete="off"
                  />
                  <datalist id="brand-list">
                    {brands.map(brand => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                  {errors.brand && <p className="text-red-600 text-sm mt-1">{errors.brand}</p>}
                </div>

                {/* Store */}
                <div className="relative">
                  <Label htmlFor="store">Store</Label>
                  <input
                    id="store"
                    list="store-list"
                    className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${errors.store ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Type or select store"
                    value={formData.store}
                    onChange={e => setFormData(p => ({ ...p, store: e.target.value }))}
                    autoComplete="off"
                  />
                  <datalist id="store-list">
                    {stores.map(store => (
                      <option key={store} value={store} />
                    ))}
                  </datalist>
                  {errors.store && <p className="text-red-600 text-sm mt-1">{errors.store}</p>}
                </div>
              </div>

              {/* BRIX Level */}
              <div>
                <Label htmlFor="brixLevel">BRIX Level</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formData.brixLevel[0]}
                  onChange={e => setFormData(p => ({ ...p, brixLevel: [parseFloat(e.target.value)] }))}
                  id="brixLevel"
                  className="w-full"
                />
                <p className="text-sm text-gray-600 mt-1">Selected BRIX: {formData.brixLevel[0]}</p>
                {errors.brixLevel && <p className="text-red-600 text-sm mt-1">{errors.brixLevel}</p>}
              </div>

              {/* Location with autocomplete */}
              <div className="relative">
                <Label htmlFor="location">Location</Label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  placeholder="Start typing location..."
                  autoComplete="off"
                  className={`w-full border rounded-md px-3 py-2 text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.location && <p className="text-red-600 text-sm mt-1">{errors.location}</p>}

                {locationSuggestions.length > 0 && (
                  <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-40 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                    {locationSuggestions.map(suggestion => (
                      <li
                        key={suggestion.id}
                        className="cursor-pointer px-3 py-2 hover:bg-blue-100"
                        onClick={() => selectLocationSuggestion(suggestion)}
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

              {/* Dates and other fields in grid for compactness */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="measurementDate">Measurement Date</Label>
                  <Input
                    type="date"
                    id="measurementDate"
                    value={formData.measurementDate}
                    onChange={e => setFormData(p => ({ ...p, measurementDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className={errors.measurementDate ? 'border-red-500' : ''}
                  />
                  {errors.measurementDate && <p className="text-red-600 text-sm mt-1">{errors.measurementDate}</p>}
                </div>

                <div>
                  <Label htmlFor="purchaseDate">Purchase Date (optional)</Label>
                  <Input
                    type="date"
                    id="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={e => setFormData(p => ({ ...p, purchaseDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="time">Harvest Time (optional)</Label>
                  <Input
                    type="time"
                    id="time"
                    value={formData.time}
                    onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Farm Location & Contributor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="farmLocation">Farm Location (optional)</Label>
                  <Input
                    id="farmLocation"
                    value={formData.farmLocation}
                    onChange={e => setFormData(p => ({ ...p, farmLocation: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="contributorName">Contributor Name (optional)</Label>
                  <Input
                    id="contributorName"
                    value={formData.contributorName}
                    onChange={e => setFormData(p => ({ ...p, contributorName: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="outlierNotes">Notes (optional)</Label>
                <Textarea
                  id="outlierNotes"
                  value={formData.outlierNotes}
                  onChange={e => setFormData(p => ({ ...p, outlierNotes: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className={errors.outlierNotes ? 'border-red-500' : ''}
                />
                {errors.outlierNotes && <p className="text-red-600 text-sm mt-1">{errors.outlierNotes}</p>}
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
                {errors.images && <p className="text-red-600 text-sm mt-1">{errors.images}</p>}

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
