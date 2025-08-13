// src/lib/fetchSubmissions.ts

import { supabase } from '../integrations/supabase/client';
// Removed QueryData import as we're defining the row type manually
import { BrixDataPoint } from '../types'; // Your local BrixDataPoint interface

// Define the base SELECT string cleanly
const SUBMISSIONS_SELECT_QUERY_STRING = `
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
`;

// Manually define the interface that matches the exact shape of data returned by the Supabase select query
// This bypasses complex QueryData inference issues if full Supabase types are not generated.
interface SupabaseSubmissionRow {
  id: string;
  assessment_date: string;
  brix_value: number;
  verified: boolean;
  verified_at: string | null;
  crop_variety: string | null;
  outlier_notes: string | null;
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    place_id: string | null;
  } | null;
  crop: {
    id: string;
    name: string;
    poor_brix: number | null;
    average_brix: number | null;
    good_brix: number | null;
    excellent_brix: number | null;
    category: string | null;
  } | null;
  store: {
    id: string;
    name: string;
    location_id: string;
  } | null;
  brand: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    display_name: string;
  } | null;
  verifier: {
    id: string;
    display_name: string;
  } | null;
  submission_images: {
    id: string;
    image_url: string;
  }[];
}

// Now, SubmissionsWithJoins directly uses this manually defined interface
type SubmissionsWithJoins = SupabaseSubmissionRow;

/**
 * Helper function to format raw Supabase submission data into the BrixDataPoint interface.
 * @param item The raw data object from Supabase.
 * @returns Formatted BrixDataPoint object.
 */
function formatSubmissionData(item: SupabaseSubmissionRow): BrixDataPoint {
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
 * Fetches and formats all submissions, ensuring a fresh query instance.
 * @returns A promise that resolves to an array of BrixDataPoint.
 */
export async function fetchFormattedSubmissions(): Promise<BrixDataPoint[]> {
  // --- START PROMINENT AUTHENTICATION DEBUGGING LOGS ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('--- FETCH SUBMISSIONS AUTH STATUS ---');
  console.log('Auth Status: Current authenticated user:', user);
  console.log('Auth Status: Auth error (if any):', authError);
  console.log('-----------------------------------');
  // --- END PROMINENT AUTHENTICATION DEBUGGING LOGS ---

  // Create a fresh query instance without generic on .from()
  const { data, error } = await supabase.from('submissions')
    .select(SUBMISSIONS_SELECT_QUERY_STRING) // Use the defined string
    .order('assessment_date', { ascending: false });

  // --- START PROMINENT SUPABASE RESPONSE DEBUGGING LOGS ---
  console.log('--- FETCH SUBMISSIONS RAW SUPABASE RESPONSE ---');
  console.log('Raw Supabase data (before validation):', data);
  console.log('Raw Supabase error (if any):', error);
  console.log('-----------------------------------');
  // --- END PROMINENT SUPABASE RESPONSE DEBUGGING LOGS ---

  if (error) {
    console.error('Error fetching submissions from Supabase:', error);
    return [];
  }

  // Ensure data is an array before mapping and filtering. This safeguard remains crucial.
  const submissionsToFormat = Array.isArray(data) ? data : [];
  console.log(`Prepared ${submissionsToFormat.length} submissions for formatting (after Array.isArray check).`);

  // Cast `submissionsToFormat` to `SupabaseSubmissionRow[]` for the map function
  const formattedData = (submissionsToFormat as SupabaseSubmissionRow[]).map(formatSubmissionData);

  // Filter out submissions with invalid coordinates (retains previous logic)
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
 * Fetches a single submission by its ID, ensuring a fresh query instance.
 * @param id The ID of the submission to fetch.
 * @returns A promise that resolves to a BrixDataPoint object or null if not found.
 */
export async function fetchSubmissionById(id: string): Promise<BrixDataPoint | null> {
  // Create a fresh query instance without generic on .from()
  const { data, error } = await supabase.from('submissions')
    .select(SUBMISSIONS_SELECT_QUERY_STRING) // Use the defined string
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      console.warn(`No submission found with ID: ${id}`);
      return null;
    }
    console.error(`Error fetching single submission with ID ${id}:`, error);
    throw error;
  }
  // Data from .single() is an object or null, so cast it before formatting
  return data ? formatSubmissionData(data as SupabaseSubmissionRow) : null;
}
