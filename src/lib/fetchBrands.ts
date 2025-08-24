import { supabase } from '../integrations/supabase/client';

export interface Brand {
  id: string;
  name: string;
}

export const fetchBrands = async (): Promise<Brand[]> => {
  const { data, error } = await supabase
    .from('brands') 
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }

  return data || [];
};