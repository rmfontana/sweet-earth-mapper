import { useCropThresholds } from '../contexts/CropThresholdContext';
import { BrixThresholds } from './getBrixQuality';

type ColorMode = 'bg' | 'hex';

const colorMap = {
  bg: {
    poor: 'bg-red-500',
    average: 'bg-orange-500', 
    good: 'bg-yellow-500',
    excellent: 'bg-green-500',
    fallback: 'bg-gray-300',
  },
  hex: {
    poor: '#ef4444',
    average: '#f97316',
    good: '#eab308', 
    excellent: '#22c55e',
    fallback: '#d1d5db', // Tailwind gray-300
  },
};

/**
 * Gets a consistent color for a given value based on a set of thresholds.
 * The function is now robust and handles both ascending (Brix) and descending (Rank) scales.
 * @param value The numerical value (e.g., Brix level, normalized score, rank).
 * @param thresholds An object containing poor, average, good, and excellent threshold values.
 * @param mode Optional mode: 'bg' for Tailwind classes, 'hex' for hex colors. Default is 'bg'.
 * @returns A string representing the color.
 */
export function getBrixColor(
  value: number | null | undefined,
  thresholds: BrixThresholds | undefined,
  mode: ColorMode = 'bg'
): string {
  const colors = colorMap[mode];
  
  // Early return for invalid values
  if (value === null || value === undefined || isNaN(value)) {
    console.log('🔍 getBrixColor: Invalid value, returning fallback', { value });
    return colors.fallback;
  }
  
  // Enhanced validation for thresholds
  if (!thresholds) {
    console.log('🔍 getBrixColor: No thresholds provided, returning fallback', { value, thresholds });
    return colors.fallback;
  }
  
  // Check if all required threshold properties exist and are numbers
  const requiredKeys = ['poor', 'average', 'good', 'excellent'] as const;
  const missingKeys = requiredKeys.filter(key => 
    thresholds[key] === null || 
    thresholds[key] === undefined || 
    typeof thresholds[key] !== 'number' || 
    isNaN(thresholds[key] as number)
  );
  
  if (missingKeys.length > 0) {
    console.log('🔍 getBrixColor: Invalid thresholds, missing or invalid keys:', { 
      missingKeys, 
      thresholds,
      value 
    });
    return colors.fallback;
  }
  
  const { poor, average, good, excellent } = thresholds;
  
  // Determine if the scale is ascending (higher value is better, e.g., Brix)
  // or descending (lower value is better, e.g., Rank)
  const isAscending = excellent > poor;
  
  console.log('🔍 getBrixColor: Processing', { 
    value, 
    thresholds, 
    isAscending, 
    mode 
  });
  
  let selectedColor: string;
  
  if (isAscending) {
    // Ascending scale: higher values are better
    if (value >= excellent) {
      selectedColor = colors.excellent;
    } else if (value >= good) {
      selectedColor = colors.good;
    } else if (value >= average) {
      selectedColor = colors.average;
    } else {
      selectedColor = colors.poor;
    }
  } else {
    // Descending scale: lower values are better
    if (value <= excellent) {
      selectedColor = colors.excellent;
    } else if (value <= good) {
      selectedColor = colors.good;
    } else if (value <= average) {
      selectedColor = colors.average;
    } else {
      selectedColor = colors.poor;
    }
  }
  
  console.log('🔍 getBrixColor: Selected color', { 
    value, 
    selectedColor,
    colorCategory: isAscending ? 
      (value >= excellent ? 'excellent' : value >= good ? 'good' : value >= average ? 'average' : 'poor') :
      (value <= excellent ? 'excellent' : value <= good ? 'good' : value <= average ? 'average' : 'poor')
  });
  
  return selectedColor;
}

export function useBrixColorFromContext(
  cropName: string,
  brixLevel: number,
  mode: 'bg' | 'hex' = 'bg'
): string {
  const { cache, loading } = useCropThresholds();
  
  if (loading) {
    console.log('🔍 useBrixColorFromContext: Still loading, returning fallback');
    return mode === 'bg' ? 'bg-gray-300' : '#d1d5db';
  }
  
  const thresholds = cache?.[cropName];
  console.log('🔍 useBrixColorFromContext:', { 
    cropName, 
    brixLevel, 
    thresholds, 
    cacheKeys: Object.keys(cache || {}) 
  });
  
  return getBrixColor(brixLevel, thresholds, mode);
}