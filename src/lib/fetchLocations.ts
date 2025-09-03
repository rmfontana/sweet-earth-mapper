import { supabase } from '../integrations/supabase/client';

export interface Location {
  id: string;
  name: string; // The unique identifier for the location.
  label: string; // The human-readable name for display.
}

/**
 * Fetches a list of locations from the database.
 * @returns {Promise<Location[]>} A promise that resolves to an array of Location objects.
 */
export const fetchLocations = async (): Promise<Location[]> => {
  try {
    const { data, error } = await supabase
      .from('locations') // Updated from 'stores' to 'locations'
      .select('id, name, label')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('An unexpected error occurred in fetchLocations:', err);
    throw err;
  }
};