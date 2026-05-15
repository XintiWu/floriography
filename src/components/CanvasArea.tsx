import React, { useRef, useState, useEffect } from 'react';
import { useEditorState } from '../store/useEditorState';
import type { Asset, CanvasItem } from '../types';
import Moveable from 'react-moveable';

import { motion } from 'framer-motion';

export const CanvasArea: React.FC = () => {
  const { cardBackground, canvasItems, addItem, selectedItemId, setSelectedItem, isCheckoutOpen } = useEditorState();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const asset = JSON.parse(data) as Asset;
      
      if (asset.type !== 'flower') return; // Only allow dropping flowers for now

      if (!dropZoneRef.current) return;
      
      const rect = dropZoneRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 50; // offset by half image width roughly
      const y = e.clientY - rect.top - 50;
      
      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        assetId: asset.id,
        asset,
        x,
        y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: canvasItems.length + 1,
      };

      addItem(newItem);
      setSelectedItem(newItem.id);
    } catch (err) {
      console.error('Failed to parse dropped item', err);
    }
  };

  return (
    <div 
      style={styles.canvasContainer} 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <motion.div 
        id="canvas-container" // For exporting
        ref={dropZoneRef}
        animate={{
          scale: isCheckoutOpen ? 1.25 : 1,
          boxShadow: isCheckoutOpen ? '0 30px 60px rgba(92, 64, 51, 0.15)' : 'var(--shadow-lg)',
        }}
        transition={{ 
          type: 'spring', 
          damping: 30, 
          stiffness: 300,
          mass: 0.8,
        }}
        style={{
          ...styles.dropZone,
          backgroundImage: cardBackground ? `url(${cardBackground.url})` : 'none',
          backgroundColor: cardBackground ? 'transparent' : 'var(--color-oat-100)',
          cursor: isCheckoutOpen ? 'default' : 'crosshair',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        {!cardBackground && (
          <div style={styles.placeholderText}>
            請從左側選擇卡片背景
          </div>
        )}

        {canvasItems
          .filter(item => !item.hidden)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(item => (
            <CanvasItemComponent 
              key={item.id} 
              item={item} 
              isSelected={selectedItemId === item.id && !isCheckoutOpen} 
            />
          ))}
      </motion.div>
    </div>
  );
};


const CanvasItemComponent: React.FC<{ item: CanvasItem, isSelected: boolean }> = ({ item, isSelected }) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { updateItem, setSelectedItem } = useEditorState();
  const [isEditing, setIsEditing] = useState(false);

  const [frame] = useState({
    translate: [item.x, item.y],
    rotate: item.rotation,
    scale: [item.scaleX, item.scaleY],
  });

  // Apply initial transform
  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.style.transform = `translate(${frame.translate[0]}px, ${frame.translate[1]}px) rotate(${frame.rotate}deg) scale(${frame.scale[0]}, ${frame.scale[1]})`;
    }
  }, [isEditing]); // Re-apply transform after editing state changes

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (item.asset.type === 'text' && !item.locked) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <>
      <div
        ref={targetRef}
        style={{
          ...styles.canvasItem,
          zIndex: item.zIndex,
          backgroundColor: isSelected ? 'rgba(139, 90, 43, 0.05)' : 'transparent',
          border: isSelected ? '1px dashed rgba(139, 90, 43, 0.1)' : 'none',
          // Override dimensions for text to fit content
          width: item.asset.type === 'text' ? 'auto' : styles.canvasItem.width,
          height: item.asset.type === 'text' ? 'auto' : styles.canvasItem.height,
          padding: item.asset.type === 'text' ? '4px 8px' : 0,
          pointerEvents: isEditing ? 'auto' : 'auto', // Ensure clicks work
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {item.asset.type === 'text' ? (
          isEditing ? (
            <textarea
              ref={inputRef}
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setIsEditing(false);
                }
              }}
              style={{
                fontSize: `${item.fontSize}px`,
                color: item.color,
                fontWeight: item.fontWeight || 400,
                fontStyle: item.fontStyle || 'normal',
                fontFamily: item.fontFamily || 'inherit',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: 0,
                margin: 0,
                resize: 'none',
                width: 'auto',
                minWidth: '50px',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            />
          ) : (
            <div style={{
              fontSize: `${item.fontSize}px`,
              color: item.color,
              fontWeight: item.fontWeight || 400,
              fontStyle: item.fontStyle || 'normal',
              fontFamily: item.fontFamily || 'inherit',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {item.text}
            </div>
          )
        ) : (
          <img 
            src={item.asset.url} 
            alt={item.asset.name} 
            style={styles.canvasItemImage} 
            draggable={false}
          />
        )}
      </div>

      {isSelected && !item.locked && !isEditing && targetRef.current && (
        <Moveable
          target={targetRef}
          container={targetRef.current.parentElement}
          origin={false}
          edgeDraggable={true}
          padding={{ left: 5, top: 5, right: 5, bottom: 5 }}
          rotationPosition="top"
          
          /* draggable */
          draggable={true}
          onDragStart={e => {
            e.set(frame.translate);
          }}
          onDrag={e => {
            frame.translate = e.beforeTranslate;
            e.target.style.transform = `translate(${frame.translate[0]}px, ${frame.translate[1]}px) rotate(${frame.rotate}deg) scale(${frame.scale[0]}, ${frame.scale[1]})`;
          }}
          onDragEnd={() => {
            updateItem(item.id, { x: frame.translate[0], y: frame.translate[1] });
          }}
          
          /* resizable */
          resizable={false}
          
          /* scalable */
          scalable={true}
          keepRatio={true}
          onScaleStart={e => {
            e.set(frame.scale);
            e.dragStart && e.dragStart.set(frame.translate);
          }}
          onScale={e => {
            frame.scale = e.scale;
            frame.translate = e.drag.beforeTranslate;
            e.target.style.transform = `translate(${frame.translate[0]}px, ${frame.translate[1]}px) rotate(${frame.rotate}deg) scale(${frame.scale[0]}, ${frame.scale[1]})`;
          }}
          onScaleEnd={() => {
            updateItem(item.id, { 
              scaleX: frame.scale[0], 
              scaleY: frame.scale[1],
              x: frame.translate[0],
              y: frame.translate[1],
            });
          }}
          
          /* rotatable */
          rotatable={true}
          onRotateStart={e => {
            e.set(frame.rotate);
          }}
          onRotate={e => {
            frame.rotate = e.beforeRotate;
            e.target.style.transform = `translate(${frame.translate[0]}px, ${frame.translate[1]}px) rotate(${frame.rotate}deg) scale(${frame.scale[0]}, ${frame.scale[1]})`;
          }}
          onRotateEnd={() => {
            updateItem(item.id, { rotation: frame.rotate });
          }}

          renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
        />
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  canvasContainer: {
    flex: 1,
    backgroundColor: 'var(--color-oat-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    overflow: 'auto',
    position: 'relative',
  },
  dropZone: {
    width: '450px',
    height: '600px',
    minWidth: '450px',
    minHeight: '600px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'var(--color-oat-100)',
    flexShrink: 0, // Prevent flex shrinking
  },
  placeholderText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'var(--color-text-muted)',
    fontSize: '18px',
    fontWeight: 500,
  },
  canvasItem: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100px', // base default width for dropped items
    height: '100px',
    cursor: 'pointer',
  },
  canvasItemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none', // Prevent image default drag
  }
};
