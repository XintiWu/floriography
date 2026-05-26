import type { Asset } from '../types';

export const fetchAssets = async (): Promise<Asset[]> => {
  try {
    const response = await fetch("/api/assets");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(
        "Assets API returned",
        response.status,
        data?.error ?? response.statusText
      );
      return (data.assets || []) as Asset[];
    }
    return (data.assets || []) as Asset[];
  } catch (err) {
    console.error("Error fetching assets:", err);
    return [];
  }
};
