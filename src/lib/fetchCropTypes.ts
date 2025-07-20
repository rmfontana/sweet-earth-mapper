// lib/fetchCropTypes.ts
import { supabase } from '../integrations/supabase/client';

export async function fetchCropTypes(): Promise<string[]> {
  const { data, error } = await supabase.from('crops').select('name');
  if (error) {
    console.error('Error fetching crops:', error);
    return [];
  }
  return data.map(crop => crop.name).filter(Boolean);
}