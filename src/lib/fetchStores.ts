import { supabase } from '../integrations/supabase/client';

export interface Store {
  id: string;
  name: string;
}

export const fetchStores = async (): Promise<Store[]> => {
  const { data, error } = await supabase
    .from('stores') 
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }

  return data || [];
};