"use client";

import React, { useState } from 'react';
import { useEditorState } from '../store/useEditorState';
import { Download, Info, Leaf, ArrowLeft, Sparkles, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toPng } from 'html-to-image';
import { useIsMobile } from '../hooks/useIsMobile';

export const TopBar: React.FC = () => {
  const router = useRouter();
  const { getTotalPrice, getUsedAssets, canvasItems, cardBackground, setCheckoutOpen, setShareOpen, clearCanvas } = useEditorState();
  const [isHovering, setIsHovering] = useState(false);
  const totalPrice = getTotalPrice();
  const usedAssets = getUsedAssets();
  const isMobile = useIsMobile();

  const handleExport = async () => {
    const node = document.getElementById('canvas-container');
    if (!node) return;
    
    // Deselect items to remove bounding boxes before export
    useEditorState.getState().setSelectedItem(null);

    // Wait a brief moment for state to update
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = 'floriography-card.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export image', err);
      }
    }, 100);
  };

  const isCanvasEmpty = !cardBackground && canvasItems.length === 0;

  if (isMobile) {
    return (
      <div style={styles.topBarMobile} onClick={(e) => e.stopPropagation()}>
        <div style={styles.leftSectionMobile}>
          <button 
            style={styles.backBtnMobile}
            onClick={() => router.push('/')}
            title="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={styles.logoContainerMobile}>
            <Leaf size={18} color="var(--color-accent)" />
            <h1 style={styles.titleMobile}>Floriography</h1>
          </div>
        </div>

        <div style={styles.actionsMobile}>
          <button 
            style={{
              ...styles.exportBtnMobile,
              opacity: isCanvasEmpty ? 0.5 : 1,
            }}
            onClick={handleExport}
            disabled={isCanvasEmpty}
            title="匯出設計"
          >
            <Download size={16} />
          </button>

          <button
            style={{
              ...styles.priceBtnMobile,
              opacity: isCanvasEmpty ? 0.6 : 1,
            }}
            onClick={() => !isCanvasEmpty && setCheckoutOpen(true)}
            disabled={isCanvasEmpty}
          >
            NT$ {totalPrice}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.topBar} onClick={(e) => e.stopPropagation()}>
      <div style={styles.leftSection}>
        <button 
          style={styles.backBtn}
          onClick={() => router.push('/')}
          className="transition-all"
        >
          <ArrowLeft size={18} />
          返回
        </button>

        <div style={styles.logoContainer}>
          <Leaf size={24} color="var(--color-accent)" />
          <h1 style={styles.title}>Floriography Studio</h1>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.resetBtn,
            opacity: isCanvasEmpty ? 0.5 : 1,
            cursor: isCanvasEmpty ? 'not-allowed' : 'pointer'
          }}
          onClick={() => {
            if (window.confirm("確定要清空畫布嗎？此動作將會清除所有圖層與背景，且無法復原。")) {
              clearCanvas();
            }
          }}
          disabled={isCanvasEmpty}
          title="清空畫布重來"
        >
          <RotateCcw size={16} />
          重設畫布
        </button>

        <button
          style={styles.digitalCardBtn}
          onClick={() => setShareOpen(true)}
          disabled={isCanvasEmpty}
        >
          <Sparkles size={16} />
          分享賀卡
        </button>

        <button 
          style={styles.exportBtn}
          onClick={handleExport}
          disabled={isCanvasEmpty}
        >
          <Download size={16} />
          匯出設計
        </button>

        <div 
          style={styles.priceContainer}
          onClick={() => setIsHovering(!isHovering)}
        >
          <div style={styles.priceDisplay}>
            <span>NT$ {totalPrice}</span>
            <Info size={16} color="var(--color-text-muted)" style={{ marginLeft: 8 }} />
          </div>

          {isHovering && usedAssets.length > 0 && (
            <div style={styles.priceDropdown} className="glass" onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.dropdownTitle}>已使用素材</h3>
              <ul style={styles.assetList}>
                {usedAssets.map(({ asset, count }) => (
                  <li key={asset.id} style={styles.assetItem}>
                    <div style={styles.assetItemName}>
                      {asset.name} {count > 1 && <span style={styles.badge}>x{count}</span>}
                    </div>
                    <div style={styles.assetItemPrice}>
                      NT$ {asset.price * count}
                    </div>
                  </li>
                ))}
              </ul>
              <div style={styles.dropdownTotal}>
                <strong>總計</strong>
                <strong>NT$ {totalPrice}</strong>
              </div>
              
              <button 
                style={styles.orderBtn}
                onClick={() => {
                  setCheckoutOpen(true);
                  setIsHovering(false);
                }}
              >
                下單預訂
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    height: '64px',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    position: 'relative',
    zIndex: 100,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'var(--color-oat-300)',
    color: 'var(--color-brown-700)',
    borderRadius: 'var(--radius-full)',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-sm)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    letterSpacing: '0.5px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'var(--color-accent)',
    color: '#FFF',
    borderRadius: 'var(--radius-full)',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'opacity 0.2s',
  },
  digitalCardBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 18px',
    background: 'linear-gradient(135deg, #7c5c30, #b38240)',
    color: '#FFF',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 12px rgba(130, 90, 40, 0.35)',
    letterSpacing: '0.03em',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: 'var(--color-brown-500)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  priceContainer: {
    position: 'relative',
    cursor: 'pointer',
  },
  priceDisplay: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'var(--color-oat-200)',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
    color: 'var(--color-brown-900)',
  },
  priceDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '12px',
    width: '280px',
    padding: '20px',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1000,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    background: 'rgba(252, 249, 246, 0.9)',
    border: '1px solid rgba(139, 90, 43, 0.15)',
  },
  dropdownTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-brown-500)',
    marginBottom: '12px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '8px',
  },
  assetList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  assetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
  },
  assetItemName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    backgroundColor: 'var(--color-oat-300)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    color: 'var(--color-brown-900)',
  },
  assetItemPrice: {
    fontWeight: 500,
  },
  dropdownTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-border)',
    fontSize: '16px',
    color: 'var(--color-brown-900)',
  },
  orderBtn: {
    width: '100%',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'var(--color-accent)',
    color: '#FFF',
    borderRadius: 'var(--radius-lg)',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    transition: 'all 0.2s',
    boxShadow: 'var(--shadow-md)',
  },
  topBarMobile: {
    height: '52px',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 12px',
    position: 'relative',
    zIndex: 100,
  },
  leftSectionMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtnMobile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--color-oat-300)',
    color: 'var(--color-brown-700)',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: 'pointer',
  },
  logoContainerMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  titleMobile: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    letterSpacing: '0.3px',
    margin: 0,
  },
  actionsMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  exportBtnMobile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--color-oat-300)',
    color: 'var(--color-brown-700)',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: 'pointer',
  },
  priceBtnMobile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    backgroundColor: 'var(--color-accent)',
    color: '#FFF',
    borderRadius: 'var(--radius-full)',
    fontSize: '13px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-sm)',
    border: 'none',
    cursor: 'pointer',
  }
};
