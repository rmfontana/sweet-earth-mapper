import { supabase } from '../integrations/supabase/client';
import { Crop } from './fetchCropTypes';

/**
 * Fetches brix levels for a specific crop by its unique name.
 * @param cropName The unique name of the crop to fetch.
 * @returns A promise that resolves to a Crop object or null if not found.
 */
export async function fetchBrixByCrop(cropName: string): Promise<Crop | null> {
  const { data, error } = await supabase
    .from('crops')
    .select('id, name, label, poor_brix, average_brix, good_brix, excellent_brix')
    .eq('name', cropName.toLowerCase())
    .single();

  if (error) {
    console.error('Error fetching crop:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    label: data.label,
    brixLevels: {
      poor: data.poor_brix as number || 0,
      average: data.average_brix as number || 0,
      good: data.good_brix as number || 0,
      excellent: data.excellent_brix as number || 0,
    },
  };
}
