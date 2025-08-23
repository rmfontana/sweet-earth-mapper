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
        const formattedCrops = crops.map((name, index) => ({ id: `crop-${index}`, name }));
        const formattedBrands = brands.map((name, index) => ({ id: `brand-${index}`, name }));
        const formattedStores = stores.map((name, index) => ({ id: `store-${index}`, name }));

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