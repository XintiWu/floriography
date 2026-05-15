import { supabase } from './supabase';
import type { Asset } from '../types';

export const fetchAssets = async (): Promise<Asset[]> => {
  // 1. Try to fetch from Supabase if configured
  if (supabase) {
    try {
      // Assuming a table named 'assets' exists
      const { data, error } = await supabase.from('assets').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        return data as Asset[];
      }
    } catch (err) {
      console.warn('Failed to fetch from Supabase, falling back to local db.json.', err);
    }
  }
  
  // 2. Fallback to local db.json generated from the /img folder
  try {
    const response = await fetch('/db.json');
    if (!response.ok) {
      throw new Error(`Failed to load db.json: ${response.statusText}`);
    }
    const data = await response.json();
    return data.assets as Asset[];
  } catch (err) {
    console.error('Error fetching local db.json fallback:', err);
    return [];
  }
};
