import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getPublishableKey } from './utils';

const supabase = createClient(getSupabaseUrl(), getPublishableKey());

export type Filter = {
  city?: string;
  state?: string;
  country?: string;
  crop?: string;
};

export interface LeaderboardEntry {
  [key: string]: any;
  average_normalized_score?: number;
  average_brix?: number;
  submission_count: number;
  rank: number;
  crop_name?: string;
  crop_label?: string;
  brand_name?: string;
  brand_label?: string;
  location_name?: string;
  crop_id?: string;
  brand_id?: string;
  location_id?: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
}

async function fetchLeaderboard<R extends LeaderboardEntry>(
  rpcName: string,
  filters: Filter = {}
): Promise<R[]> {
  const { city, state, country, crop } = filters;

  console.log(`🔍 Fetching ${rpcName} with filters:`, { city, state, country, crop });

  const params = {
    city_filter: city ?? null,
    state_filter: state ?? null,
    country_filter: country ?? null,
    crop_filter: crop ?? null,
  };

  try {
    const { data, error } = await supabase.rpc(rpcName, params);

    if (error) {
      console.error(`❌ Error fetching ${rpcName}:`, error);
      throw error;
    }

    if (Array.isArray(data)) {
      return data.map((item) => {
        // normalize numeric fields
        ['average_normalized_score', 'average_brix', 'submission_count', 'rank'].forEach(field => {
          if (item[field] !== null && item[field] !== undefined) {
            const val = Number(item[field]);
            item[field] = isNaN(val) ? 0 : val;
          }
        });

        return item;
      });
    } else {
      console.warn(`⚠️ ${rpcName} returned non-array data:`, data);
      return [];
    }
  } catch (error) {
    console.error(`❌ Exception in fetchLeaderboard for ${rpcName}:`, error);
    return [];
  }
}

export async function fetchBrandLeaderboard(filters: Filter = {}) {
  return await fetchLeaderboard('get_brand_leaderboard', filters);
}

export async function fetchCropLeaderboard(filters: Filter = {}) {
  return await fetchLeaderboard('get_crop_leaderboard', filters);
}

export async function fetchLocationLeaderboard(filters: Filter = {}) {
  return await fetchLeaderboard('get_location_leaderboard', filters);
}

export async function fetchSubmissionCountLeaderboard(filters: Filter = {}) {
  return await fetchLeaderboard('get_submission_count_leaderboard', filters);
}

// Utility function for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).fetchBrandLeaderboard = fetchBrandLeaderboard;
  (window as any).fetchCropLeaderboard = fetchCropLeaderboard;
  (window as any).fetchLocationLeaderboard = fetchLocationLeaderboard;
  (window as any).fetchSubmissionCountLeaderboard = fetchSubmissionCountLeaderboard;
}