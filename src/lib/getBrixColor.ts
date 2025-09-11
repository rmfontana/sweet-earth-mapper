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

  if (value === null || value === undefined || isNaN(value)) {
    return colors.fallback;
  }

  // Use a fallback if thresholds are not provided or are invalid
  if (!thresholds || !thresholds.poor || !thresholds.average || !thresholds.good || !thresholds.excellent) {
    return colors.fallback;
  }

  const { poor, average, good, excellent } = thresholds;

  // Determine if the scale is ascending (higher value is better, e.g., Brix)
  // or descending (lower value is better, e.g., Rank)
  const isAscending = excellent > poor;

  if (isAscending) {
    if (value >= excellent) return colors.excellent;
    if (value >= good) return colors.good;
    if (value >= average) return colors.average;
    return colors.poor;
  } else {
    // Descending scale
    if (value <= excellent) return colors.excellent;
    if (value <= good) return colors.good;
    if (value <= average) return colors.average;
    return colors.poor;
  }
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