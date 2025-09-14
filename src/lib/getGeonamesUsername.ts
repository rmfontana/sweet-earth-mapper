import { getSupabaseUrl, getPublishableKey } from '@/lib/utils';

/**
 * Fetches the GeoNames username from a Supabase Edge Function.
 * @returns The GeoNames username or null if fetching fails.
 */
export async function getGeonamesUsername(): Promise<string | null> {
  try {
    const supabaseUrl = getSupabaseUrl();
    const publishKey = getPublishableKey();
    const response = await fetch(`${supabaseUrl}/functions/v1/get-geonames-username`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publishKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch GeoNames username:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.username ?? null;
  } catch (error) {
    console.error('Failed to fetch GeoNames username:', error);
    return null;
  }
}
