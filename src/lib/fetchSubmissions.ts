// src/lib/fetchSubmissions.ts

import { supabase } from '../integrations/supabase/client';
import { BrixDataPoint } from '../types';

const SUBMISSIONS_SELECT_QUERY_STRING = `
  id,
  assessment_date,
  brix_value,
  verified,
  verified_at,
  crop_variety,
  outlier_notes,
  purchase_date,
  location:location_id(id,name,latitude,longitude,place_id),
  crop:crop_id(id,name,poor_brix,average_brix,good_brix,excellent_brix,category,name_normalized),
  store:store_id(id,name,location_id),
  brand:brand_id(id,name),
  user:users!user_id(id,display_name),
  verifier:users!verified_by(id,display_name),
  submission_images(image_url)
`;

interface SupabaseSubmissionRow {
  id: string;
  assessment_date: string;
  brix_value: number;
  verified: boolean;
  verified_at: string | null;
  crop_variety: string | null;
  outlier_notes: string | null;
  purchase_date: string | null;
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
    name_normalized: string | null;
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
    image_url: string;
  }[];
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
    cropType: item.crop?.name ?? 'Unknown',
    category: item.crop?.category ?? '',
    latitude: item.location?.latitude ?? null,
    longitude: item.location?.longitude ?? null,
    locationName: item.location?.name ?? '',
    storeName: item.store?.name ?? '',
    brandName: item.brand?.name ?? '',
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
    name_normalized: item.crop?.name_normalized ?? undefined,
    
    // Map the IDs from the nested objects
    locationId: item.location?.id ?? '',
    cropId: item.crop?.id ?? '',
    storeId: item.store?.id ?? '',
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