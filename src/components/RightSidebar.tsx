import React from 'react';
import { useEditorState } from '../store/useEditorState';
import { 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  Trash2,
  Type,
  Bold,
  Italic
} from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const { 
    canvasItems, 
    selectedItemId, 
    setSelectedItem, 
    moveItem, 
    toggleVisibility, 
    toggleLock,
    removeItem,
    updateItem
  } = useEditorState();

  const selectedItem = canvasItems.find(item => item.id === selectedItemId);

  // Layers should be shown in reverse z-index order (top items first)
  const sortedItems = [...canvasItems].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div style={styles.sidebar} onClick={(e) => e.stopPropagation()}>
      <div style={styles.header}>
        <Layers size={20} />
        <h2 style={styles.title}>圖層管理</h2>
      </div>

      <div style={styles.layerList}>
        {sortedItems.length === 0 ? (
          <div style={styles.emptyState}>尚未添加素材</div>
        ) : (
          sortedItems.map((item) => (
            <div 
              key={item.id} 
              style={{
                ...styles.layerItem,
                ...(selectedItemId === item.id ? styles.selectedLayer : {})
              }}
              onClick={() => setSelectedItem(item.id)}
            >
              <div style={styles.layerPreview}>
                {item.asset.type === 'text' ? (
                  <Type size={16} color="var(--color-brown-300)" />
                ) : (
                  <img src={item.asset.url} alt="" style={styles.previewImg} />
                )}
              </div>
              
              <div style={styles.layerInfo}>
                <span style={styles.layerName}>{item.asset.name}</span>
              </div>

              <div style={styles.layerActions}>
                <button 
                  style={styles.actionBtn} 
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id); }}
                  title={item.hidden ? "顯示" : "隱藏"}
                >
                  {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button 
                  style={styles.actionBtn} 
                  onClick={(e) => { e.stopPropagation(); toggleLock(item.id); }}
                  title={item.locked ? "解鎖" : "鎖定"}
                >
                  {item.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button 
                  style={{...styles.actionBtn, color: '#ff4d4f'}} 
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  title="刪除"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {selectedItemId === item.id && (
                <div style={styles.reorderControls}>
                  <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'top'); }} title="移至最前"><ArrowUpToLine size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'up'); }} title="上移一層"><ChevronUp size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'down'); }} title="下移一層"><ChevronDown size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'bottom'); }} title="移至最後"><ArrowDownToLine size={12} /></button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedItem && (
        <div style={styles.selectedDetails}>
          <h3 style={styles.detailsTitle}>{selectedItem.asset.name}</h3>
          
          {selectedItem.asset.type === 'text' ? (
            <div style={styles.textEditContainer}>
              <div style={styles.detailsSection}>
                <span style={styles.detailsLabel}>文字內容</span>
                <input 
                  type="text" 
                  value={selectedItem.text || ''} 
                  onChange={(e) => updateItem(selectedItem.id, { text: e.target.value })}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.detailsRow}>
                <div style={styles.detailsSection}>
                  <span style={styles.detailsLabel}>字體大小</span>
                  <input 
                    type="number" 
                    value={selectedItem.fontSize || 24} 
                    onChange={(e) => updateItem(selectedItem.id, { fontSize: parseInt(e.target.value) || 12 })}
                    style={styles.numberInput}
                  />
                </div>
                <div style={styles.detailsSection}>
                  <span style={styles.detailsLabel}>顏色</span>
                  <input 
                    type="color" 
                    value={selectedItem.color || '#3E2723'} 
                    onChange={(e) => updateItem(selectedItem.id, { color: e.target.value })}
                    style={styles.colorInput}
                  />
                </div>
              </div>

              <div style={styles.detailsSection}>
                <span style={styles.detailsLabel}>字體</span>
                <select 
                  value={selectedItem.fontFamily || 'inherit'} 
                  onChange={(e) => updateItem(selectedItem.id, { fontFamily: e.target.value })}
                  style={styles.selectInput}
                >
                  <option value="inherit">系統預設</option>
                  <option value="'Outfit', sans-serif">Outfit (現代)</option>
                  <option value="'Noto Serif TC', serif">思源宋體 (優雅)</option>
                  <option value="'Cormorant Garamond', serif">Garamond (經典)</option>
                  <option value="'Courier New', monospace">打字機體</option>
                  <option value="cursive">手寫體</option>
                </select>
              </div>

              <div style={styles.detailsSection}>
                <span style={styles.detailsLabel}>樣式</span>
                <div style={styles.styleGroup}>
                  <button 
                    style={{
                      ...styles.styleBtn, 
                      backgroundColor: selectedItem.fontWeight === 'bold' || selectedItem.fontWeight === 700 ? 'var(--color-oat-400)' : 'transparent'
                    }}
                    onClick={() => updateItem(selectedItem.id, { 
                      fontWeight: (selectedItem.fontWeight === 'bold' || selectedItem.fontWeight === 700) ? 'normal' : 'bold' 
                    })}
                  >
                    <Bold size={16} />
                  </button>
                  <button 
                    style={{
                      ...styles.styleBtn, 
                      backgroundColor: selectedItem.fontStyle === 'italic' ? 'var(--color-oat-400)' : 'transparent'
                    }}
                    onClick={() => updateItem(selectedItem.id, { 
                      fontStyle: selectedItem.fontStyle === 'italic' ? 'normal' : 'italic' 
                    })}
                  >
                    <Italic size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {selectedItem.asset.scientificName && (
                <p style={styles.detailsScientific}>{selectedItem.asset.scientificName}</p>
              )}
              
              <div style={styles.detailsContent}>
                <div style={styles.detailsSection}>
                  <span style={styles.detailsLabel}>花語</span>
                  <p style={styles.detailsText}>{selectedItem.asset.meaning || '暫無花語資料'}</p>
                </div>
                
                <div style={styles.detailsSection}>
                  <span style={styles.detailsLabel}>簡介</span>
                  <p style={styles.detailsText}>{selectedItem.asset.description || '請重新從左側拖曳花材以獲取最新簡介資料。'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '280px',
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    borderLeft: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--color-brown-700)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  layerList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-oat-100)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
    flexWrap: 'wrap',
  },
  selectedLayer: {
    backgroundColor: 'var(--color-oat-200)',
    border: '1px solid var(--color-brown-300)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  layerPreview: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-brown-700)',
  },
  layerActions: {
    display: 'flex',
    gap: '4px',
  },
  actionBtn: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    color: 'var(--color-brown-300)',
    transition: 'all 0.2s',
    backgroundColor: 'transparent',
  },
  reorderControls: {
    width: '100%',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px dashed var(--color-border)',
    display: 'flex',
    justifyContent: 'space-around',
    gap: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  selectedDetails: {
    padding: '20px 16px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-oat-100)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    margin: 0,
  },
  detailsScientific: {
    fontSize: '13px',
    fontStyle: 'italic',
    color: 'var(--color-brown-400)',
    fontFamily: 'serif',
    margin: 0,
    marginTop: '-4px',
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailsLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-brown-300)',
  },
  detailsText: {
    fontSize: '13px',
    color: 'var(--color-brown-500)',
    lineHeight: '1.5',
    margin: 0,
  },
  textEditContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '12px',
  },
  textInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
  },
  detailsRow: {
    display: 'flex',
    gap: '12px',
  },
  numberInput: {
    width: '100%',
    padding: '8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
  },
  colorInput: {
    width: '100%',
    height: '38px',
    padding: '2px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
  },
  selectInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
    outline: 'none',
  },
  styleGroup: {
    display: 'flex',
    gap: '8px',
  },
  styleBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-brown-700)',
    transition: 'all 0.2s',
  }
};
