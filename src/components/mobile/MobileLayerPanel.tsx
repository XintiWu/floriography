import React from 'react';
import { useEditorState } from '../../store/useEditorState';
import { 
  Trash2,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const MobileLayerPanel: React.FC = () => {
  const { 
    canvasItems, 
    removeItem,
    clearCanvas,
    setShareOpen,
    cardBackground
  } = useEditorState();

  const flowerItems = canvasItems.filter(item => item.asset.type === 'flower');
  const isCanvasEmpty = !cardBackground && canvasItems.length === 0;

  const handleReset = () => {
    if (window.confirm("確定要清空畫布嗎？此動作將會清除所有圖層與背景，且無法復原。")) {
      clearCanvas();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.utilityActions}>
        <button
          style={{
            ...styles.utilityBtn,
            opacity: isCanvasEmpty ? 0.5 : 1,
            cursor: isCanvasEmpty ? 'not-allowed' : 'pointer',
          }}
          onClick={handleReset}
          disabled={isCanvasEmpty}
        >
          <RotateCcw size={14} />
          重設畫布
        </button>

        <button
          style={{
            ...styles.utilityBtn,
            background: isCanvasEmpty ? 'var(--color-oat-300)' : 'linear-gradient(135deg, #7c5c30, #b38240)',
            color: isCanvasEmpty ? 'var(--color-brown-300)' : '#FFF',
            border: 'none',
            cursor: isCanvasEmpty ? 'not-allowed' : 'pointer',
          }}
          onClick={() => setShareOpen(true)}
          disabled={isCanvasEmpty}
        >
          <Sparkles size={14} />
          分享賀卡
        </button>
      </div>

      <div style={styles.layerList}>
        {flowerItems.length === 0 ? (
          <div style={styles.emptyState}>目前畫布上沒有加入任何花材</div>
        ) : (
          flowerItems.map((item) => (
            <div key={item.id} style={styles.flowerItemBox}>
              <div style={styles.flowerHeader}>
                <div style={styles.flowerTitleRow}>
                  <div style={styles.layerPreview}>
                    <img src={item.asset.url} alt="" style={styles.previewImg} />
                  </div>
                  <div>
                    <span style={styles.flowerName}>{item.asset.name}</span>
                    {item.asset.scientificName && (
                      <span style={styles.scientificName}> ({item.asset.scientificName})</span>
                    )}
                  </div>
                </div>
                <button 
                  style={styles.actionBtn} 
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  title="刪除"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={styles.detailsContent}>
                <p style={styles.meaning}>
                  <strong>花語：</strong>{item.asset.meaning || '自然之美、純粹的祝福'}
                </p>
                {item.asset.description && (
                  <p style={styles.description}>{item.asset.description}</p>
                )}
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
    paddingBottom: '16px',
  },
  utilityActions: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  utilityBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid var(--color-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    color: 'var(--color-brown-700)',
    cursor: 'pointer',
  },
  layerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    flex: 1,
  },
  flowerItemBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  flowerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px dashed var(--color-border)',
    paddingBottom: '6px',
  },
  flowerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  layerPreview: {
    width: '26px',
    height: '26px',
    borderRadius: '4px',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  flowerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
  },
  scientificName: {
    fontSize: '10px',
    fontStyle: 'italic',
    color: 'var(--color-brown-400)',
  },
  actionBtn: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-danger)',
  },
  detailsContent: {
    fontSize: '11px',
    color: 'var(--color-brown-600)',
    lineHeight: '1.4',
  },
  meaning: {
    margin: '0 0 4px 0',
    color: 'var(--color-accent)',
  },
  description: {
    margin: 0,
    color: 'var(--color-brown-500)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
  }
};
