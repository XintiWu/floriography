import { create } from 'zustand';
import type { Asset, CanvasItem } from '../types';

interface EditorState {
  canvasItems: CanvasItem[];
  selectedItemId: string | null;
  cardBackground: Asset | null;
  
  // Actions
  addItem: (item: CanvasItem) => void;
  updateItem: (id: string, partial: Partial<CanvasItem>) => void;
  removeItem: (id: string) => void;
  setSelectedItem: (id: string | null) => void;
  setCardBackground: (asset: Asset | null) => void;
  clearCanvas: () => void;
  moveItem: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  
  // Computed
  getTotalPrice: () => number;
  getUsedAssets: () => { asset: Asset; count: number }[];
}

export const useEditorState = create<EditorState>((set, get) => ({
  canvasItems: [],
  selectedItemId: null,
  cardBackground: null,

  addItem: (item) => set((state) => ({ canvasItems: [...state.canvasItems, item] })),
  
  updateItem: (id, partial) => set((state) => ({
    canvasItems: state.canvasItems.map(item => 
      item.id === id ? { ...item, ...partial } : item
    )
  })),

  removeItem: (id) => set((state) => ({
    canvasItems: state.canvasItems.filter(item => item.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId
  })),

  setSelectedItem: (id) => set({ selectedItemId: id }),

  setCardBackground: (asset) => set({ cardBackground: asset }),

  clearCanvas: () => set({ canvasItems: [], cardBackground: null, selectedItemId: null }),

  moveItem: (id, direction) => set((state) => {
    const items = [...state.canvasItems];
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return state;

    const item = items[index];
    items.splice(index, 1);

    if (direction === 'up') {
      items.splice(Math.min(index + 1, items.length), 0, item);
    } else if (direction === 'down') {
      items.splice(Math.max(index - 1, 0), 0, item);
    } else if (direction === 'top') {
      items.push(item);
    } else if (direction === 'bottom') {
      items.unshift(item);
    }

    // Update all z-indices to match new order
    const updatedItems = items.map((it, i) => ({ ...it, zIndex: i + 1 }));
    return { canvasItems: updatedItems };
  }),

  toggleVisibility: (id) => set((state) => ({
    canvasItems: state.canvasItems.map(item => 
      item.id === id ? { ...item, hidden: !item.hidden } : item
    )
  })),

  toggleLock: (id) => set((state) => ({
    canvasItems: state.canvasItems.map(item => 
      item.id === id ? { ...item, locked: !item.locked } : item
    )
  })),

  getTotalPrice: () => {
    const state = get();
    const itemsPrice = state.canvasItems.reduce((sum, item) => sum + item.asset.price, 0);
    const bgPrice = state.cardBackground?.price || 0;
    return itemsPrice + bgPrice;
  },

  getUsedAssets: () => {
    const state = get();
    const assetMap = new Map<string, { asset: Asset; count: number }>();
    
    if (state.cardBackground) {
      assetMap.set(state.cardBackground.id, { asset: state.cardBackground, count: 1 });
    }

    state.canvasItems.forEach(item => {
      const existing = assetMap.get(item.asset.id);
      if (existing) {
        existing.count += 1;
      } else {
        assetMap.set(item.asset.id, { asset: item.asset, count: 1 });
      }
    });

    return Array.from(assetMap.values());
  }
}));
