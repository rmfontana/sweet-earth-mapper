// lib/fetchStores.ts
import { supabase } from '../integrations/supabase/client';

export async function fetchStores(): Promise<string[]> {
  const { data, error } = await supabase.from('stores').select('name');
  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
  return data.map(store => store.name).filter(Boolean);
}