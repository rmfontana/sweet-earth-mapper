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

    try {
      // Fetch crop types dynamically from DB
      const cropTypes = await fetchCropTypes();
      console.log('🌾 CropThresholdContext: Fetched crop types:', cropTypes.map(c => c.name));

      const newCache: CropThresholdCache = {};

      await Promise.all(
        cropTypes.map(async (cropType) => {
          try {
            const normalizedCropName = cropType.name.toLowerCase().trim();
            const cropData = await fetchBrixByCrop(normalizedCropName);
            if (cropData?.brixLevels) {
              newCache[normalizedCropName] = cropData.brixLevels;
              console.log(`🌾 CropThresholdContext: Cached thresholds for ${normalizedCropName}:`, cropData.brixLevels);
            } else {
              console.warn(`🌾 CropThresholdContext: No brix levels found for ${normalizedCropName}`);
            }
          } catch (error) {
            console.error(`🌾 CropThresholdContext: Failed to fetch brix for ${cropType.name}`, error);
          }
        })
      );

      console.log('🌾 CropThresholdContext: Final cache keys:', Object.keys(newCache));
      setCache(newCache);
    } catch (error) {
      console.error('🌾 CropThresholdContext: Error reloading cache:', error);
    } finally {
      setLoading(false);
    }
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
