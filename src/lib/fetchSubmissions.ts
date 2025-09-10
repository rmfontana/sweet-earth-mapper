import { supabase } from '../integrations/supabase/client';
import { BrixDataPoint } from '../types';

// This query selects a flat list of submission fields and joins related tables.
const SUBMISSIONS_SELECT_QUERY_STRING = `
  id,
  assessment_date,
  brix_value,
  verified,
  verified_at,
  crop_variety,
  outlier_notes,
  purchase_date,
    place:place_id(id,label,latitude,longitude,street_address),
  location:location_id(id,name,label),
  brand:brand_id(id,name,label),
  user:users!user_id(id,display_name),
  verifier:users!verified_by(id,display_name),
  submission_images(image_url),
  crop:crop_id(id,name,label,poor_brix,average_brix,good_brix,excellent_brix,category)
`;

// This interface reflects the structure of the data returned by the Supabase query.
interface SupabaseSubmissionRow {
  id: string;
  assessment_date: string;
  brix_value: number;
  verified: boolean;
  verified_at: string | null;
  crop_variety: string | null;
  outlier_notes: string | null;
  purchase_date: string | null;
  // The 'place' property now holds the latitude, longitude, and label from the 'places' table.
  place: {
    id: string;
    label: string;
    latitude: number;
    longitude: number;
    street_address?: string | null;
  } | null;
  // The 'location' property now holds the name and label from the new 'locations' table (the old 'stores' table).
  location: {
    id: string;
    name: string;
    label: string | null;
  } | null;
  brand: {
    id: string;
    name: string;
    label: string | null;
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
    image_url: string;
  }[];
  // The 'crop' property is unchanged, but included here for completeness.
  crop: {
    id: string;
    name: string;
    label: string | null;
    poor_brix: number | null;
    average_brix: number | null;
    good_brix: number | null;
    excellent_brix: number | null;
    category: string | null;
  } | null;
}

/**
 * Helper function to format raw Supabase submission data into the BrixDataPoint interface.
 */
function formatSubmissionData(item: SupabaseSubmissionRow): BrixDataPoint {
  return {
    id: item.id,
    brixLevel: item.brix_value,
    verified: item.verified,
    verifiedAt: item.verified_at,
    variety: item.crop_variety ?? '',
    // Use `name` as the unique identifier for the crop type
    cropType: item.crop?.name ?? 'Unknown',
    category: item.crop?.category ?? '',
    // The latitude and longitude now come from the 'place' property
    latitude: item.place?.latitude ?? null,
    longitude: item.place?.longitude ?? null,
    // Use `label` for the display names of locations, stores, and brands
    placeName: item.place?.label ?? '',
    locationName: item.location?.label ?? item.location?.name ?? '',
    streetAddress: item.place?.street_address ?? '', 
    brandName: item.brand?.label ?? item.brand?.name ?? '',
    submittedBy: item.user?.display_name ?? 'Anonymous',
    userId: item.user?.id ?? undefined,
    verifiedBy: item.verifier?.display_name ?? '',
    submittedAt: item.assessment_date,
    outlier_notes: item.outlier_notes ?? '',
    purchaseDate: item.purchase_date,
    images: item.submission_images?.map(img => img.image_url) ?? [],
    poorBrix: item.crop?.poor_brix,
    averageBrix: item.crop?.average_brix,
    goodBrix: item.crop?.good_brix,
    excellentBrix: item.crop?.excellent_brix,
    // Use `label` for the normalized, human-readable name of the crop
    name_normalized: item.crop?.label ?? item.crop?.name ?? 'Unknown',

    // Map the IDs from the nested objects
    placeId: item.place?.id ?? '',
    locationId: item.location?.id ?? '',
    cropId: item.crop?.id ?? '',
    brandId: item.brand?.id ?? '',
    verifiedByUserId: item.verifier?.id ?? '',
  };
}

export async function fetchFormattedSubmissions(): Promise<BrixDataPoint[]> {
  const { data, error } = await supabase.from('submissions')
    .select(SUBMISSIONS_SELECT_QUERY_STRING)
    .order('assessment_date', { ascending: false });

  if (error) {
    console.error('Error fetching submissions from Supabase:', error);
    return [];
  }
  const submissionsToFormat = Array.isArray(data) ? data : [];
  return (submissionsToFormat as SupabaseSubmissionRow[]).map(formatSubmissionData);
}

export async function fetchSubmissionById(id: string): Promise<BrixDataPoint | null> {
  const { data, error } = await supabase.from('submissions')
    .select(SUBMISSIONS_SELECT_QUERY_STRING)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`No submission found with ID: ${id}`);
      return null;
    }
    console.error(`Error fetching single submission with ID ${id}:`, error);
    throw error;
  }
  return data ? formatSubmissionData(data as SupabaseSubmissionRow) : null;
}

export async function deleteSubmission(submissionId: string): Promise<boolean> {
  try {
    const { error: deleteImagesError } = await supabase
      .from('submission_images')
      .delete()
      .eq('submission_id', submissionId);
    if (deleteImagesError) console.error('Error deleting submission image metadata:', deleteImagesError);

    const { error: deleteSubmissionError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId);
    if (deleteSubmissionError) {
      console.error('Error deleting submission:', deleteSubmissionError);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Unhandled error during submission deletion:', error);
    return false;
  }
}