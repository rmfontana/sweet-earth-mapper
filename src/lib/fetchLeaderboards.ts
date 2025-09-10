import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getPublishableKey } from './utils';

// Initialize Supabase client with your helpers
const supabase = createClient(getSupabaseUrl(), getPublishableKey());

// Updated Filter type to include optional min/max brix values
export type Filter = {
  state?: string;
  country?: string;
  crop_category?: string;
  place_id?: string;
  location_name?: string;
  // New optional filters for normalization
  min_brix?: number;
  max_brix?: number;
};

// Generic type for leaderboard entries
export interface LeaderboardEntry {
  [key: string]: any;
  avg_normalized_score: number;
  grade: string;
  submission_count: number;
  rank: number;
}

/**
 * Helper to call a Supabase RPC function with filters.
 * @param rpcName The name of the Supabase RPC function.
 * @param filters An object containing filter parameters, including optional min_brix and max_brix.
 * @returns A promise that resolves to an array of the RPC's result type.
 */
async function fetchLeaderboard<R>(
  rpcName: string,
  filters: Filter = {}
): Promise<R[]> {
  const { data, error } = await supabase.rpc(rpcName, { filters });

  if (error) {
    console.error(`Error fetching ${rpcName}`, error);
    throw error;
  }
  return data || [];
}

/**
 * Fetches the brand leaderboard, accepting all standard and normalization filters.
 * @param filters An object with filters for the leaderboard query.
 * @returns A promise of an array of brand leaderboard entries.
 */
export async function fetchBrandLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { brand_id: string; brand_name: string })[]
> {
  // Use the new, more flexible Supabase function name if needed
  // return fetchLeaderboard('get_brand_leaderboard_v2', filters);
  return fetchLeaderboard('get_brand_leaderboard', filters);
}

/**
 * Fetches the crop leaderboard, accepting all standard and normalization filters.
 * @param filters An object with filters for the leaderboard query.
 * @returns A promise of an array of crop leaderboard entries.
 */
export async function fetchCropLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { crop_id: string; crop_name: string })[]
> {
  return fetchLeaderboard('get_crop_leaderboard', filters);
}

/**
 * Fetches the location leaderboard, accepting all standard and normalization filters.
 * @param filters An object with filters for the leaderboard query.
 * @returns A promise of an array of location leaderboard entries.
 */
export async function fetchLocationLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { location_id: string; location_name: string })[]
> {
  return fetchLeaderboard('get_location_leaderboard', filters);
}
