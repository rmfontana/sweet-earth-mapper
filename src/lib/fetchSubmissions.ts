// src/lib/fetchSubmissions.ts

import { supabase } from '../integrations/supabase/client';
import { QueryData } from '@supabase/supabase-js'; // **CORRECTED: Import QueryData from Supabase**
import { BrixDataPoint } from '../types'; // Import your local BrixDataPoint interface

// The select query string. Ensure it's clean for QueryData inference.
const baseQuery = supabase.from('submissions').select(`
  id,
  assessment_date,
  brix_value,
  verified,
  verified_at,
  crop_variety,
  outlier_notes,
  location:location_id(id,name,latitude,longitude,place_id),
  crop:crop_id(id,name,poor_brix,average_brix,good_brix,excellent_brix,category),
  store:store_id(id,name,location_id),
  brand:brand_id(id,name),
  user:users!user_id(id,display_name),
  verifier:users!verified_by(id,display_name),
  submission_images(id,image_url)
`);

// Infer the type of the data returned by the Supabase query
type SubmissionsWithJoins = QueryData<typeof baseQuery>;

// Helper function to format the fetched data into BrixDataPoint interface
function formatSubmissionData(item: SubmissionsWithJoins[number]): BrixDataPoint {
  const formatted: BrixDataPoint = {
    id: item.id,
    brixLevel: item.brix_value,
    verified: item.verified,
    verifiedAt: item.verified_at,
    variety: item.crop_variety ?? '', // Directly mapped from crop_variety
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
    outlier_notes: item.outlier_notes ?? '', // Directly mapped from outlier_notes
    images: item.submission_images?.map(img => img.image_url) ?? [],
    poorBrix: item.crop?.poor_brix,
    averageBrix: item.crop?.average_brix,
    goodBrix: item.crop?.good_brix,
    excellentBrix: item.crop?.excellent_brix,
  };
  return formatted;
}

export async function fetchFormattedSubmissions(): Promise<BrixDataPoint[]> {
  // Apply sorting directly to the query for consistency
  const { data, error } = await baseQuery.order('assessment_date', { ascending: false });
  if (error) {
    console.error('Error fetching submissions:', error);
    // Return an empty array on error to prevent .map() crash
    return [];
  }

  // **IMPROVED FIX: Explicitly ensure data is an array before mapping**
  // If data is not an array, default to an empty array
  const submissionsToFormat = Array.isArray(data) ? data : [];
  console.log(`Fetched ${submissionsToFormat.length} total submissions from database`);

  const formattedData = (submissionsToFormat as SubmissionsWithJoins).map(formatSubmissionData);

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

// Function to fetch a single submission by ID
export async function fetchSubmissionById(id: string): Promise<BrixDataPoint | null> {
  const { data, error } = await baseQuery.eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      console.warn(`No submission found with ID: ${id}`);
      return null;
    }
    console.error(`Error fetching submission with ID ${id}:`, error);
    throw error;
  }
  // Ensure data is cast correctly before formatting
  return data ? formatSubmissionData(data as SubmissionsWithJoins[number]) : null;
}
