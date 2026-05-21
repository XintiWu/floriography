"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useEditorState } from '../store/useEditorState';
import { X, Send, User, ChevronLeft, CheckCircle, Sparkles, Copy, Check, ExternalLink, Flower2, Heart, ArrowLeft, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';

// Inline CSS for the misty/cloudy background drifting animations
const mistDriftStyles = `
  @keyframes mistDrift1 {
    0% { transform: translate(-15%, -15%) rotate(0deg) scale(1.1); opacity: 0.5; }
    50% { transform: translate(15%, 12%) rotate(180deg) scale(1.4); opacity: 0.85; }
    100% { transform: translate(-15%, -15%) rotate(360deg) scale(1.1); opacity: 0.5; }
  }
  @keyframes mistDrift2 {
    0% { transform: translate(12%, -12%) rotate(0deg) scale(1.3); opacity: 0.55; }
    50% { transform: translate(-12%, 15%) rotate(-180deg) scale(0.95); opacity: 0.8; }
    100% { transform: translate(12%, -12%) rotate(-360deg) scale(1.3); opacity: 0.55; }
  }
  @keyframes mistDrift3 {
    0% { transform: translate(-8%, 18%) scale(1); opacity: 0.4; }
    50% { transform: translate(8%, -15%) scale(1.25); opacity: 0.7; }
    100% { transform: translate(-8%, 18%) scale(1); opacity: 0.4; }
  }
`;

// Canvas Particle Swarm representing magical condensation/sparkles rising through the mist
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  decay: number;
}

const ParticleCanvas: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth || 450);
    let height = (canvas.height = canvas.offsetHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 450;
      height = canvas.height = canvas.offsetHeight || 600;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    const colors = [
      'rgba(240, 212, 172, ', // Warm Golden Sparkle
      'rgba(247, 197, 192, ', // Petal Pink Glow
      'rgba(255, 245, 240, ', // Shimmering White
      'rgba(196, 154, 98, ',  // Soft Terracotta
    ];

    const createParticle = (isInit = false): Particle => {
      return {
        x: Math.random() * width,
        y: isInit ? Math.random() * height : height + 10,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -Math.random() * 1.8 - 0.6,
        radius: Math.random() * 4 + 1.5,
        alpha: Math.random() * 0.6 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        decay: Math.random() * 0.005 + 0.003,
      };
    };

    for (let i = 0; i < 40; i++) {
      particles.push(createParticle(true));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (active && particles.length < 75 && Math.random() < 0.35) {
        particles.push(createParticle(false));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        p.vx += Math.sin(p.y * 0.007) * 0.05;

        if (p.alpha <= 0 || p.y < -15) {
          if (active) {
            particles.splice(i, 1, createParticle(false));
          } else {
            particles.splice(i, 1);
          }
          continue;
        }

        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.2);
        grad.addColorStop(0, p.color + p.alpha + ')');
        grad.addColorStop(1, p.color + '0)');
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 12,
        opacity: active ? 0.95 : 0,
        transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
};

export const ShareOverlay: React.FC = () => {
  const { isShareOpen, setShareOpen, canvasItems } = useEditorState();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [publishedPublicly, setPublishedPublicly] = useState(false);
  
  // Generating phase state
  const [isGenerating, setIsGenerating] = useState(true);
  
  const [form, setForm] = useState({
    title: '',
    author: '',
    note: '',
    isPublic: true,
  });

  // Extract unique flower names and meanings
  const flowerPairs = Array.from(
    new Map(
      canvasItems
        .filter(i => i.asset.type === 'flower' && i.asset.name)
        .map(i => [i.asset.name, i.asset.meaning || ''])
    ).entries()
  ).map(([name, meaning]) => ({ name, meaning }));

  const flowerNames = flowerPairs.map(p => p.name);
  const flowerMeanings = flowerPairs.map(p => p.meaning);

  // Capture canvas snapshot on load/open
  useEffect(() => {
    if (!isShareOpen) return;

    setCardImage(null); // Clear previous snapshot immediately
    setSharedId(null);
    setIsSubmitted(false);
    setIsGenerating(true);
    setForm({ title: '', author: '', note: '', isPublic: true });
    
    const node = document.getElementById('canvas-container');
    if (!node) return;

    const prev = useEditorState.getState().selectedItemId;
    useEditorState.getState().setSelectedItem(null);

    setTimeout(async () => {
      try {
        const dataUrl = await toJpeg(node, {
          cacheBust: true,
          pixelRatio: 1, // High-performance resolution
          quality: 0.65, // Optimal JPEG compression
        });
        setCardImage(dataUrl);
      } catch (err) {
        console.error('Render error:', err);
        setCardImage(null);
      } finally {
        if (prev) useEditorState.getState().setSelectedItem(prev);
      }
    }, 150);
  }, [isShareOpen]);

  // End generating phase after card image is loaded and 1.0s of sparkling particles
  useEffect(() => {
    if (cardImage) {
      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cardImage]);

  const handleShareSubmit = async (isPublic: boolean) => {
    if (!cardImage || sharing) return;
    setSharing(true);
    setPublishedPublicly(isPublic);

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: cardImage,
          cardTitle: form.title.trim() || null,
          personalNote: form.note.trim() || null,
          flowerNames,
          flowerMeanings,
          authorName: form.author.trim() || '匿名創作者',
          isPublic,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setSharedId(data.id);
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Sharing failed:', err);
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

  const handleCopyNote = () => {
    const text = form.note.trim() || '願這張小小的花卡，帶給你滿滿的祝福 🌸';
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShareOpen(false);
    if (publishedPublicly && sharedId) {
      window.location.href = `/card/${sharedId}`;
    }
  };

  const handlePublishFromSuccess = async () => {
    if (!sharedId || sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/cards/${sharedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: true }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishedPublicly(true);
        window.location.href = `/card/${sharedId}`;
      }
    } catch (err) {
      console.error('Failed to publish publicly:', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div 
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <style>{mistDriftStyles}</style>

      {/* Top Navigation */}
      <div style={styles.topNav}>
        <button style={styles.backBtn} onClick={handleClose}>
          <ArrowLeft size={18} />
          {isSubmitted ? '關閉分享' : '返回編輯'}
        </button>
        <div style={styles.navTitle}>
          <Sparkles size={16} color="var(--color-accent)" />
          <span>Floriography Share Page</span>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.layout}>
          
          {/* Left Column: Mist-Shrouded Canvas Backdrop + Large Crystallizing/Floating Card */}
          <div style={styles.leftCol}>
            <div style={styles.blurCardHolder}>
              
              {/* Dynamic 3D Shifting Cloud & Fog Layers (雲霧繚繞) */}
              <div style={styles.mistContainer}>
                <div style={{ ...styles.mistBlob, ...styles.mistBlob1 }} />
                <div style={{ ...styles.mistBlob, ...styles.mistBlob2 }} />
                <div style={{ ...styles.mistBlob, ...styles.mistBlob3 }} />
              </div>
              
              {/* Soft Ambient Shadow Mask */}
              <div style={styles.blurMask} />
              
              {/* Floating, animated Large Card */}
              <motion.div
                style={styles.floatingCard}
                initial={{ scale: 0.9, y: 35, opacity: 0, rotate: -2 }}
                animate={
                  isGenerating 
                    ? { scale: 0.9, y: 0, opacity: 1, rotate: 0 }
                    : { 
                        scale: 1, 
                        y: [-10, 10, -10], 
                        opacity: 1,
                        rotate: [-0.6, 0.6, -0.6] 
                      }
                }
                transition={
                  isGenerating
                    ? { scale: { duration: 0.5 }, opacity: { duration: 0.6 } }
                    : {
                        scale: { type: 'spring', damping: 22, stiffness: 90 },
                        y: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' },
                        rotate: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' }
                      }
                }
              >
                {/* 1. Real-time Canvas Sparkle Condensation */}
                <ParticleCanvas active={isGenerating} />

                {/* 2. Frosted/Generating Cover Overlay with Fog */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div 
                      style={styles.frostedOverlay}
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9 }}
                    >
                      {/* Floating fog layer in card overlay */}
                      <div style={styles.overlayFog} />
                      
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                        style={{ marginBottom: 18, zIndex: 3 }}
                      >
                        <Sparkles size={40} color="var(--color-accent)" />
                      </motion.div>
                      <motion.span 
                        style={styles.generatingText}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      >
                        凝聚花之祝福中...
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. The card image itself */}
                {cardImage ? (
                  <div style={styles.cardImageWrapper}>
                    <img src={cardImage} alt="設計卡片預覽" style={styles.cardImage} />
                    <div style={styles.cardGlowOverlay} />
                  </div>
                ) : (
                  <div style={styles.cardLoading}>
                    <motion.div 
                      animate={{ opacity: [0.4, 0.8, 0.4] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      正在讀取卡片...
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Right Column: Premium Studio Oatmeal Form Card */}
          <div style={styles.rightCol}>
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.div
                  key="share-form"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.3 }}
                  style={styles.formContainer}
                >
                  <div style={styles.formHeader}>
                    <h2 style={styles.mainTitle}>發佈數位賀卡</h2>
                    <p style={styles.subtitle}>將您的設計發佈至公開牆，並取得專屬連結分享給最重要的人。</p>
                  </div>

                  {/* Dynamic Flower Meanings */}
                  {flowerPairs.length > 0 && (
                    <div style={styles.flowerSection}>
                      <div style={styles.flowerHeader}>
                        <Flower2 size={16} color="var(--color-accent)" />
                        <span style={styles.flowerTitle}>卡片中使用的花語</span>
                      </div>
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

                  {/* Inputs */}
                  <form style={styles.form} onSubmit={(e) => e.preventDefault()}>
                    <div style={styles.field}>
                      <label style={styles.label}>
                        <Sparkles size={14} color="var(--color-accent)" />
                        卡片名稱
                      </label>
                      <input 
                        type="text" 
                        style={styles.input} 
                        placeholder="為這張賀卡取個美麗的名字..."
                        value={form.title}
                        onChange={(e) => setForm({...form, title: e.target.value.substring(0, 40)})}
                        maxLength={40}
                      />
                      <div style={styles.charCount}>{form.title.length} / 40</div>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>
                        <User size={14} color="var(--color-accent)" />
                        作者名稱
                      </label>
                      <input 
                        type="text" 
                        style={styles.input} 
                        placeholder="預設為匿名創作者"
                        value={form.author}
                        onChange={(e) => setForm({...form, author: e.target.value.substring(0, 20)})}
                        maxLength={20}
                      />
                      <div style={styles.charCount}>{form.author.length} / 20</div>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>
                        <Heart size={14} color="var(--color-accent)" />
                        祝福小語 / 給對方的溫暖心意
                      </label>
                      <textarea 
                        style={styles.textarea} 
                        placeholder="寫下溫暖的文字傳達心意... 🌸"
                        value={form.note}
                        onChange={(e) => setForm({...form, note: e.target.value.substring(0, 200)})}
                        maxLength={200}
                      />
                      <div style={styles.charCount}>{form.note.length} / 200</div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div style={styles.actionBtnGroup}>
                      <button 
                        type="button" 
                        onClick={() => handleShareSubmit(false)}
                        style={styles.sharePrivateBtn} 
                        disabled={sharing || isGenerating || !cardImage}
                      >
                        <Send size={15} />
                        {sharing && !publishedPublicly ? '正在生成專屬連結...' : '私下分享給朋友 (複製連結)'}
                      </button>

                      <button 
                        type="button" 
                        onClick={() => handleShareSubmit(true)}
                        style={styles.publishPublicBtn} 
                        disabled={sharing || isGenerating || !cardImage}
                      >
                        <Flower2 size={15} />
                        {sharing && publishedPublicly ? '正在發佈至公開牆...' : '發佈至公開花卡牆 (Gallery)'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success-share"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                  style={styles.successContainer}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 12, stiffness: 200 }}
                    style={{ marginBottom: '20px' }}
                  >
                    <CheckCircle size={76} color="var(--color-accent)" strokeWidth={1.5} />
                  </motion.div>
                  
                  <h2 style={styles.successTitle}>
                    {publishedPublicly ? '數位賀卡發佈成功！' : '專屬分享連結已生成！'}
                  </h2>
                  <p style={styles.successSub}>
                    {publishedPublicly ? (
                      <>
                        您的作品已順利發佈到花卡推特公開牆！<br />
                        複製下方專屬連結，傳遞您溫暖的花之祝福。
                      </>
                    ) : (
                      <>
                        已成功生成您的專屬私人賀卡連結，此卡將不會公開顯示在畫廊中。<br />
                        快複製下方專屬連結，發送給最特別的人吧！🌸
                      </>
                    )}
                  </p>

                  {/* Shared Link Box */}
                  <div style={styles.shareUrlBox}>
                    <p style={styles.shareUrlLabel}>🌸 賀卡專屬網址：</p>
                    <div style={styles.shareUrlRow}>
                      <span style={styles.shareUrlText}>{shareUrl}</span>
                      <button style={styles.linkCopyBtn} onClick={handleCopyLink}>
                        {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={styles.openLinkBtn}>
                        <Eye size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={styles.successActions}>
                    <button style={styles.successCopyBtn} onClick={handleCopyNote}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? '留言內容已複製！' : '複製個人留言'}
                    </button>
                    
                    <button style={styles.primaryActionBtn} onClick={handleCopyLink}>
                      {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                      {linkCopied ? '連結已複製！' : '複製分享連結'}
                    </button>
                  </div>

                  {/* If shared privately, allow user to publish publicly as well! */}
                  {!publishedPublicly && (
                    <button 
                      onClick={handlePublishFromSuccess} 
                      style={styles.publishFromSuccessBtn}
                      disabled={sharing}
                    >
                      <Flower2 size={16} />
                      {sharing ? '正在公開發佈...' : '加碼發佈至公開花卡牆 (Gallery)'}
                    </button>
                  )}

                  <button 
                    style={styles.continueBtn} 
                    onClick={handleClose}
                  >
                    {publishedPublicly ? '查看專屬數位賀卡網頁' : '返回編輯工作區'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(252, 249, 246, 0.88)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  topNav: {
    height: '64px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 40px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    flexShrink: 0,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 18px',
    backgroundColor: 'var(--color-oat-300)',
    color: 'var(--color-brown-700)',
    borderRadius: 'var(--radius-full)',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  navTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    letterSpacing: '0.05em',
  },
  container: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 60px',
    boxSizing: 'border-box',
  },
  layout: {
    maxWidth: '1240px',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '60px',
    alignItems: 'center',
  },
  leftCol: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: '100%',
  },
  blurCardHolder: {
    position: 'relative',
    width: '450px', // Increased card size significantly as requested!
    height: '600px', // Aspect ratio 3:4 for perfect high-fidelity display
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mistContainer: {
    position: 'absolute',
    inset: '-60px',
    pointerEvents: 'none',
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: '32px',
  },
  mistBlob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(45px)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    mixBlendMode: 'overlay',
  },
  mistBlob1: {
    width: '280px',
    height: '280px',
    left: '5%',
    top: '10%',
    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(240, 220, 200, 0.1) 70%, transparent 100%)',
    animation: 'mistDrift1 14s infinite ease-in-out',
  },
  mistBlob2: {
    width: '320px',
    height: '320px',
    right: '8%',
    bottom: '12%',
    background: 'radial-gradient(circle, rgba(253, 245, 230, 0.6) 0%, rgba(244, 210, 190, 0.1) 70%, transparent 100%)',
    animation: 'mistDrift2 16s infinite ease-in-out',
  },
  mistBlob3: {
    width: '260px',
    height: '260px',
    left: '25%',
    bottom: '20%',
    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)',
    animation: 'mistDrift3 12s infinite ease-in-out',
  },
  blurMask: {
    position: 'absolute',
    width: '510px',
    height: '660px',
    borderRadius: '40px',
    background: 'radial-gradient(circle, rgba(139, 90, 43, 0.08) 0%, rgba(139, 90, 43, 0.015) 75%, transparent 100%)',
    filter: 'blur(35px)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  floatingCard: {
    width: '100%',
    height: '100%',
    borderRadius: '28px',
    boxShadow: '0 35px 80px rgba(139, 90, 43, 0.28), 0 10px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    backgroundColor: '#fff',
    border: '1px solid rgba(139, 90, 43, 0.1)',
    zIndex: 3,
    position: 'relative',
  },
  frostedOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(252, 249, 246, 0.72)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  overlayFog: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(252,249,246,0.1) 80%)',
    filter: 'blur(15px)',
    zIndex: 2,
  },
  generatingText: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    fontFamily: 'Noto Serif TC, Georgia, serif',
    letterSpacing: '0.06em',
    zIndex: 3,
  },
  cardImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  cardGlowOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(105deg, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 60%)',
    pointerEvents: 'none',
  },
  cardLoading: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-brown-400)',
    fontSize: '15px',
    fontStyle: 'italic',
    backgroundColor: 'var(--color-oat-100)',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
  },
  formContainer: {
    backgroundColor: 'var(--color-oat-100)',
    border: '1px solid var(--color-border)',
    borderRadius: '28px',
    padding: '40px',
    boxShadow: 'var(--shadow-lg)',
  },
  formHeader: {
    marginBottom: '28px',
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-brown-700)',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--color-brown-400)',
    lineHeight: 1.5,
    margin: 0,
  },
  flowerSection: {
    background: 'rgba(179, 130, 64, 0.04)',
    border: '1px solid rgba(179, 130, 64, 0.12)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 20px',
    marginBottom: '28px',
  },
  flowerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  flowerTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-brown-500)',
    letterSpacing: '0.03em',
  },
  flowerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  flowerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  flowerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-brown-900)',
  },
  flowerDivider: {
    fontSize: '12px',
    color: 'var(--color-brown-300)',
  },
  flowerMeaning: {
    fontSize: '12px',
    color: 'var(--color-brown-500)',
    fontStyle: 'italic',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-brown-500)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  input: {
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
  },
  textarea: {
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    minHeight: '84px',
    resize: 'none',
    backgroundColor: '#fff',
    lineHeight: 1.5,
  },
  charCount: {
    fontSize: '11px',
    color: 'var(--color-brown-300)',
    textAlign: 'right',
  },
  submitBtn: {
    marginTop: '10px',
    padding: '18px',
    background: 'linear-gradient(135deg, #7c5c30, #b38240)',
    color: '#fff',
    borderRadius: 'var(--radius-lg)',
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 8px 24px rgba(124, 92, 48, 0.2)',
    transition: 'all 0.2s',
  },
  successContainer: {
    backgroundColor: 'var(--color-oat-100)',
    border: '1px solid var(--color-border)',
    borderRadius: '28px',
    padding: '40px',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: '26px',
    fontWeight: 700,
    color: 'var(--color-brown-700)',
    margin: '0 0 8px 0',
  },
  successSub: {
    fontSize: '14px',
    color: 'var(--color-brown-400)',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
  },
  shareUrlBox: {
    width: '100%',
    background: 'rgba(179, 130, 64, 0.05)',
    border: '1px solid rgba(179, 130, 64, 0.12)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left',
    boxSizing: 'border-box',
  },
  shareUrlLabel: {
    fontSize: '12px',
    color: 'var(--color-brown-700)',
    fontWeight: 600,
    marginBottom: '8px',
    marginTop: 0,
  },
  shareUrlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  shareUrlText: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--color-brown-950)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  linkCopyBtn: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(179, 130, 64, 0.08)',
    border: '1px solid rgba(179, 130, 64, 0.15)',
    color: 'var(--color-brown-700)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  openLinkBtn: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(179, 130, 64, 0.08)',
    border: '1px solid rgba(179, 130, 64, 0.15)',
    color: 'var(--color-brown-700)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    textDecoration: 'none',
  },
  successActions: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    marginBottom: '24px',
  },
  successCopyBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(179, 130, 64, 0.25)',
    backgroundColor: 'rgba(179, 130, 64, 0.04)',
    color: 'var(--color-brown-700)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  primaryActionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    background: 'linear-gradient(135deg, #7c5c30, #b38240)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
  continueBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'var(--color-brown-700)',
    color: '#fff',
    borderRadius: 'var(--radius-lg)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  actionBtnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  sharePrivateBtn: {
    padding: '16px',
    background: 'rgba(92, 64, 51, 0.05)',
    border: '1px solid rgba(92, 64, 51, 0.12)',
    color: 'var(--color-brown-700)',
    borderRadius: 'var(--radius-lg)',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  publishPublicBtn: {
    padding: '16px',
    background: 'linear-gradient(135deg, #7c5c30, #b38240)',
    color: '#fff',
    borderRadius: 'var(--radius-lg)',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 8px 24px rgba(124, 92, 48, 0.15)',
    transition: 'all 0.2s',
  },
  publishFromSuccessBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #7c5c30, #b38240)',
    color: '#fff',
    borderRadius: 'var(--radius-lg)',
    fontSize: '15px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 8px 24px rgba(124, 92, 48, 0.15)',
    transition: 'all 0.2s',
    marginTop: '12px',
    marginBottom: '16px',
  },
};
