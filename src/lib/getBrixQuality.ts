export type BrixThresholds = {
  poor: number;
  average: number;
  good: number;
  excellent: number;
};

export function getBrixQuality(
  brixLevel: number | null | undefined,
  thresholds: BrixThresholds | undefined
): string {
  if (brixLevel === null || brixLevel === undefined || isNaN(brixLevel) || !thresholds) {
      return 'Unknown';
  }

  const { poor, average, good, excellent } = thresholds;

  // Determine if the scale is ascending (higher value is better)
  // or descending (lower value is better)
  const isAscending = excellent > poor;

  if (isAscending) {
      if (brixLevel >= excellent) return 'Excellent';
      if (brixLevel >= good) return 'Good';
      if (brixLevel >= average) return 'Average';
      if (brixLevel >= poor) return 'Poor';
  } else {
      // Descending scale
      if (brixLevel <= excellent) return 'Excellent';
      if (brixLevel <= good) return 'Good';
      if (brixLevel <= average) return 'Average';
      if (brixLevel <= poor) return 'Poor';
  }

  return 'Unknown';
}