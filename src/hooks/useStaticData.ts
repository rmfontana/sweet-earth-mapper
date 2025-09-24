import { useState, useEffect, useCallback } from 'react';
import { fetchCropTypes } from '../lib/fetchCropTypes';
import { fetchBrands } from '../lib/fetchBrands';
import { fetchLocations } from '../lib/fetchLocations';

// Interface for a generic database item.
interface DatabaseItem {
  id: string;
  name: string;
  label?: string;
}

// Interface for the static data returned by the hook.
// This now includes a 'refreshData' function.
interface StaticData {
  crops: DatabaseItem[];
  brands: DatabaseItem[];
  locations: DatabaseItem[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => void; // Added the refreshData function to the interface
}

const initialData = {
  crops: [],
  brands: [],
  locations: [],
  isLoading: true,
  error: null,
};

// Global cache to prevent re-fetching on every component mount.
let staticDataCache: StaticData = {
  ...initialData,
  // The initial state of the cache needs a no-op refresh function.
  refreshData: () => { },
};
let isFetching = false;
const subscribers: React.Dispatch<React.SetStateAction<StaticData>>[] = [];

// Function to update all subscribers
const updateSubscribers = (newData: StaticData) => {
  subscribers.forEach(setter => setter(newData));
};

// Helper function to safely convert any data to DatabaseItem format
const normalizeToItems = (data: any[], type: string): DatabaseItem[] => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((item, index) => {
    // If it's already a proper object with id and name
    if (item && typeof item === 'object' && 'id' in item && 'name' in item && typeof item.name === 'string') {
      return {
        id: String(item.id),
        name: item.name,
        label: item.label || item.name,
      };
    }

    // If it's a string
    if (typeof item === 'string') {
      return {
        id: `temp-${type}-${index}`,
        name: item,
        label: item,
      };
    }

    // If it's an object but without proper structure, try to extract name
    if (item && typeof item === 'object') {
      const name = item.name || item.title || item.label || String(item);
      const label = item.label || name;
      return {
        id: `temp-${type}-${index}`,
        name: typeof name === 'string' ? name : `Unknown ${type} ${index}`,
        label: typeof label === 'string' ? label : `Unknown ${type} ${index}`,
      };
    }

    // Fallback for any other type
    return {
      id: `temp-${type}-${index}`,
      name: `Unknown ${type} ${index}`,
      label: `Unknown ${type} ${index}`,
    };
  });
};

export const useStaticData = (): StaticData => {
  const [data, setData] = useState<StaticData>(staticDataCache);

  // This useCallback function encapsulates the data fetching logic.
  const fetchData = useCallback(async () => {
    // This check ensures only one fetch operation runs at a time.
    if (isFetching) return;
    isFetching = true;

    try {
      console.log('Fetching static data...');

      const [cropsResult, brandsResult, locationsResult] = await Promise.all([
        fetchCropTypes().catch(e => {
          console.error('Error fetching crops:', e);
          return [];
        }),
        fetchBrands().catch(e => {
          console.error('Error fetching brands:', e);
          return [];
        }),
        fetchLocations().catch(e => {
          console.error('Error fetching locations:', e);
          return [];
        }),
      ]);

      console.log('Raw fetched results:', {
        cropsResult: cropsResult?.slice(0, 3),
        brandsResult: brandsResult?.slice(0, 3),
        locationsResult: locationsResult?.slice(0, 3),
      });

      const formattedCrops = normalizeToItems(cropsResult, 'crop');
      const formattedBrands = normalizeToItems(brandsResult, 'brand');
      const formattedLocations = normalizeToItems(locationsResult, 'location');

      console.log('Formatted data:', {
        formattedCrops: formattedCrops.slice(0, 3),
        formattedBrands: formattedBrands.slice(0, 3),
        formattedLocations: formattedLocations.slice(0, 3),
      });

      // Update the global cache with the new data.
      staticDataCache = {
        crops: formattedCrops,
        brands: formattedBrands,
        locations: formattedLocations,
        isLoading: false,
        error: null,
        refreshData: fetchData, // Pass the fetchData function to the cache.
      };

      updateSubscribers(staticDataCache);
      console.log('Static data cache updated successfully');
    } catch (e) {
      console.error('Failed to fetch static data:', e);
      staticDataCache = {
        ...staticDataCache,
        isLoading: false,
        error: `Failed to load static data: ${e instanceof Error ? e.message : 'Unknown error'}`,
        refreshData: fetchData, // Pass the fetchData function even on error.
      };
      updateSubscribers(staticDataCache);
    } finally {
      isFetching = false;
    }
  }, []); // Empty dependency array ensures this function is created only once.

  useEffect(() => {
    // On mount, subscribe the component to updates.
    subscribers.push(setData);

    // If the data is not yet loaded, start the fetch process.
    if (staticDataCache.isLoading) {
      fetchData();
    } else {
      // If data is already in the cache, update state immediately.
      setData(staticDataCache);
    }

    // Cleanup: remove the setter when the component unmounts.
    return () => {
      const index = subscribers.indexOf(setData);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }, [fetchData]); // Dependency on fetchData ensures the effect has access to the latest function.

  // Return the data object with the fetchData function.
  // This allows components to trigger a refresh manually.
  return { ...data, refreshData: fetchData };
};