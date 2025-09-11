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
  // Your updated RPC functions now return these fields:
  crop_name?: string;
  crop_label?: string;  // Human-readable crop name
  brand_name?: string;
  brand_label?: string; // Human-readable brand name
  location_name?: string;
  // IDs
  crop_id?: string;
  brand_id?: string;
  location_id?: string;
}

async function fetchLeaderboard<R extends LeaderboardEntry>(
  rpcName: string,
  filters: Filter = {}
): Promise<R[]> {
  const { location_name, place_id, state, country } = filters;
  
  console.log(`🔍 Fetching ${rpcName} with filters:`, { location_name, place_id, state, country });
  
  // Convert place_id to UUID format if it's provided
  let place_id_uuid = null;
  if (place_id) {
    // If place_id is already a UUID string, use it directly
    // If it needs conversion, you might need to adjust this
    place_id_uuid = place_id;
  }
  
  const params = {
    location_name_filter: location_name ?? null,
    place_id_filter: place_id_uuid,
    state_filter: state ?? null,
    country_filter: country ?? null,
  };

  try {
    const { data, error } = await supabase.rpc(rpcName, params);
    
    if (error) {
      console.error(`❌ Error fetching ${rpcName}:`, error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    console.log(`✅ ${rpcName} returned:`, data);
    console.log(`✅ ${rpcName} count:`, data?.length || 0);
    
    // Validate the returned data structure
    if (Array.isArray(data)) {
      const validatedData = data.map((item, index) => {
        // Check for required fields
        const requiredFields = ['average_normalized_score', 'average_brix', 'submission_count', 'rank'];
        const missingFields = requiredFields.filter(field => 
          item[field] === null || item[field] === undefined
        );
        
        if (missingFields.length > 0) {
          console.warn(`⚠️ ${rpcName} item ${index} missing fields:`, missingFields, item);
        }
        
        // Ensure numeric fields are actually numbers
        const numericFields = ['average_normalized_score', 'average_brix', 'submission_count', 'rank'];
        numericFields.forEach(field => {
          if (item[field] !== null && item[field] !== undefined) {
            const originalValue = item[field];
            item[field] = Number(item[field]);
            if (isNaN(item[field])) {
              console.warn(`⚠️ ${rpcName} item ${index} has invalid numeric field ${field}:`, originalValue);
              item[field] = 0; // Default to 0 for invalid numeric fields
            }
          }
        });
        
        // Log what labels we got for debugging
        if (rpcName === 'get_crop_leaderboard') {
          console.log(`🔍 Crop item ${index}:`, {
            crop_id: item.crop_id,
            crop_name: item.crop_name,
            crop_label: item.crop_label,
            hasLabel: !!item.crop_label
          });
        } else if (rpcName === 'get_brand_leaderboard') {
          console.log(`🔍 Brand item ${index}:`, {
            brand_id: item.brand_id,
            brand_name: item.brand_name,
            brand_label: item.brand_label,
            hasLabel: !!item.brand_label
          });
        }
        
        return item;
      });
      
      return validatedData || [];
    } else {
      console.warn(`⚠️ ${rpcName} returned non-array data:`, data);
      return [];
    }
  } catch (error) {
    console.error(`❌ Exception in fetchLeaderboard for ${rpcName}:`, error);
    return [];
  }
}

export async function fetchBrandLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { brand_id?: string; brand_name?: string; brand_label?: string })[]
> {
  console.log('🔍 fetchBrandLeaderboard called with filters:', filters);
  const result = await fetchLeaderboard('get_brand_leaderboard', filters);
  
  // Additional validation for brand-specific fields
  const validatedResult = result.map((item, index) => {
    // Check if we have either brand_label or brand_name
    if (!item.brand_label && !item.brand_name && !item.brand_id) {
      console.warn(`⚠️ Brand leaderboard item ${index} missing brand identifier:`, item);
    }
    
    // Log what we received for debugging
    console.log(`🔍 Brand leaderboard item ${index} validation:`, {
      brand_id: item.brand_id,
      brand_name: item.brand_name,
      brand_label: item.brand_label,
      hasLabel: !!item.brand_label,
      rank: item.rank,
      avg_score: item.average_normalized_score
    });
    
    return item;
  });
  
  console.log('🔍 fetchBrandLeaderboard final result count:', validatedResult.length);
  return validatedResult;
}

export async function fetchCropLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { crop_id?: string; crop_name?: string; crop_label?: string })[]
> {
  console.log('🔍 fetchCropLeaderboard called with filters:', filters);
  const result = await fetchLeaderboard('get_crop_leaderboard', filters);
  
  // Additional validation for crop-specific fields
  const validatedResult = result.map((item, index) => {
    // Check if we have either crop_label or crop_name
    if (!item.crop_label && !item.crop_name && !item.crop_id) {
      console.warn(`⚠️ Crop leaderboard item ${index} missing crop identifier:`, item);
    }
    
    // Log what we received for debugging
    console.log(`🔍 Crop leaderboard item ${index} validation:`, {
      crop_id: item.crop_id,
      crop_name: item.crop_name,
      crop_label: item.crop_label,
      hasLabel: !!item.crop_label,
      rank: item.rank,
      avg_score: item.average_normalized_score
    });
    
    return item;
  });
  
  console.log('🔍 fetchCropLeaderboard final result count:', validatedResult.length);
  return validatedResult;
}

export async function fetchLocationLeaderboard(filters: Filter = {}): Promise<
  (LeaderboardEntry & { location_id?: string; location_name?: string })[]
> {
  console.log('🔍 fetchLocationLeaderboard called with filters:', filters);
  const result = await fetchLeaderboard('get_location_leaderboard', filters);
  
  console.log('🔍 fetchLocationLeaderboard result count:', result.length);
  return result;
}

// Utility function to test your RPC functions
export async function testLeaderboardRPCs(filters: Filter = {}) {
  console.log('🧪 Testing all leaderboard RPCs with filters:', filters);
  
  try {
    console.log('🧪 Testing brand leaderboard...');
    const brands = await fetchBrandLeaderboard(filters);
    
    console.log('🧪 Testing crop leaderboard...');
    const crops = await fetchCropLeaderboard(filters);
    
    console.log('🧪 Testing location leaderboard...');
    const locations = await fetchLocationLeaderboard(filters);
    
    const testResults = {
      brands: {
        count: brands.length,
        sample: brands[0],
        hasLabels: brands.some(b => b.brand_label),
        hasNames: brands.some(b => b.brand_name),
        allLabels: brands.map(b => ({ id: b.brand_id, name: b.brand_name, label: b.brand_label }))
      },
      crops: {
        count: crops.length,
        sample: crops[0],
        hasLabels: crops.some(c => c.crop_label),
        hasNames: crops.some(c => c.crop_name),
        allLabels: crops.map(c => ({ id: c.crop_id, name: c.crop_name, label: c.crop_label }))
      },
      locations: {
        count: locations.length,
        sample: locations[0],
        allNames: locations.map(l => ({ id: l.location_id, name: l.location_name }))
      }
    };
    
    console.log('🧪 Complete test results:', testResults);
    
    return testResults;
  } catch (error) {
    console.error('🧪 Test failed:', error);
    return null;
  }
}

// Utility function to test a specific place_id
export async function testSpecificStore(place_id: string, location_name?: string) {
  console.log(`🧪 Testing specific store: ${location_name || place_id}`);
  
  const filters = {
    place_id: place_id,
    location_name: location_name
  };
  
  return await testLeaderboardRPCs(filters);
}

// Make functions available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).testLeaderboardRPCs = testLeaderboardRPCs;
  (window as any).testSpecificStore = testSpecificStore;
  
  // Also expose individual functions for testing
  (window as any).fetchBrandLeaderboard = fetchBrandLeaderboard;
  (window as any).fetchCropLeaderboard = fetchCropLeaderboard;
  (window as any).fetchLocationLeaderboard = fetchLocationLeaderboard;
}