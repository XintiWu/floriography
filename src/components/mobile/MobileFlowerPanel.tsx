import React, { useEffect, useState } from 'react';
import { fetchAssets } from '../../services/assetService';
import type { Asset, CanvasItem } from '../../types';
import { useEditorState } from '../../store/useEditorState';

export const MobileFlowerPanel: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const addItem = useEditorState(state => state.addItem);
  const setSelectedItem = useEditorState(state => state.setSelectedItem);
  const canvasItems = useEditorState(state => state.canvasItems);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      const data = await fetchAssets();
      setAssets(data.filter(a => a.type === 'flower'));
      setLoading(false);
    };
    loadAssets();
  }, []);

  const availableTags = Array.from(
    new Set(assets.flatMap(a => a.tags || []))
  );

  const filteredAssets = selectedTag
    ? assets.filter(asset => asset.tags?.includes(selectedTag))
    : assets;

  const handleFlowerClick = (asset: Asset) => {
    const newItem: CanvasItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: asset.id,
      asset,
      x: 175,
      y: 250,
      rotation: 0,
      scaleX: 3.0,
      scaleY: 3.0,
      zIndex: canvasItems.length + 1,
    };
    addItem(newItem);
    setSelectedItem(newItem.id);
  };

  return (
    <div style={styles.container}>
      {availableTags.length > 0 && (
        <div style={styles.tagContainer}>
          <button 
            style={selectedTag === null ? { ...styles.tagBtn, ...styles.activeTagBtn } : styles.tagBtn}
            onClick={() => setSelectedTag(null)}
          >
            全部
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              style={selectedTag === tag ? { ...styles.tagBtn, ...styles.activeTagBtn } : styles.tagBtn}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div style={styles.grid}>
        {loading ? (
          <div style={styles.loading}>載入素材中...</div>
        ) : (
          filteredAssets.map(asset => (
            <div 
              key={asset.id} 
              style={styles.assetCard}
              onClick={() => handleFlowerClick(asset)}
            >
              <div style={styles.imageContainer}>
                <img 
                  src={asset.url} 
                  alt={asset.name} 
                  style={styles.assetImage} 
                  draggable={false} 
                />
              </div>
              <div style={styles.assetInfo}>
                <span style={styles.assetName}>{asset.name}</span>
                <span style={styles.assetPrice}>NT${asset.price}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    height: '100%',
  },
  tagContainer: {
    display: 'flex',
    overflowX: 'auto',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
    flexShrink: 0,
  },
  tagBtn: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-oat-100)',
    border: '1px solid var(--color-border)',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--color-brown-500)',
    transition: 'all 0.2s',
    flexShrink: 0,
    cursor: 'pointer',
    outline: 'none',
  },
  activeTagBtn: {
    backgroundColor: 'var(--color-brown-500)',
    border: '1px solid var(--color-brown-500)',
    color: '#FFF',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    paddingBottom: '16px',
  },
  assetCard: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 'var(--radius-md)',
    padding: '4px',
    border: '1px solid transparent',
  },
  imageContainer: {
    aspectRatio: '1',
    backgroundColor: '#fff',
    borderRadius: '4px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-border)',
  },
  assetImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  assetInfo: {
    padding: '4px 2px 2px 2px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  assetName: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  assetPrice: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--color-accent)',
  },
  loading: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '24px',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
  }
};
