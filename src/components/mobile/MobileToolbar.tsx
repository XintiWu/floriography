import React from 'react';
import { Flower2, Image as ImageIcon, Type, BookOpen } from 'lucide-react';
import { useEditorState } from '../../store/useEditorState';

export type MobileTab = 'flower' | 'card' | 'text' | 'layer';

interface MobileToolbarProps {
  activeTab: MobileTab | null;
  setActiveTab: (tab: MobileTab | null) => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({ activeTab, setActiveTab }) => {
  const { canvasItems } = useEditorState();
  const visibleItemsCount = canvasItems.filter(item => !item.hidden && item.asset.type === 'flower').length;

  const handleTabClick = (tab: MobileTab) => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div style={styles.toolbar}>
      <button 
        style={{
          ...styles.tabBtn,
          color: activeTab === 'flower' ? 'var(--color-accent)' : 'var(--color-brown-300)'
        }}
        onClick={() => handleTabClick('flower')}
      >
        <Flower2 size={20} />
        <span style={styles.tabLabel}>花材</span>
      </button>

      <button 
        style={{
          ...styles.tabBtn,
          color: activeTab === 'card' ? 'var(--color-accent)' : 'var(--color-brown-300)'
        }}
        onClick={() => handleTabClick('card')}
      >
        <ImageIcon size={20} />
        <span style={styles.tabLabel}>卡片</span>
      </button>

      <button 
        style={{
          ...styles.tabBtn,
          color: activeTab === 'text' ? 'var(--color-accent)' : 'var(--color-brown-300)'
        }}
        onClick={() => handleTabClick('text')}
      >
        <Type size={20} />
        <span style={styles.tabLabel}>文字</span>
      </button>

      <button 
        style={{
          ...styles.tabBtn,
          color: activeTab === 'layer' ? 'var(--color-accent)' : 'var(--color-brown-300)'
        }}
        onClick={() => handleTabClick('layer')}
      >
        <div style={styles.iconWrapper}>
          <BookOpen size={20} />
          {visibleItemsCount > 0 && (
            <span style={styles.badge}>{visibleItemsCount}</span>
          )}
        </div>
        <span style={styles.tabLabel}>花語</span>
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 110,
    paddingBottom: 'env(safe-area-inset-bottom)',
    boxShadow: '0 -2px 10px rgba(92, 64, 51, 0.05)',
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  tabLabel: {
    fontSize: '11px',
    fontWeight: 500,
  },
  iconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-10px',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: '9px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '1px 5px',
    minWidth: '14px',
    textAlign: 'center',
    border: '1.5px solid var(--color-surface)',
  }
};
