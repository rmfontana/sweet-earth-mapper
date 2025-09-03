import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const LocationSearch: React.FC<LocationSearchProps> = ({ 
  value, 
  onChange, 
  onLocationSelect, 
  isLoading = false 
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    sessionRef.current = generateUUID();

    const fetchToken = async () => {
      try {
        const token = await getMapboxToken();
        setMapboxToken(token);
      } catch (e) {
        console.error('Failed to load Mapbox token for search:', e);
        setMapboxToken(null);
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchLocations = useCallback(async (query: string, signal: AbortSignal) => {
    if (!mapboxToken || !sessionRef.current || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest`;
      const params = new URLSearchParams({
        q: query,
        access_token: mapboxToken,
        session_token: sessionRef.current,
        limit: '5',
        language: 'en',
        types: 'address,poi,place,locality'
      });

      const response = await fetch(`${url}?${params}`, { 
        signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mapbox API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const transformedSuggestions: LocationSuggestion[] = data.suggestions?.map((s: any) => ({
        mapbox_id: s.mapbox_id,
        name: s.name,
        full_address: s.full_address,
        place_formatted: s.place_formatted,
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
      const query = inputValue.trim();
      if (query && suggestions.length === 0) {
        searchLocations(query, controller.signal);
      } else if (!query) {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inputValue, searchLocations, suggestions.length]); // Added suggestions.length to the dependency array

  const handleSelect = async (suggestion: LocationSuggestion) => {
    if (!mapboxToken || !sessionRef.current) return;
    
    const locationName = suggestion.full_address || suggestion.name;
    
    // Call the parent's onChange handler to update the form data state
    // This is the key change to make the parent component re-render with the new value
    onChange({
      target: { value: locationName }
    } as React.ChangeEvent<HTMLInputElement>);

    // Immediately clear local state to stop the dropdown from showing
    setInputValue(locationName);
    setSuggestions([]);
    
    setIsSearching(true);
  
    try {
      const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}`;
      const retrieveParams = new URLSearchParams({
        access_token: mapboxToken,
        session_token: sessionRef.current,
      });
  
      const response = await fetch(`${retrieveUrl}?${retrieveParams}`);
      if (!response.ok) {
        throw new Error(`Failed to retrieve coordinates: ${response.status}`);
      }
  
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.geometry.coordinates;
  
        onLocationSelect({ 
          name: locationName, 
          latitude, 
          longitude 
        });
      }
    } catch (e) {
      console.error('Failed to get location coordinates:', e);
      onLocationSelect({ 
        name: locationName, 
        latitude: 0, 
        longitude: 0 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(e); 
    
    if (suggestions.length > 0) {
      setSuggestions([]);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter an address or store name"
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
      
      {inputValue.length >= 2 && !isSearching && suggestions.length === 0 && (
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