import { supabase } from '../integrations/supabase/client';

export interface Store {
  id: string;
  name: string; // The unique identifier for the store.
  label: string; // The human-readable name for display.
}

export const fetchStores = async (): Promise<Store[]> => {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, label') 
    .order('name');

  if (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }

  return data || [];
};
