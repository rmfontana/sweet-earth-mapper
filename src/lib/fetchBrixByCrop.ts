import { supabase } from '../integrations/supabase/client';

export async function fetchBrixByCrop(cropName: string) {
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
    brixLevels: {
      poor: Number(data.poor_brix) || 0,
      average: Number(data.average_brix) || 0,
      good: Number(data.good_brix) || 0,
      excellent: Number(data.excellent_brix) || 0,
    },
  };
}
