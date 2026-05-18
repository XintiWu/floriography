"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Sparkles, Share2, ExternalLink, Flower2 } from 'lucide-react';
import { useEditorState } from '../store/useEditorState';
import { toJpeg } from 'html-to-image';

interface Petal {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  drift: number;
  opacity: number;
  color: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PETAL_COLORS = [
  'rgba(210, 160, 100, 0.55)',
  'rgba(235, 200, 160, 0.45)',
  'rgba(180, 130, 80, 0.4)',
  'rgba(245, 225, 195, 0.5)',
  'rgba(160, 110, 60, 0.35)',
];

function generatePetals(count: number): Petal[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 4 + Math.random() * 8,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 6,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 120,
    opacity: 0.3 + Math.random() * 0.5,
    color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
  }));
}

export const DigitalCardOverlay: React.FC<Props> = ({ isOpen, onClose }) => {
  const { canvasItems } = useEditorState();
  const [cardTitle, setCardTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [petals] = useState(() => generatePetals(22));

  // Capture canvas snapshot when opening
  useEffect(() => {
    if (!isOpen) return;
    setSharedId(null);
    setCardTitle('');
    setAuthorName('');
    setPersonalNote('');
    const node = document.getElementById('canvas-container');
    if (!node) return;

    const prev = useEditorState.getState().selectedItemId;
    useEditorState.getState().setSelectedItem(null);

    setTimeout(async () => {
      try {
        const dataUrl = await toJpeg(node, {
          cacheBust: true,
          pixelRatio: 2,
          quality: 0.9,
          style: {
            transform: 'scale(1)',
            left: '0',
            top: '0',
          }
        });
        setCardImage(dataUrl);
      } catch (err) {
        console.error('Render error:', err);
        setCardImage(null);
      } finally {
        if (prev) useEditorState.getState().setSelectedItem(prev);
      }
    }, 300);
  }, [isOpen]);

  // Flower info: unique name+meaning pairs
  const flowerPairs = Array.from(
    new Map(
      canvasItems
        .filter(i => i.asset.type === 'flower' && i.asset.name)
        .map(i => [i.asset.name, i.asset.meaning || ''])
    ).entries()
  ).map(([name, meaning]) => ({ name, meaning }));

  const flowerNames = flowerPairs.map(p => p.name);
  const flowerMeanings = flowerPairs.map(p => p.meaning);

  const handleShare = async () => {
    if (!cardImage || sharing) return;
    setSharing(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: cardImage,
          cardTitle: cardTitle.trim() || null,
          personalNote: personalNote.trim() || null,
          flowerNames,
          flowerMeanings,
          authorName: authorName.trim() || '匿名創作者',
        }),
      });
      const data = await res.json();
      if (data.id) {
        setSharedId(data.id);
      }
    } catch {
      // silently fail
    } finally {
      setSharing(false);
    }
  };

  const shareUrl = sharedId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/card/${sharedId}`
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleCopyPersonalNote = () => {
    const text = personalNote.trim() || '願這張小小的花卡，帶給你滿滿的祝福 🌸';
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={styles.backdrop}
          onClick={onClose}
        >
          {/* Falling Petals */}
          {petals.map((petal) => (
            <motion.div
              key={petal.id}
              style={{
                position: 'fixed',
                top: '-30px',
                left: `${petal.x}%`,
                width: petal.size,
                height: petal.size * 0.6,
                borderRadius: '50% 0 50% 0',
                backgroundColor: petal.color,
                opacity: petal.opacity,
                pointerEvents: 'none',
                zIndex: 9998,
              }}
              animate={{
                y: ['0vh', '110vh'],
                x: [0, petal.drift],
                rotate: [petal.rotation, petal.rotation + 360 * (Math.random() > 0.5 ? 1 : -1)],
                opacity: [petal.opacity, petal.opacity * 0.5, 0],
              }}
              transition={{
                duration: petal.duration,
                delay: petal.delay,
                repeat: Infinity,
                repeatDelay: Math.random() * 4,
                ease: 'linear',
              }}
            />
          ))}

          {/* Main Content */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200, delay: 0.1 }}
            style={styles.contentWrapper}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={styles.closeBtn}
              onClick={onClose}
              whileHover={{ scale: 1.1 } as any}
              whileTap={{ scale: 0.95 } as any}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={styles.header}
            >
              <Sparkles size={16} style={{ color: 'rgba(210, 160, 100, 0.8)' }} />
              <span style={styles.headerText}>分享花卡</span>
              <Sparkles size={16} style={{ color: 'rgba(210, 160, 100, 0.8)' }} />
            </motion.div>

            {/* Two-column layout: card preview + form */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={styles.twoCol}
            >
              {/* Left: Card preview */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                  boxShadow: [
                    '0 16px 48px rgba(0,0,0,0.5)',
                    '0 24px 64px rgba(0,0,0,0.65)',
                    '0 16px 48px rgba(0,0,0,0.5)',
                  ],
                }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                style={styles.cardFrame}
              >
                {cardImage ? (
                  <img src={cardImage} alt="賀卡預覽" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={styles.cardPlaceholder}>
                    <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      正在渲染賀卡…
                    </motion.div>
                  </div>
                )}
                {/* Shimmer overlay */}
                <motion.div
                  style={styles.shimmer}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                />
              </motion.div>

              {/* Right: Form */}
              <div style={styles.formCol}>
                {/* Flower meanings preview */}
                {flowerPairs.length > 0 && (
                  <div style={styles.flowerSection}>
                    <p style={styles.fieldLabel}>
                      <Flower2 size={12} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                      花語
                    </p>
                    <div style={styles.flowerList}>
                      {flowerPairs.map(({ name, meaning }) => (
                        <div key={name} style={styles.flowerRow}>
                          <span style={styles.flowerName}>{name}</span>
                          {meaning && (
                            <>
                              <span style={styles.flowerDivider}>·</span>
                              <span style={styles.flowerMeaning}>{meaning}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card title */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>卡片名稱</label>
                  <input
                    type="text"
                    placeholder="為這張花卡取個名字…"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    style={styles.textInput}
                    maxLength={40}
                  />
                  <div style={styles.charCount}>{cardTitle.length} / 40</div>
                </div>

                {/* Author name */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>你的名字</label>
                  <input
                    type="text"
                    placeholder="預設為匿名創作者"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    style={styles.textInput}
                    maxLength={20}
                  />
                  <div style={styles.charCount}>{authorName.length} / 20</div>
                </div>

                {/* Personal note */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>寫一段話 或 留言給阿姨</label>
                  <textarea
                    placeholder="寫下你想說的話，或是留言給阿姨 🌸"
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    style={styles.textareaInput}
                    rows={3}
                    maxLength={200}
                  />
                  <div style={styles.charCount}>{personalNote.length} / 200</div>
                </div>
              </div>
            </motion.div>

            {/* Share URL Box & Dual copy buttons (shown after sharing) */}
            <AnimatePresence>
              {sharedId && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Share URL Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={styles.shareUrlBox}
                  >
                    <p style={styles.shareUrlLabel}>🎉 賀卡已發佈到花卡推特！複製連結傳給親友：</p>
                    <div style={styles.shareUrlRow}>
                      <span style={styles.shareUrlText}>{shareUrl}</span>
                      <button style={styles.linkCopyBtn} onClick={handleCopyLink}>
                        {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={styles.openLinkBtn}>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </motion.div>

                  {/* Dual Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={styles.actions}
                  >
                    <motion.button
                      style={styles.copyBtn}
                      onClick={handleCopyPersonalNote}
                      whileHover={{ scale: 1.03 } as any}
                      whileTap={{ scale: 0.97 } as any}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? '已複製內容！' : '複製個人留言/祝福語'}
                    </motion.button>

                    <motion.button
                      style={styles.primaryActionBtn}
                      onClick={handleCopyLink}
                      whileHover={{ scale: 1.03 } as any}
                      whileTap={{ scale: 0.97 } as any}
                    >
                      {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                      {linkCopied ? '已複製連結！' : '複製分享連結'}
                    </motion.button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Publish button (Only shown before sharing) */}
            {!sharedId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={styles.actions}
              >
                <motion.button
                  style={{
                    ...styles.shareBtn,
                    opacity: sharing ? 0.7 : 1,
                  }}
                  onClick={handleShare}
                  disabled={sharing || !cardImage}
                  whileHover={{ scale: 1.02 } as any}
                  whileTap={{ scale: 0.97 } as any}
                >
                  {sharing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Share2 size={16} />
                    </motion.div>
                  ) : (
                    <><Share2 size={16} />發佈到花卡推特</>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* Botanical rule */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              style={styles.botanicalRule}
            >
              ── ❀ ──
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse at center, rgba(30, 22, 14, 0.97) 0%, rgba(10, 7, 4, 0.99) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto',
    padding: '40px 20px',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    position: 'relative',
    maxWidth: '760px',
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerText: {
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.2em',
    color: 'rgba(235, 200, 160, 0.7)',
    textTransform: 'uppercase',
  },
  twoCol: {
    display: 'flex',
    gap: '28px',
    width: '100%',
    alignItems: 'flex-start',
  },
  cardFrame: {
    width: '260px',
    height: '347px',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2a2016',
    flexShrink: 0,
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(210, 180, 140, 0.5)',
    fontSize: '14px',
  },
  shimmer: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
    pointerEvents: 'none',
  },
  formCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
  },
  flowerSection: {
    background: 'rgba(210, 160, 100, 0.05)',
    border: '1px solid rgba(210, 160, 100, 0.15)',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  flowerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginTop: '6px',
  },
  flowerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  flowerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(235, 200, 160, 0.9)',
    letterSpacing: '0.04em',
  },
  flowerDivider: {
    fontSize: '12px',
    color: 'rgba(210, 160, 100, 0.4)',
  },
  flowerMeaning: {
    fontSize: '12px',
    color: 'rgba(210, 180, 140, 0.65)',
    fontFamily: "'Georgia', 'Noto Serif TC', serif",
    fontStyle: 'italic',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  fieldLabel: {
    fontSize: '11px',
    color: 'rgba(210, 180, 140, 0.55)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  textInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(210, 160, 100, 0.18)',
    borderRadius: '8px',
    padding: '10px 13px',
    color: 'rgba(240, 220, 190, 0.9)',
    fontSize: '14px',
    fontFamily: "'Georgia', 'Noto Serif TC', serif",
    outline: 'none',
    boxSizing: 'border-box',
  },
  textareaInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(210, 160, 100, 0.18)',
    borderRadius: '8px',
    padding: '10px 13px',
    color: 'rgba(240, 220, 190, 0.9)',
    fontSize: '14px',
    fontFamily: "'Georgia', 'Noto Serif TC', serif",
    lineHeight: 1.7,
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  charCount: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'right',
  },
  shareUrlBox: {
    width: '100%',
    background: 'rgba(210, 160, 100, 0.07)',
    border: '1px solid rgba(210, 160, 100, 0.2)',
    borderRadius: '10px',
    padding: '12px 14px',
    overflow: 'hidden',
  },
  shareUrlLabel: {
    fontSize: '12px',
    color: 'rgba(235, 200, 160, 0.7)',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  shareUrlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  shareUrlText: {
    flex: 1,
    fontSize: '12px',
    color: 'rgba(235, 200, 160, 0.55)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  },
  linkCopyBtn: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(210, 160, 100, 0.12)',
    border: '1px solid rgba(210, 160, 100, 0.2)',
    color: 'rgba(235, 200, 160, 0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  openLinkBtn: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(210, 160, 100, 0.12)',
    border: '1px solid rgba(210, 160, 100, 0.2)',
    color: 'rgba(235, 200, 160, 0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    textDecoration: 'none',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  copyBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(210, 160, 100, 0.3)',
    backgroundColor: 'rgba(210, 160, 100, 0.07)',
    color: 'rgba(235, 200, 160, 0.85)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryActionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(160, 110, 55, 0.9), rgba(120, 80, 35, 0.9))',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
  shareBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(160, 110, 55, 0.9), rgba(120, 80, 35, 0.9))',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
  botanicalRule: {
    fontSize: '14px',
    color: 'rgba(210, 160, 100, 0.3)',
    letterSpacing: '0.3em',
  },
};
