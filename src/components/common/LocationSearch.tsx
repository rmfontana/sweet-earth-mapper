// src/components/common/LocationSearch.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMapboxToken } from '@/lib/getMapboxToken';

interface LocationSuggestion {
  mapbox_id: string;
  name: string;
  full_address?: string;
  place_formatted?: string;
}

interface LocationSearchProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect: (location: { name: string; latitude: number; longitude: number }) => void;
  isLoading?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ 
  value, 
  onChange, 
  onLocationSelect, 
  isLoading = false 
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log('Fetching Mapbox token...');
        const token = await getMapboxToken();
        console.log('Mapbox token received:', token ? 'Success' : 'Failed');
        setMapboxToken(token);
      } catch (e) {
        console.error('Failed to load Mapbox token for search:', e);
        setMapboxToken(null);
      }
    };
    fetchToken();
  }, []);

  const searchLocations = useCallback(async (query: string, signal: AbortSignal) => {
    if (!mapboxToken || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching for:', query);
      
      // Use the geocoding API instead of searchbox for better compatibility
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        access_token: mapboxToken,
        limit: '5',
        types: 'place,locality,neighborhood,address,poi'
      });
      
      const response = await fetch(`${url}?${params}`, { 
        signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mapbox API error:', response.status, response.statusText, errorText);
        throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      
      // Transform geocoding results to match our expected format
      const transformedSuggestions: LocationSuggestion[] = data.features?.map((feature: any) => ({
        mapbox_id: feature.id,
        name: feature.text || feature.place_name,
        full_address: feature.place_name,
        place_formatted: feature.place_name
      })) || [];
      
      setSuggestions(transformedSuggestions);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Location search error:', e);
        setSuggestions([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [mapboxToken]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const query = value.trim();
      if (query) {
        searchLocations(query, controller.signal);
      } else {
        setSuggestions([]);
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [value, searchLocations]);

  const handleSelect = async (suggestion: LocationSuggestion) => {
    if (!mapboxToken) return;

    try {
      // For geocoding API, we can get coordinates directly from the original search
      // Let's search again for the specific item to get coordinates
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(suggestion.full_address || suggestion.name)}.json`;
      const params = new URLSearchParams({
        access_token: mapboxToken,
        limit: '1'
      });
      
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get coordinates: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.geometry.coordinates;
        const locationName = feature.place_name || suggestion.full_address || suggestion.name;
        
        onLocationSelect({ 
          name: locationName, 
          latitude, 
          longitude 
        });
        setSuggestions([]);
      }
    } catch (e) {
      console.error('Failed to get location coordinates:', e);
      // Fallback: just use the name without coordinates
      onLocationSelect({ 
        name: suggestion.full_address || suggestion.name, 
        latitude: 0, 
        longitude: 0 
      });
      setSuggestions([]);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Search for a location (e.g., Oswego, NY)"
          className="pl-10"
        />
        {(isLoading || isSearching) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.mapbox_id}
              className="p-3 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors"
              onClick={() => handleSelect(suggestion)}
            >
              <div className="font-medium text-gray-900">
                {suggestion.name}
              </div>
              {suggestion.full_address && suggestion.full_address !== suggestion.name && (
                <div className="text-gray-500 text-xs mt-1">
                  {suggestion.full_address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {value.length >= 2 && !isSearching && suggestions.length === 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-3">
          <div className="text-sm text-gray-500">
            No locations found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;