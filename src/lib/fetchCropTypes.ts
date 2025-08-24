import { supabase } from '../integrations/supabase/client';

export interface CropType {
  id: string;
  name: string;
}

export const fetchCropTypes = async (): Promise<CropType[]> => {
  const { data, error } = await supabase
    .from('crops') // or whatever your table name is
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching crop types:', error);
    throw error;
  }

  return data || [];
};
