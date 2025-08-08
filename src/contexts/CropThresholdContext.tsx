import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchBrixByCrop } from '../lib/fetchBrixByCrop';
import { fetchCropTypes } from '../lib/fetchCropTypes';
import { BrixThresholds } from '../lib/getBrixQuality';

type CropThresholdCache = Record<string, BrixThresholds>;

type CropThresholdContextType = {
  cache: CropThresholdCache;
  loading: boolean;
  reloadCache: () => Promise<void>;
};

const CropThresholdContext = createContext<CropThresholdContextType | undefined>(undefined);

type CropThresholdProviderProps = {
  children: ReactNode;
};

export const CropThresholdProvider: React.FC<CropThresholdProviderProps> = ({ children }) => {
  const [cache, setCache] = useState<CropThresholdCache>({});
  const [loading, setLoading] = useState(true);

  const reloadCache = async () => {
    setLoading(true);

    // Fetch crop names dynamically from DB
    const cropNames = await fetchCropTypes();

    const newCache: CropThresholdCache = {};

    await Promise.all(
      cropNames.map(async (name) => {
        try {
          const cropData = await fetchBrixByCrop(name);
          if (cropData?.brixLevels) {
            newCache[name] = cropData.brixLevels;
          }
        } catch (error) {
          console.error(`Failed to fetch brix for ${name}`, error);
        }
      })
    );

    setCache(newCache);
    setLoading(false);
  };

  useEffect(() => {
    reloadCache();
  }, []);

  return (
    <CropThresholdContext.Provider value={{ cache, loading, reloadCache }}>
      {children}
    </CropThresholdContext.Provider>
  );
};

export const useCropThresholds = () => {
  const ctx = useContext(CropThresholdContext);
  if (!ctx) throw new Error('useCropThresholds must be used inside CropThresholdProvider');
  return ctx;
};
