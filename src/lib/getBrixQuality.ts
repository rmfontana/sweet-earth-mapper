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

    if (brixLevel > 0 && brixLevel < average) return 'Poor';
    if (brixLevel >= average && brixLevel < good) return 'Average';
    if (brixLevel >= good && brixLevel < excellent) return 'Good';
    if (brixLevel >= excellent) return 'Excellent';
  
    return 'Unknown';
  }