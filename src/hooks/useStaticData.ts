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
        const [crops, brands, stores] = await Promise.all([
          fetchCropTypes(),
          fetchBrands(),
          fetchStores(),
        ]);

        console.log('Raw fetched data:', { crops, brands, stores });

        // Check if the fetched data already contains objects with id and name properties
        // If fetchCropTypes returns objects like { id: 'uuid', name: 'apple' }, use them directly
        // If it returns strings like ['apple', 'banana'], we need to handle that differently
        
        let formattedCrops: DatabaseItem[];
        let formattedBrands: DatabaseItem[];
        let formattedStores: DatabaseItem[];

        // Check if crops is an array of objects with id and name, or just strings
        if (crops.length > 0 && crops[0] !== null && typeof crops[0] === 'object' && 'id' in crops[0] && 'name' in crops[0]) {
          formattedCrops = crops as DatabaseItem[];
        } else {
          // If it's an array of strings, we need to fetch the actual objects with IDs
          console.warn('fetchCropTypes returned strings instead of objects with IDs. This needs to be fixed in the fetch function.');
          // For now, create temporary IDs, but this should be fixed at the source
          formattedCrops = (crops as unknown as string[]).map((name, index) => ({ id: `temp-crop-${index}`, name }));
        }

        if (brands.length > 0 && brands[0] !== null && typeof brands[0] === 'object' && 'id' in brands[0] && 'name' in brands[0]) {
          formattedBrands = brands as DatabaseItem[];
        } else {
          console.warn('fetchBrands returned strings instead of objects with IDs. This needs to be fixed in the fetch function.');
          formattedBrands = (brands as unknown as string[]).map((name, index) => ({ id: `temp-brand-${index}`, name }));
        }

        if (stores.length > 0 && stores[0] !== null && typeof stores[0] === 'object' && 'id' in stores[0] && 'name' in stores[0]) {
          formattedStores = stores as DatabaseItem[];
        } else {
          console.warn('fetchStores returned strings instead of objects with IDs. This needs to be fixed in the fetch function.');
          formattedStores = (stores as unknown as string[]).map((name, index) => ({ id: `temp-store-${index}`, name }));
        }

        console.log('Formatted data:', { formattedCrops, formattedBrands, formattedStores });

        staticDataCache = {
          crops: formattedCrops,
          brands: formattedBrands,
          stores: formattedStores,
          isLoading: false,
          error: null,
        };
        updateSubscribers(staticDataCache);
      } catch (e) {
        console.error('Failed to fetch static data:', e);
        staticDataCache = {
          ...staticDataCache,
          isLoading: false,
          error: 'Failed to load static data.',
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