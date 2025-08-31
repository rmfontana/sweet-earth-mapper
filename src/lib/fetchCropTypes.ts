import { supabase } from '../integrations/supabase/client';

export interface CropType {
  id: string;
  name: string;
}

/**
 * Interface for a crop, including its unique name, human-readable label, and brix levels.
 */
export interface Crop {
  id: string;
  name: string;
  label: string | null;
  brixLevels: BrixLevels;
}

/**
 * Fetches all crop types, including their unique name and human-readable label.
 * @returns A promise that resolves to an array of CropType objects.
 */
export const fetchCropTypes = async (): Promise<CropType[]> => {
  const { data, error } = await supabase
    .from('crops')
    .select('id, name, label')
    .order('label');

  if (error) {
    console.error('Error fetching crop types:', error);
    throw error;
  }

  return data as CropType[] || [];
};
