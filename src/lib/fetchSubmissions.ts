import { supabase } from '../integrations/supabase/client';
import { QueryData } from '@supabase/supabase-js';

// Build your query
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
    place_id,
    geom
  ),
  crop:crop_id (
    id,
    name,
    max_brix,
    min_brix
  ),
  store:store_id (
    id,
    name
  ),
  brand:brand_id (
    id,
    name
  ),
  user:users!user_id (
    id,
    display_name,
    role,
    points,
    submission_count,
    last_submission
  ),
  verifier:users!verified_by (
    id,
    display_name,
    role,
    points,
    submission_count,
    last_submission
  )
`).order('timestamp', { ascending: false });

// Dynamically infer the type from the query itself
type SubmissionsWithJoins = QueryData<typeof query>;

export async function fetchFormattedSubmissions() {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
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
          place_id,
          geom
        ),
        crop:crop_id (
          id,
          name,
          max_brix,
          min_brix
        ),
        store:store_id (
          id,
          name
        ),
        brand:brand_id (
          id,
          name
        ),
        user:users!user_id (
          id,
          display_name,
          role,
          points,
          submission_count,
          last_submission
        ),
        verifier:users!verified_by (
          id,
          display_name,
          role,
          points,
          submission_count,
          last_submission
        )
      `)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
  
    return data.map(item => ({
      id: item.id,
      brixLevel: item.brix_value,
      verified: item.verified,
      verifiedAt: item.verified_at,
      label: item.label ?? '',
      cropType: item.crop?.name ?? 'Unknown',
      latitude: item.location?.latitude,
      longitude: item.location?.longitude,
      storeName: item.store?.name ?? '',
      brandName: item.brand?.name ?? '',
      submittedBy: item.user?.display_name ?? 'Anonymous',
      verifiedBy: item.verifier?.display_name ?? 'Unknown',
      submittedAt: item.timestamp,
      images: []  // extend later
    }));
  }
  
  