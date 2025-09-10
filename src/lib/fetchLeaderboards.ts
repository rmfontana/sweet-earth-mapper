// src/lib/api/leaderboards.ts
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getPublishableKey } from './utils';

// Initialize Supabase client with your helpers
const supabase = createClient(getSupabaseUrl(), getPublishableKey());

type Filter = {
  state?: string;
  country?: string;
  crop_category?: string;
};

// Generic type for leaderboard entries
export interface LeaderboardEntry {
  [key: string]: any;
  avg_normalized_score: number;
  grade: string;
  submission_count: number;
  rank: number;
}

// Helper to call the RPC with filters
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

// Fetch brand leaderboard
export async function fetchBrandLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { brand_id: string; brand_name: string })[]
> {
  return fetchLeaderboard('get_brand_leaderboard', filters);
}

// Fetch crop leaderboard
export async function fetchCropLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { crop_id: string; crop_name: string })[]
> {
  return fetchLeaderboard('get_crop_leaderboard', filters);
}

// Fetch location leaderboard
export async function fetchLocationLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { location_id: string; location_name: string })[]
> {
  return fetchLeaderboard('get_location_leaderboard', filters);
}
