import type { Asset } from '../types';

export const fetchAssets = async (): Promise<Asset[]> => {
  try {
    const response = await fetch('/api/assets');
    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.statusText}`);
    }
    const data = await response.json();
    return (data.assets || []) as Asset[];
  } catch (err) {
    console.error('Error fetching assets from OCI API:', err);
    return [];
  }
};
