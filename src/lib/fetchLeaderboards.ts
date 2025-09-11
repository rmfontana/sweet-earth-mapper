import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getPublishableKey } from './utils';

const supabase = createClient(getSupabaseUrl(), getPublishableKey());

export type Filter = {
  location_name?: string;
  place_id?: string;
  state?: string;
  country?: string;
};

export interface LeaderboardEntry {
  [key: string]: any;
  average_normalized_score: number;
  average_brix: number;
  submission_count: number;
  rank: number;
  crop_label?: string; // Corrected: add labels to interface
  brand_label?: string; // Corrected: add labels to interface
}

async function fetchLeaderboard<R>(
  rpcName: string,
  filters: Filter = {}
): Promise<R[]> {
  const { location_name, place_id, state, country } = filters;

  console.log(`Fetching ${rpcName} with filters:`, { location_name, place_id, state, country });

  const params = {
    location_name_filter: location_name ?? null,
    place_id_filter: place_id ?? null,
    state_filter: state ?? null,
    country_filter: country ?? null,
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
  (LeaderboardEntry & { brand_id: string; brand_name: string; brand_label: string })[]
> {
  // Assuming your Supabase RPC function `get_brand_leaderboard` is updated to return `brand_label`.
  return fetchLeaderboard('get_brand_leaderboard', filters);
}

export async function fetchCropLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { crop_id: string; crop_name: string; crop_label: string })[]
> {
  // Assuming your Supabase RPC function `get_crop_leaderboard` is updated to return `crop_label`.
  return fetchLeaderboard('get_crop_leaderboard', filters);
}

export async function fetchLocationLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { location_id: string; location_name: string })[]
> {
  return fetchLeaderboard('get_location_leaderboard', filters);
}