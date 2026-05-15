export type AssetType = 'flower' | 'card' | 'text';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  price: number;
  tags?: string[];
  meaning?: string;
  description?: string;
  scientificName?: string;
}

export interface CanvasItem {
  id: string; // unique ID for the item on the canvas
  assetId: string; // reference to the original asset
  asset: Asset; // a copy of the asset for convenience
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zIndex: number;
  hidden?: boolean;
  locked?: boolean;
  // For text specifically:
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
}
