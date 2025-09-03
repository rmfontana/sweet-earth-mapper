import { useState, useEffect } from 'react';
import { fetchCropTypes } from '../lib/fetchCropTypes';
import { fetchBrands } from '../lib/fetchBrands';
import { fetchLocations } from '../lib/fetchLocations'; // Updated import

interface DatabaseItem {
  id: string;
  name: string;
  label?: string;
}

interface StaticData {
  crops: DatabaseItem[];
  brands: DatabaseItem[];
  locations: DatabaseItem[]; // Renamed from 'stores' to 'locations'
  isLoading: boolean;
  error: string | null;
}

const initialData = {
  crops: [],
  brands: [],
  locations: [], // Renamed from 'stores' to 'locations'
  isLoading: true,
  error: null,
};

// Global cache to prevent re-fetching on every component mount
let staticDataCache: StaticData = { ...initialData };
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
        label: item.label || item.name, // Use label if available, fallback to name
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

  useEffect(() => {
    // Add the current component's state setter to the subscribers list
    subscribers.push(setData);

    // If data is already loaded, update state immediately and return
    if (!staticDataCache.isLoading) {
      setData(staticDataCache);
      return () => {
        // Cleanup: remove the setter when the component unmounts
        const index = subscribers.indexOf(setData);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    }

    // Only one instance should fetch the data
    const fetchData = async () => {
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
            console.error('Error fetching locations:', e); // Updated log message
            return [];
          }),
        ]);

        console.log('Raw fetched results:', {
          cropsResult: cropsResult?.slice(0, 3), // Log first 3 items for debugging
          brandsResult: brandsResult?.slice(0, 3),
          locationsResult: locationsResult?.slice(0, 3), // Updated log name
        });

        // Normalize all data to consistent format
        const formattedCrops = normalizeToItems(cropsResult, 'crop');
        const formattedBrands = normalizeToItems(brandsResult, 'brand');
        const formattedLocations = normalizeToItems(locationsResult, 'location'); // Corrected type and variable

        console.log('Formatted data:', {
          formattedCrops: formattedCrops.slice(0, 3),
          formattedBrands: formattedBrands.slice(0, 3),
          formattedLocations: formattedLocations.slice(0, 3), // Updated log name
        });

        staticDataCache = {
          crops: formattedCrops,
          brands: formattedBrands,
          locations: formattedLocations, // Updated key to 'locations'
          isLoading: false,
          error: null,
        };

        updateSubscribers(staticDataCache);
        console.log('Static data cache updated successfully');
      } catch (e) {
        console.error('Failed to fetch static data:', e);
        staticDataCache = {
          ...staticDataCache,
          isLoading: false,
          error: `Failed to load static data: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
        updateSubscribers(staticDataCache);
      } finally {
        isFetching = false;
      }
    };

    fetchData();

    return () => {
      // Cleanup: remove the setter when the component unmounts
      const index = subscribers.indexOf(setData);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }, []);

  return data;
};