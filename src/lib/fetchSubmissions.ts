// fetchSubmissions.ts
import { supabase } from '../integrations/supabase/client';
import { QueryData } from '@supabase/supabase-js';

const query = supabase.from('submissions').select(`
  id,
  assessment_date,
  brix_value,
  verified,
  verified_at,
  crop_variety,
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
  ),
  submission_images:submission_images (
    id,
    image_url
  )
`).order('assessment_date', { ascending: false });

type SubmissionsWithJoins = QueryData<typeof query>;

export async function fetchFormattedSubmissions() {
  const { data, error } = await query;
  if (error) throw error;

  console.log(`Fetched ${data.length} total submissions from database`);

  const formattedData = (data as SubmissionsWithJoins).map(item => ({
    id: item.id,
    brixLevel: item.brix_value,
    verified: item.verified,
    verifiedAt: item.verified_at,
    label: item.crop_variety ?? '',
    cropType: item.crop?.name ?? 'Unknown',
    category: item.crop?.category ?? '',
    latitude: item.location?.latitude,
    longitude: item.location?.longitude,
    locationName: item.location?.name ?? '',
    storeName: item.store?.name ?? '',
    brandName: item.brand?.name ?? '',
    submittedBy: item.user?.display_name ?? 'Anonymous',
    verifiedBy: item.verifier?.display_name ?? '',
    submittedAt: item.assessment_date,
    images: item.submission_images?.map(img => img.image_url) ?? []
  }));

  // Filter out submissions with invalid coordinates
  const validSubmissions = formattedData.filter(item => {
    const hasValidCoords = item.latitude != null && 
                          item.longitude != null && 
                          typeof item.latitude === 'number' && 
                          typeof item.longitude === 'number' &&
                          !isNaN(item.latitude) && 
                          !isNaN(item.longitude) &&
                          item.latitude >= -90 && item.latitude <= 90 &&
                          item.longitude >= -180 && item.longitude <= 180;
    
    if (!hasValidCoords) {
      console.warn(`Submission ${item.id} has invalid coordinates:`, {
        latitude: item.latitude,
        longitude: item.longitude,
        locationData: item
      });
    }
    
    return hasValidCoords;
  });

  console.log(`${validSubmissions.length} out of ${formattedData.length} submissions have valid coordinates`);
  console.log('Sample valid submission:', validSubmissions[0]);

  return validSubmissions;
}