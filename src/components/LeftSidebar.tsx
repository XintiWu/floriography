import React, { useEffect, useState, useRef } from 'react';
import { fetchAssets } from '../services/assetService';
import type { Asset, AssetType } from '../types';
import { useEditorState } from '../store/useEditorState';
import { Image as ImageIcon, Flower2, Type } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const LeftSidebar: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AssetType>('flower');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [hoveredAsset, setHoveredAsset] = useState<Asset | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const setCardBackground = useEditorState(state => state.setCardBackground);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      const data = await fetchAssets();
      setAssets(data);
      setLoading(false);
      
      const firstCard = data.find(a => a.type === 'card');
      const currentBg = useEditorState.getState().cardBackground;
      if (firstCard && !currentBg) {
        setCardBackground(firstCard);
      }
    };
    loadAssets();
  }, [setCardBackground]);

  const filteredAssets = assets.filter(asset => {
    if (asset.type !== activeTab) return false;
    if (selectedTag && (!asset.tags || !asset.tags.includes(selectedTag))) return false;
    return true;
  });

  const availableTags = Array.from(
    new Set(assets.filter(a => a.type === activeTab).flatMap(a => a.tags || []))
  );

  // Use IntersectionObserver for infinite scroll
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredAssets.length));
      }
    }, { 
      root: scrollRef.current,
      rootMargin: '200px',
      threshold: 0.1 
    });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loading, filteredAssets.length, activeTab, selectedTag]);

  // Reset display count and tag when tab changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
    setSelectedTag(null);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const displayedAssets = filteredAssets.slice(0, displayCount);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCardSelect = (asset: Asset) => {
    setCardBackground(asset);
  };

  const handleAddText = () => {
    const newText: Asset = {
      id: `text-${Date.now()}`,
      name: '新文字',
      type: 'text',
      url: '',
      price: 0,
    };

    const newItem: CanvasItem = {
      id: `item-${Date.now()}`,
      assetId: newText.id,
      asset: newText,
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: useEditorState.getState().canvasItems.length + 1,
      text: '請輸入文字',
      fontSize: 24,
      color: '#3E2723',
    };

    useEditorState.getState().addItem(newItem);
    useEditorState.getState().setSelectedItem(newItem.id);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, asset: Asset) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredAsset(asset);
    setHoverPos({ x: rect.right + 12, y: rect.top });
  };

  const handleMouseLeave = () => {
    setHoveredAsset(null);
  };

  return (
    <div style={styles.sidebar} onClick={(e) => e.stopPropagation()}>
      <div style={styles.tabs}>
        <button 
          style={activeTab === 'flower' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('flower')}
        >
          <Flower2 size={18} />
          花材
        </button>
        <button 
          style={activeTab === 'card' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('card')}
        >
          <ImageIcon size={18} />
          卡片
        </button>
        <button 
          style={activeTab === 'text' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('text')}
        >
          <Type size={18} />
          文字
        </button>
      </div>

      {activeTab === 'text' && (
        <div style={styles.textActionContainer}>
          <button style={styles.addTextBtn} onClick={handleAddText}>
            <Type size={20} />
            新增文字
          </button>
          
          <div style={styles.textPresets}>
            <h4 style={styles.presetTitle}>預設樣式</h4>
            <div style={styles.presetGrid}>
              {[
                { label: '標題', size: 36, weight: 700, font: "'Outfit', sans-serif" },
                { label: '內文', size: 18, weight: 400, font: 'inherit' },
                { label: '手寫風', size: 24, weight: 400, italic: true, font: 'cursive' },
              ].map((preset, i) => (
                <button 
                  key={i}
                  style={styles.presetBtn}
                  onClick={() => {
                    const id = `item-${Date.now()}`;
                    const assetId = `text-preset-${i}`;
                    useEditorState.getState().addItem({
                      id,
                      assetId,
                      asset: { id: assetId, name: preset.label, type: 'text', url: '', price: 0 },
                      x: 150,
                      y: 150 + (i * 40),
                      rotation: 0,
                      scaleX: 1,
                      scaleY: 1,
                      zIndex: useEditorState.getState().canvasItems.length + 1,
                      text: preset.label,
                      fontSize: preset.size,
                      color: '#5C4033',
                      fontFamily: preset.font,
                      fontWeight: preset.weight,
                      fontStyle: preset.italic ? 'italic' : 'normal',
                    });
                    useEditorState.getState().setSelectedItem(id);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'text' && availableTags.length > 0 && (
        <div style={styles.tagContainer}>
          <button 
            style={selectedTag === null ? { ...styles.tagBtn, ...styles.activeTagBtn } : styles.tagBtn}
            onClick={() => {
              setSelectedTag(null);
              setDisplayCount(ITEMS_PER_PAGE);
              if (scrollRef.current) scrollRef.current.scrollTop = 0;
            }}
          >
            全部
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              style={selectedTag === tag ? { ...styles.tagBtn, ...styles.activeTagBtn } : styles.tagBtn}
              onClick={() => {
                setSelectedTag(tag);
                setDisplayCount(ITEMS_PER_PAGE);
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div 
        style={styles.assetGrid} 
        ref={scrollRef}
      >
        {loading ? (
          <div style={styles.loading}>載入素材中...</div>
        ) : (
          <>
            {displayedAssets.map(asset => (
              <div 
                key={asset.id} 
                style={styles.assetCard}
                className="asset-card-hover"
                draggable={asset.type === 'flower'}
                onDragStart={(e) => handleDragStart(e, asset)}
                onClick={() => asset.type === 'card' && handleCardSelect(asset)}
                onMouseEnter={(e) => handleMouseEnter(e, asset)}
                onMouseLeave={handleMouseLeave}
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
            ))}
            {/* Sentinel element for infinite scroll */}
            <div ref={sentinelRef} style={{ height: '20px', gridColumn: '1 / -1' }} />
          </>
        )}
      </div>

      {hoveredAsset && (
        <div style={{
          ...styles.popover,
          left: hoverPos.x,
          top: hoverPos.y,
        }} className="glass">
          <h3 style={styles.popoverTitle}>{hoveredAsset.name}</h3>
          
          <div style={styles.popoverSection}>
            <span style={styles.popoverLabel}>類型</span>
            <span style={styles.popoverValue}>{hoveredAsset.type === 'flower' ? '壓花素材' : '卡片底圖'}</span>
          </div>

          <div style={styles.popoverSection}>
            <span style={styles.popoverLabel}>標籤</span>
            <div style={styles.popoverTags}>
              {hoveredAsset.tags?.slice(0, 3).map(t => (
                <span key={t} style={styles.popoverTagItem}>{t}</span>
              )) || <span style={styles.popoverTagItem}>無</span>}
            </div>
          </div>

          {hoveredAsset.scientificName && (
            <div style={styles.popoverSection}>
              <span style={styles.popoverLabel}>學名</span>
              <span style={styles.popoverScientific}>{hoveredAsset.scientificName}</span>
            </div>
          )}

          {hoveredAsset.type === 'flower' && (
            <div style={styles.popoverSection}>
              <span style={styles.popoverLabel}>花語</span>
              <span style={styles.popoverValue}>{hoveredAsset.meaning || '自然之美、純粹的祝福'}</span>
            </div>
          )}

          {hoveredAsset.description && (
            <div style={styles.popoverSection}>
              <span style={styles.popoverLabel}>簡介</span>
              <span style={styles.popoverDescription}>{hoveredAsset.description}</span>
            </div>
          )}

          <div style={styles.popoverPrice}>
            NT$ {hoveredAsset.price}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '320px',
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    padding: '16px',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: 'var(--color-oat-300)',
    color: 'var(--color-brown-700)',
  },
  tagContainer: {
    display: 'flex',
    overflowX: 'auto',
    padding: '12px 16px',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
    /* Hide scrollbar for cleaner look but keep it functional */
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
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
  },
  activeTagBtn: {
    backgroundColor: 'var(--color-brown-500)',
    border: '1px solid var(--color-brown-500)',
    color: '#FFF',
  },
  textActionContainer: {
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  addTextBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'var(--color-accent)',
    color: '#FFF',
    borderRadius: 'var(--radius-lg)',
    fontSize: '16px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-md)',
  },
  textPresets: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  presetTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-brown-300)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  presetBtn: {
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-oat-100)',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
    textAlign: 'center',
  },
  assetGrid: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    alignContent: 'start',
  },
  assetCard: {
    backgroundColor: 'transparent',
    borderRadius: 'var(--radius-md)',
    cursor: 'grab',
    transition: 'all 0.2s ease',
  },
  imageContainer: {
    width: '100%',
    minHeight: '160px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-border)',
  },
  assetImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: '4px',
    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.05))', // Subtle shadow since we removed outline
  },
  assetInfo: {
    padding: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetName: {
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '70px',
  },
  assetPrice: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-accent)',
  },
  loading: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '24px',
    color: 'var(--color-text-muted)',
  },
  popover: {
    position: 'fixed',
    width: '240px',
    padding: '16px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 9999,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    background: 'rgba(252, 249, 246, 0.85)',
    border: '1px solid rgba(139, 90, 43, 0.15)',
    transition: 'opacity 0.2s, transform 0.2s',
  },
  popoverTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    margin: 0,
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '8px',
  },
  popoverSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  popoverLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-brown-300)',
  },
  popoverValue: {
    fontSize: '14px',
    color: 'var(--color-brown-500)',
    lineHeight: '1.4',
  },
  popoverScientific: {
    fontSize: '13px',
    fontStyle: 'italic',
    color: 'var(--color-brown-400)',
    fontFamily: 'serif',
  },
  popoverDescription: {
    fontSize: '13px',
    color: 'var(--color-brown-500)',
    lineHeight: '1.5',
    display: '-webkit-box',
    WebkitLineClamp: '4',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  popoverTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  popoverTagItem: {
    backgroundColor: 'var(--color-oat-300)',
    color: 'var(--color-brown-700)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 500,
  },
  popoverPrice: {
    marginTop: '4px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-accent)',
    textAlign: 'right',
  }
};
