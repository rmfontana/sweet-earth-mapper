import { getSupabaseUrl } from '@/lib/utils';

interface GeoNamesProxyParams {
  endpoint: string;
  queryParams: Record<string, string>;
}

export async function fetchFromGeonamesProxy({ endpoint, queryParams }: GeoNamesProxyParams) {
  const supabaseUrl = getSupabaseUrl();

  const encodedParams = btoa(new URLSearchParams(queryParams).toString());

  const url = `${supabaseUrl}/functions/v1/get-geonames-username?endpoint=${encodeURIComponent(endpoint)}&params=${encodeURIComponent(encodedParams)}`;


  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GeoNames proxy error:', response.status, errorText);
    throw new Error(`GeoNames proxy failed with status ${response.status}`);
  }

  return response.json();
}
