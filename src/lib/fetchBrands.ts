// lib/fetchBrands.ts
import { supabase } from '../integrations/supabase/client';

export async function fetchBrands(): Promise<string[]> {
  const { data, error } = await supabase.from('brands').select('name');
  if (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
  return data.map(brand => brand.name).filter(Boolean);
}