import { supabase } from '../integrations/supabase/client';

export async function fetchCropCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('crops')
      .select('category')
      .not('category', 'is', null)
      .order('category', { ascending: true });
  
    if (error) {
      console.error('Error fetching crop categories:', error);
      return [];
    }
  
    const categories = Array.from(new Set(data.map((row) => row.category)));
    return categories;
  }

  export async function fetchCropCategoryByName(cropName: string): Promise<{ category: string } | null> {
    const { data, error } = await supabase
      .from('crops')
      .select('category')
      .eq('name', cropName)
      .single();
  
    if (error) {
      console.error('Error fetching crop by name:', error);
      return null;
    }
  
    return data;
  }
  