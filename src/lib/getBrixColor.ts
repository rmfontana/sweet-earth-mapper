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
   * Gets a consistent color for brix levels, based on crop-specific thresholds.
   * @param brixLevel The brix value.
   * @param thresholds Thresholds for poor, average, good, and excellent.
   * @param mode Optional mode: 'bg' for Tailwind classes, 'hex' for hex colors. Default is 'bg'.
   * @returns A string representing the color.
   */
  export function getBrixColor(
    brixLevel: number | null | undefined,
    thresholds: BrixThresholds | undefined,
    mode: ColorMode = 'bg'
  ): string {
    const colors = colorMap[mode];
  
    if (brixLevel === null || brixLevel === undefined || isNaN(brixLevel)) {
      return colors.fallback;
    }
  
    if (!thresholds) {
      return colors.fallback;
    }
  
    const { poor, average, good, excellent } = thresholds;
  
    if (brixLevel > 0 && brixLevel < average) return colors.poor;
    if (brixLevel >= average && brixLevel < good) return colors.average;
    if (brixLevel >= good && brixLevel < excellent) return colors.good;
    if (brixLevel >= excellent) return colors.excellent;

    // fallback, if brixLevel <= 0 or no other match
    return colors.fallback;
  }
  

  export function useBrixColorFromContext(
    cropName: string,
    brixLevel: number,
    mode: 'bg' | 'hex' = 'bg'
  ): string {
    const { cache, loading } = useCropThresholds();
  
    if (loading) return 'bg-gray-300'; // or spinner fallback
    const thresholds = cache[cropName];
  
    return getBrixColor(brixLevel, thresholds, mode);
  }