// fetchSubmissions.ts
import { supabase } from '../integrations/supabase/client';
import { QueryData } from '@supabase/supabase-js';

const query = supabase.from('submissions').select(`
  id,
  timestamp,
  brix_value,
  verified,
  verified_at,
  label,
  location:location_id (
    id,
    name,
    latitude,
    longitude,
    place_id
  ),
  crop:crop_id (
    id,
    name,
    poor_brix,
    average_brix,
    good_brix,
    excellent_brix,
    category
  ),
  store:store_id (
    id,
    name,
    location_id
  ),
  brand:brand_id (
    id,
    name
  ),
  user:users!user_id (
    id,
    display_name
  ),
  verifier:users!verified_by (
    id,
    display_name
  )
`).order('timestamp', { ascending: false });

type SubmissionsWithJoins = QueryData<typeof query>;

export async function fetchFormattedSubmissions() {
  const { data, error } = await query;
  if (error) throw error;

  return (data as SubmissionsWithJoins).map(item => ({
    id: item.id,
    brixLevel: item.brix_value,
    verified: item.verified,
    verifiedAt: item.verified_at,
    label: item.label ?? '',
    cropType: item.crop?.name ?? 'Unknown',
    category: item.crop?.category ?? '',
    latitude: item.location?.latitude,
    longitude: item.location?.longitude,
    storeName: item.store?.name ?? '',
    brandName: item.brand?.name ?? '',
    submittedBy: item.user?.display_name ?? 'Anonymous',
    verifiedBy: item.verifier?.display_name ?? '',
    submittedAt: item.timestamp,
    images: []
  }));
}
