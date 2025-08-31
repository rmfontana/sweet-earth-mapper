import { getSupabaseUrl, getPublishableKey } from '@/lib/utils';

export async function getMapboxToken(): Promise<string | null> {
  try {
    const supabaseUrl = getSupabaseUrl();
    const publishKey = getPublishableKey();
    const response = await fetch(`${supabaseUrl}/functions/v1/mapbox-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publishKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Mapbox token:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.token ?? null;
  } catch (error) {
    console.error('Failed to fetch Mapbox token:', error);
    return null;
  }
}
