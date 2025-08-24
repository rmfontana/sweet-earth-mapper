import { useState, useEffect } from 'react';
import { fetchCropTypes } from '../lib/fetchCropTypes';
import { fetchBrands } from '../lib/fetchBrands';
import { fetchStores } from '../lib/fetchStores';

interface DatabaseItem {
  id: string;
  name: string;
}

interface StaticData {
  crops: DatabaseItem[];
  brands: DatabaseItem[];
  stores: DatabaseItem[];
  isLoading: boolean;
  error: string | null;
}

const initialData = {
  crops: [],
  brands: [],
  stores: [],
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
        name: item.name
      };
    }
    
    // If it's a string
    if (typeof item === 'string') {
      return {
        id: `temp-${type}-${index}`,
        name: item
      };
    }
    
    // If it's an object but without proper structure, try to extract name
    if (item && typeof item === 'object') {
      const name = item.name || item.title || item.label || String(item);
      return {
        id: `temp-${type}-${index}`,
        name: typeof name === 'string' ? name : `Unknown ${type} ${index}`
      };
    }
    
    // Fallback for any other type
    return {
      id: `temp-${type}-${index}`,
      name: `Unknown ${type} ${index}`
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
        
        const [cropsResult, brandsResult, storesResult] = await Promise.all([
          fetchCropTypes().catch(e => {
            console.error('Error fetching crops:', e);
            return [];
          }),
          fetchBrands().catch(e => {
            console.error('Error fetching brands:', e);
            return [];
          }),
          fetchStores().catch(e => {
            console.error('Error fetching stores:', e);
            return [];
          }),
        ]);

        console.log('Raw fetched results:', { 
          cropsResult: cropsResult?.slice(0, 3), // Log first 3 items for debugging
          brandsResult: brandsResult?.slice(0, 3),
          storesResult: storesResult?.slice(0, 3)
        });

        // Normalize all data to consistent format
        const formattedCrops = normalizeToItems(cropsResult, 'crop');
        const formattedBrands = normalizeToItems(brandsResult, 'brand');
        const formattedStores = normalizeToItems(storesResult, 'store');

        console.log('Formatted data:', { 
          formattedCrops: formattedCrops.slice(0, 3),
          formattedBrands: formattedBrands.slice(0, 3),
          formattedStores: formattedStores.slice(0, 3)
        });

        staticDataCache = {
          crops: formattedCrops,
          brands: formattedBrands,
          stores: formattedStores,
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