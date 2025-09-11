import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getPublishableKey } from './utils';

const supabase = createClient(getSupabaseUrl(), getPublishableKey());

export type Filter = {
  location_name?: string;
  place_id?: string; // Keep as string for UUID
};

export interface LeaderboardEntry {
  [key: string]: any;
  average_normalized_score: number;
  average_brix: number;
  submission_count: number;
  rank: number;
}

async function fetchLeaderboard<R>(
  rpcName: string,
  filters: Filter = {}
): Promise<R[]> {
  const { location_name, place_id } = filters;
  
  console.log(`Fetching ${rpcName} with filters:`, { location_name, place_id });
  
  const params = {
    location_name_filter: location_name ?? null,
    place_id_filter: place_id ?? null,
  };

  const { data, error } = await supabase.rpc(rpcName, params);
  
  if (error) {
    console.error(`Error fetching ${rpcName}:`, error);
    throw error;
  }

  console.log(`${rpcName} returned:`, data);
  return data || [];
}

export async function fetchBrandLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { brand_id: string; brand_name: string })[]
> {
  return fetchLeaderboard('get_brand_leaderboard', filters);
}

export async function fetchCropLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { crop_id: string; crop_name: string })[]
> {
  return fetchLeaderboard('get_crop_leaderboard', filters);
}

export async function fetchLocationLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { location_id: string; location_name: string })[]
> {
  return fetchLeaderboard('get_location_leaderboard', filters);
}