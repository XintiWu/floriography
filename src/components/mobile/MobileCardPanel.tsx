import React, { useEffect, useState } from 'react';
import { fetchAssets } from '../../services/assetService';
import type { Asset } from '../../types';
import { useEditorState } from '../../store/useEditorState';

export const MobileCardPanel: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  const setCardBackground = useEditorState(state => state.setCardBackground);
  const cardBackground = useEditorState(state => state.cardBackground);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      const data = await fetchAssets();
      setAssets(data.filter(a => a.type === 'card'));
      setLoading(false);
    };
    loadAssets();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {loading ? (
          <div style={styles.loading}>載入素材中...</div>
        ) : (
          assets.map(asset => {
            const isSelected = cardBackground?.id === asset.id;
            return (
              <div 
                key={asset.id} 
                style={{
                  ...styles.assetCard,
                  borderColor: isSelected ? 'var(--color-accent)' : 'transparent',
                  backgroundColor: isSelected ? 'var(--color-oat-300)' : 'rgba(255, 255, 255, 0.4)',
                }}
                onClick={() => setCardBackground(asset)}
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
            );
          })
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
    borderRadius: 'var(--radius-md)',
    padding: '4px',
    border: '1.5px solid transparent',
    transition: 'all 0.2s',
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
