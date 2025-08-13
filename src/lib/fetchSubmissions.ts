// src/lib/fetchSubmissions.ts

import { supabase } from '../integrations/supabase/client';
import { QueryData } from '@supabase/supabase-js'; // Correctly imported from Supabase
import { BrixDataPoint } from '../types'; // Your local BrixDataPoint interface

// Define the base Supabase query string cleanly outside the function to avoid re-creation
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

// Infer the type of the data returned by the Supabase query using the clean baseQuery
type SubmissionsWithJoins = QueryData<typeof baseQuery>;

/**
 * Helper function to format raw Supabase submission data into the BrixDataPoint interface.
 * @param item The raw data object from Supabase.
 * @returns Formatted BrixDataPoint object.
 */
function formatSubmissionData(item: SubmissionsWithJoins[number]): BrixDataPoint {
  return {
    id: item.id,
    brixLevel: item.brix_value,
    verified: item.verified,
    verifiedAt: item.verified_at,
    variety: item.crop_variety ?? '',
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
    outlier_notes: item.outlier_notes ?? '',
    images: item.submission_images?.map(img => img.image_url) ?? [],
    poorBrix: item.crop?.poor_brix,
    averageBrix: item.crop?.average_brix,
    goodBrix: item.crop?.good_brix,
    excellentBrix: item.crop?.excellent_brix,
  };
}

/**
 * Fetches and formats all submissions, applying data cleaning and authentication checks.
 * @returns A promise that resolves to an array of BrixDataPoint.
 */
export async function fetchFormattedSubmissions(): Promise<BrixDataPoint[]> {
  // --- START AUTHENTICATION DEBUGGING LOGS ---
  // Get the current user session *before* making the data query
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.groupCollapsed('Debugging fetchFormattedSubmissions (Auth Status)');
  console.log('Current authenticated user:', user);
  console.log('Auth error (if any):', authError);
  console.groupEnd();
  // --- END AUTHENTICATION DEBUGGING LOGS ---

  // Perform the Supabase query with ordering
  const { data, error } = await baseQuery.order('assessment_date', { ascending: false });

  // --- START SUPABASE RESPONSE DEBUGGING LOGS ---
  console.groupCollapsed('Debugging fetchFormattedSubmissions (Supabase Data Response)');
  console.log('Raw Supabase data (before validation):', data);
  console.log('Raw Supabase error (if any):', error);
  console.groupEnd();
  // --- END SUPABASE RESPONSE DEBUGGING LOGS ---

  if (error) {
    console.error('Error fetching submissions from Supabase:', error);
    return []; // Return an empty array on error to prevent further crashes
  }

  // Ensure data is an array before mapping and filtering. This is a crucial safeguard.
  const submissionsToFormat = Array.isArray(data) ? data : [];
  console.log(`Prepared ${submissionsToFormat.length} submissions for formatting (after Array.isArray check).`);

  const formattedData = submissionsToFormat.map(formatSubmissionData);

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
      console.warn(`Submission ${item.id} has invalid coordinates and will be filtered out:`, {
        latitude: item.latitude,
        longitude: item.longitude,
        locationName: item.locationName,
        fullItem: item
      });
    }
    return hasValidCoords;
  });

  console.log(`${validSubmissions.length} out of ${formattedData.length} submissions have valid coordinates.`);
  console.log('Sample valid submission (if any):', validSubmissions[0]);

  return validSubmissions;
}

/**
 * Fetches a single submission by its ID.
 * @param id The ID of the submission to fetch.
 * @returns A promise that resolves to a BrixDataPoint object or null if not found.
 */
export async function fetchSubmissionById(id: string): Promise<BrixDataPoint | null> {
  const { data, error } = await baseQuery.eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      console.warn(`No submission found with ID: ${id}`);
      return null;
    }
    console.error(`Error fetching single submission with ID ${id}:`, error);
    throw error;
  }
  return data ? formatSubmissionData(data as SubmissionsWithJoins[number]) : null;
}
