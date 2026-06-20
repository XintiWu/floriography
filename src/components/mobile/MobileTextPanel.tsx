import React from 'react';
import { Type, Bold, Italic, Plus } from 'lucide-react';
import { useEditorState } from '../../store/useEditorState';
import type { Asset, CanvasItem } from '../../types';

export const MobileTextPanel: React.FC = () => {
  const { canvasItems, selectedItemId, addItem, setSelectedItem, updateItem } = useEditorState();
  const selectedItem = canvasItems.find(item => item.id === selectedItemId);
  const isTextSelected = selectedItem?.asset.type === 'text';

  const handleAddText = () => {
    const id = `item-${Date.now()}`;
    const newText: Asset = {
      id: `text-${Date.now()}`,
      name: '新文字',
      type: 'text',
      url: '',
      price: 0,
    };

    const newItem: CanvasItem = {
      id,
      assetId: newText.id,
      asset: newText,
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: canvasItems.length + 1,
      text: '請輸入文字',
      fontSize: 24,
      color: '#3E2723',
    };

    addItem(newItem);
    setSelectedItem(newItem.id);
  };

  const handlePresetClick = (preset: { label: string; size: number; weight: number | string; font: string; italic?: boolean }) => {
    const id = `item-${Date.now()}`;
    const assetId = `text-preset-${Date.now()}`;
    addItem({
      id,
      assetId,
      asset: { id: assetId, name: preset.label, type: 'text', url: '', price: 0 },
      x: 100,
      y: 150,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: canvasItems.length + 1,
      text: preset.label,
      fontSize: preset.size,
      color: '#5C4033',
      fontFamily: preset.font,
      fontWeight: preset.weight,
      fontStyle: preset.italic ? 'italic' : 'normal',
    });
    setSelectedItem(id);
  };

  return (
    <div style={styles.container}>
      {isTextSelected ? (
        <div style={styles.editorContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>編輯選中文字</span>
            <button style={styles.smallAddBtn} onClick={handleAddText}>
              <Plus size={14} /> 新增文字
            </button>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>文字內容</span>
            <input 
              type="text" 
              value={selectedItem.text || ''} 
              onChange={(e) => updateItem(selectedItem.id, { text: e.target.value })}
              style={styles.textInput}
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <span style={styles.label}>大小</span>
              <input 
                type="number" 
                value={selectedItem.fontSize || 24} 
                onChange={(e) => updateItem(selectedItem.id, { fontSize: parseInt(e.target.value) || 12 })}
                style={styles.numberInput}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <span style={styles.label}>顏色</span>
              <input 
                type="color" 
                value={selectedItem.color || '#3E2723'} 
                onChange={(e) => updateItem(selectedItem.id, { color: e.target.value })}
                style={styles.colorInput}
              />
            </div>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>字體</span>
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

          <div style={styles.field}>
            <span style={styles.label}>樣式</span>
            <div style={styles.styleGroup}>
              <button 
                style={{
                  ...styles.styleBtn, 
                  backgroundColor: selectedItem.fontWeight === 'bold' || selectedItem.fontWeight === 700 ? 'var(--color-oat-400)' : 'rgba(255,255,255,0.5)'
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
                  backgroundColor: selectedItem.fontStyle === 'italic' ? 'var(--color-oat-400)' : 'rgba(255,255,255,0.5)'
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
        <div style={styles.creatorContainer}>
          <button style={styles.addTextBtn} onClick={handleAddText}>
            <Type size={18} />
            新增空白文字
          </button>
          
          <div style={styles.presetsSection}>
            <span style={styles.presetsTitle}>預設字型與大小</span>
            <div style={styles.presetGrid}>
              {[
                { label: '大標題', size: 36, weight: 700, font: "'Outfit', sans-serif" },
                { label: '小標題', size: 24, weight: 600, font: "'Outfit', sans-serif" },
                { label: '優雅宋體', size: 22, weight: 400, font: "'Noto Serif TC', serif" },
                { label: '手寫風格', size: 24, weight: 400, italic: true, font: 'cursive' },
              ].map((preset, i) => (
                <button 
                  key={i}
                  style={styles.presetBtn}
                  onClick={() => handlePresetClick(preset)}
                >
                  <span style={{ 
                    fontFamily: preset.font, 
                    fontWeight: preset.weight, 
                    fontStyle: preset.italic ? 'italic' : 'normal',
                    fontSize: '14px'
                  }}>
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  creatorContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  addTextBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px',
    backgroundColor: 'var(--color-accent)',
    color: '#FFF',
    borderRadius: 'var(--radius-lg)',
    fontSize: '15px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-md)',
    border: 'none',
    cursor: 'pointer',
  },
  presetsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  presetsTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-brown-300)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    color: 'var(--color-brown-700)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '8px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-brown-500)',
  },
  smallAddBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-accent)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-brown-300)',
  },
  textInput: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
    outline: 'none',
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  numberInput: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
    outline: 'none',
    width: '100%',
  },
  colorInput: {
    height: '38px',
    padding: '2px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    cursor: 'pointer',
    width: '100%',
  },
  selectInput: {
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
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-brown-700)',
    cursor: 'pointer',
  }
};
