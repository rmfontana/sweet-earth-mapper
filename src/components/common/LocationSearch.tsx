// src/components/common/LocationSearch.tsx
import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils'; // Utility for conditional classes

interface LocationSuggestion {
  mapbox_id: string;
  name: string;
  full_address?: string;
  // Add other properties as needed
}

interface LocationSearchProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect: (location: { name: string; latitude: number; longitude: number }) => void;
  isLoading?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ value, onChange, onLocationSelect, isLoading = false }) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // In a real app, this should be fetched or loaded from a config
  // For this example, we'll use a placeholder.
  useEffect(() => {
    // Implement your getMapboxToken logic here
    const fetchToken = async () => {
      // This is a placeholder. You'll need to use your actual method.
      // Example: const token = await getMapboxToken();
      const token = 'YOUR_MAPBOX_TOKEN_HERE';
      setMapboxToken(token);
    };
    fetchToken();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const query = value.trim();
      if (!mapboxToken || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchParams = new URLSearchParams({
          q: query,
          access_token: mapboxToken,
          types: 'poi,address',
          limit: '5',
        });
        const res = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?${searchParams.toString()}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          console.error('Location search error:', e);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value, mapboxToken]);

  const handleSelect = async (suggestion: LocationSuggestion) => {
    if (!mapboxToken) return;

    const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${mapboxToken}`;
    try {
      const res = await fetch(retrieveUrl);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const longitude = feature.geometry.coordinates[0];
        const latitude = feature.geometry.coordinates[1];
        const fullAddress = feature.properties.full_address || feature.properties.name;
        onLocationSelect({ name: fullAddress, latitude, longitude });
        setSuggestions([]);
      }
    } catch (e) {
      console.error('Retrieve API error:', e);
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
          placeholder="Search for a location"
          className="pl-10"
        />
        {(isLoading || isSearching) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.mapbox_id}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion.full_address || suggestion.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearch;