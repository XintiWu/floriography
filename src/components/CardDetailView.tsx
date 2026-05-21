"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ArrowLeft, Flower2, Copy, Check, Share2, Sparkles, Heart, X, Send, CreditCard, User, Phone, MapPin, MessageSquare, ChevronLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { getDisplayCardTitle } from "@/lib/galleryDisplay";

interface CardData {
  id: string;
  image_data: string;
  card_title: string | null;
  personal_note: string | null;
  message: string;
  flower_names: string[];
  flower_meanings: string[];
  author_name: string;
  view_count: number;
  created_at: string;
}

// Breathtaking, slow floating particles for the aesthetic oatmeal experience
interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  color: string;
}

function generateSparkles(count: number): Sparkle[] {
  const colors = [
    "rgba(240, 212, 172, 0.45)", // Warm Gold Sparkle
    "rgba(247, 197, 192, 0.35)", // Petal Pink Glow
    "rgba(196, 154, 98, 0.3)",   // Soft Terracotta
    "rgba(255, 245, 240, 0.5)",   // Radiant Shimmer
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 80 + Math.random() * 20, // Start near the bottom
    size: Math.random() * 6 + 2,
    duration: 10 + Math.random() * 12,
    delay: Math.random() * -15, // Negative delay to start immediately in-motion
    drift: (Math.random() - 0.5) * 80,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function CardDetailView({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<CardData | null>(null);
  const [feedIndex, setFeedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Comments state
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [newCommentName, setNewCommentName] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Auto-checkout custom order states
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutSubmitted, setCheckoutSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutSubmitting) return;
    setCheckoutSubmitting(true);
    try {
      const res = await fetch("/api/order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card?.id,
          customerName: checkoutForm.name.trim(),
          contact: checkoutForm.phone.trim(),
          preferredPickup: checkoutForm.address.trim(),
          timeWindow: "不限時段",
          budgetTwd: 520,
          purpose: `複製創作「${card?.card_title || '無題的作品'}」實體化訂製`,
          notes: checkoutForm.notes.trim(),
          customRequest: `由數位賀卡 ID: ${card?.id} 自動複製實體化製作，創作者為 ${card?.author_name || '匿名'}`
        }),
      });
      const data = await res.json();
      if (data.id) {
        setOrderId(data.id);
        setCheckoutSubmitted(true);
      }
    } catch (err) {
      console.error("Failed to place order:", err);
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: newCommentName.trim() || "匿名花友",
          text: newCommentText.trim(),
        }),
      });
      const data = await res.json();
      if (data.comments) {
        setCommentsList(data.comments);
        setNewCommentText("");
        setNewCommentName("");
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/cards/${cardId}`).then((r) => r.json()),
      fetch("/api/cards").then((r) => r.json()),
    ])
      .then(([detail, list]) => {
        const cards = list.cards || [];
        const idx = cards.findIndex((c: { id: string }) => c.id === cardId);
        setFeedIndex(idx >= 0 ? idx : 0);
        setCard(detail.card || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cardId]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/card/${cardId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const displayTitle = card ? getDisplayCardTitle(card, feedIndex) : "";

  const flowerPairs = card
    ? (card.flower_names || []).map((name, idx) => ({
        name,
        meaning: (card.flower_meanings || [])[idx] || "",
      }))
    : [];

  return (
    <div style={styles.root}>
      {/* 1. Global Custom Drifting Mist Animations Stylesheet */}
      <style>{`
        @keyframes detailMistDrift1 {
          0% { transform: translate(-10%, -10%) rotate(0deg) scale(1); opacity: 0.4; }
          50% { transform: translate(10%, 15%) rotate(180deg) scale(1.3); opacity: 0.65; }
          100% { transform: translate(-10%, -10%) rotate(360deg) scale(1); opacity: 0.4; }
        }
        @keyframes detailMistDrift2 {
          0% { transform: translate(15%, -15%) rotate(0deg) scale(1.25); opacity: 0.45; }
          50% { transform: translate(-15%, 10%) rotate(-180deg) scale(0.9); opacity: 0.6; }
          100% { transform: translate(15%, -15%) rotate(-360deg) scale(1.25); opacity: 0.45; }
        }
      `}</style>

      {/* 2. Slow Drifting Shifting Cloud & Fog Layers (雲霧繚繞) */}
      <div style={styles.mistContainer}>
        <div style={{ ...styles.mistBlob, ...styles.mistBlob1 }} />
        <div style={{ ...styles.mistBlob, ...styles.mistBlob2 }} />
      </div>

      {/* 3. Aesthetic Floating Sparkles (微光粒子浮動) */}
      {sparkles.map((sp) => (
        <motion.div
          key={sp.id}
          style={{
            position: "fixed",
            bottom: "-20px",
            left: `${sp.x}%`,
            width: sp.size,
            height: sp.size,
            borderRadius: "50%",
            backgroundColor: sp.color,
            pointerEvents: "none",
            zIndex: 1,
            boxShadow: `0 0 ${sp.size * 2}px ${sp.color}`,
          }}
          animate={{
            y: ["0vh", "-110vh"],
            x: [0, sp.drift],
            opacity: [0, 0.7, 0.4, 0],
          }}
          transition={{
            duration: sp.duration,
            delay: sp.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 4. Elegant Absolute Floating Buttons (No secondary navbar!) */}
      <Link href="/gallery" style={styles.backBtnAbsolute}>
        <ArrowLeft size={16} />
        <span>返回畫廊</span>
      </Link>

      <button onClick={handleCopyLink} style={styles.shareBtnAbsolute}>
        {linkCopied ? <Check size={14} /> : <Share2 size={14} />}
        <span>{linkCopied ? "複製成功" : "分享賀卡"}</span>
      </button>

      {/* 5. Main Card Layout Container */}
      <main style={styles.main}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{ marginBottom: 12 }}
            >
              <Sparkles size={32} color="#8B5A2B" />
            </motion.div>
            <span style={styles.loadingText}>凝聚美好花語中...</span>
          </div>
        ) : !card ? (
          <div style={styles.errorContainer}>
            <Flower2 size={48} color="#A89587" style={{ marginBottom: 16 }} />
            <h3 style={styles.errorTitle}>找不到此數位花卡</h3>
            <p style={styles.errorSub}>該卡片可能已被移除，或連結輸入不正確。</p>
            <Link href="/gallery" style={styles.errorLink}>
              返回花卡畫廊
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <div className="detail-card-grid" style={styles.cardGrid}>
            
            {/* Left Column: Floating Large Digital Card */}
            <div style={styles.leftColumn}>
              <div style={styles.cardWrapper}>
                <div style={styles.cardShadowBlur} />
                
                <motion.div
                  style={styles.cardFrame}
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: [-12, 12, -12],
                    rotate: [-0.6, 0.6, -0.6]
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>

            {/* Card title */}
            {displayTitle && (
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "rgba(245, 225, 195, 0.95)",
                  fontFamily: "'Georgia', 'Noto Serif TC', serif",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {displayTitle}
              </motion.h1>
            )}

            {/* Flower name + meaning pairs */}
            {flowerPairs.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  background: "rgba(210, 160, 100, 0.06)",
                  border: "1px solid rgba(210, 160, 100, 0.15)",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  width: "100%",
                  maxWidth: "360px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(210, 160, 100, 0.5)",
                    margin: "0 0 4px",
                  }}
                >
                  <img src={card.image_data} alt={card.card_title || "壓花賀卡"} style={styles.cardImg} />
                  <div style={styles.cardGlow} />
                </motion.div>
              </div>
            </div>

            {/* Right Column: Premium Text Details */}
            <motion.div 
              style={styles.rightColumn}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div style={styles.detailsCard} className="glass">
                {/* Header Title */}
                <div style={styles.detailsHeader}>
                  <div style={styles.eyebrow}>
                    <Sparkles size={11} color="#8B5A2B" />
                    <span>DIGITAL FLOWER CARD</span>
                  </div>
                  <h1 style={styles.cardTitle}>{card.card_title || "無題的作品"}</h1>
                  
                  <div style={styles.authorBadge}>
                    <span>由</span>
                    <span style={styles.authorName}>{card.author_name}</span>
                    <span>精心編織</span>
                  </div>
                </div>

                {/* Personal Note Section */}
                {card.personal_note && (
                  <div style={styles.noteSection}>
                    <div style={styles.quoteMarkLeft}>“</div>
                    <p style={styles.personalNote}>{card.personal_note}</p>
                    <div style={styles.quoteMarkRight}>”</div>
                  </div>
                )}

                {/* Paired Flower Meanings */}
                {flowerPairs.length > 0 && (
                  <div style={styles.meaningsSection}>
                    <div style={styles.meaningsHeader}>
                      <Flower2 size={14} color="#8B5A2B" />
                      <span>本卡所寄託的花語</span>
                    </div>
                    
                    <div style={styles.meaningsList}>
                      {flowerPairs.map(({ name, meaning }) => (
                        <div key={name} style={styles.meaningItem}>
                          <span style={styles.flowerName}>{name}</span>
                          {meaning && (
                            <>
                              <span style={styles.meaningDot}>·</span>
                              <span style={styles.flowerMeaning}>{meaning}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Metadata */}
                <div style={styles.detailsFooter}>
                  <span style={styles.viewsCount}>
                    <Eye size={13} style={{ marginRight: 4 }} />
                    已送達 {card.view_count} 次祝福
                  </span>
                  
                  <span style={styles.dateText}>
                    {new Date(card.created_at).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* CTA Action Block */}
                <div style={styles.ctaBlock}>
                  <div style={styles.ctaDivider}>
                    <span style={styles.ctaDot} />
                    <span style={styles.ctaLine} />
                    <span style={styles.ctaDot} />
                  </div>
                  <button onClick={() => setShowCheckout(true)} style={styles.ctaBtn}>
                    <Flower2 size={16} />
                    <span>我也要這張賀卡</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>

          {/* Comments Guestbook Section */}
          <div id="comments" style={styles.commentsSection}>
            <div style={styles.commentsHeader}>
              <MessageSquare size={20} color="#8B5A2B" />
              <h2 style={styles.commentsTitle}>花友的溫暖留言 ({commentsList.length})</h2>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} style={styles.detailCommentForm}>
              <div style={styles.commentFormRow}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: "260px" }}>
                  <label style={styles.commentLabel}>您的稱呼 (選填)</label>
                  <input
                    type="text"
                    placeholder="例如：小花、匿名花友"
                    style={styles.commentInput}
                    value={newCommentName}
                    onChange={(e) => setNewCommentName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px", minWidth: "300px" }}>
                  <label style={styles.commentLabel}>留言內容 (必填)</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      required
                      placeholder="寫下您對這張花卡的喜愛與溫暖祝福..."
                      style={styles.commentInput}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      maxLength={150}
                    />
                    <button
                      type="submit"
                      disabled={commentSubmitting}
                      style={styles.commentSubmitBtn}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7A4F25";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#8B5A2B";
                      }}
                    >
                      {commentSubmitting ? "發送中" : "發送祝福"}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            {commentsList.length === 0 ? (
              <div style={styles.noCommentsBox}>
                <Sparkles size={20} color="#8B5A2B" style={{ opacity: 0.4, marginBottom: "8px" }} />
                <p style={{ margin: 0, fontSize: "13px", color: "#8A7365" }}>還沒有花友留言，留下第一個溫馨祝福吧！</p>
              </div>
            ) : (
              <div style={styles.commentsFeed}>
                {commentsList.map((c, idx) => (
                  <div key={c.id || idx} style={styles.commentCard}>
                    <div style={styles.commentAvatar}>
                      {(c.author_name || "匿")[0]}
                    </div>
                    <div style={styles.commentBody}>
                      <div style={styles.commentMeta}>
                        <span style={styles.commentAuthorName}>{c.author_name}</span>
                        <span style={styles.commentTime}>
                          {new Date(c.created_at || Date.now()).toLocaleDateString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p style={styles.commentContentText}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}
      </main>

      {/* 6. High-fidelity glassmorphic auto-checkout modal overlay */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div 
            style={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              style={styles.modalContent}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Close Button */}
              <button 
                style={styles.modalCloseBtn}
                onClick={() => {
                  setShowCheckout(false);
                  setCheckoutSubmitted(false);
                }}
              >
                <X size={20} />
              </button>

              {!checkoutSubmitted ? (
                <div style={styles.modalBody}>
                  <div style={styles.modalLeft}>
                    <h3 style={styles.modalSubtitle}>訂製專屬實體卡片</h3>
                    <h2 style={styles.modalTitle}>我也要這張賀卡</h2>
                    
                    {/* Romance Price Tag */}
                    <div style={styles.modalPriceContainer}>
                      <span style={styles.modalPriceLabel}>珍藏訂製價</span>
                      <span style={styles.modalPrice}>NT$ 520</span>
                      <span style={styles.modalPriceDesc}>（由花藝師複製此數位賀卡設計，手工編織壓花實體送達）</span>
                    </div>

                    <div style={styles.modalCardPreviewFrame}>
                      <img 
                        src={card?.image_data || undefined} 
                        alt="預覽賀卡" 
                        style={styles.modalCardPreviewImg} 
                      />
                    </div>
                  </div>

                  <div style={styles.modalRight}>
                    <form onSubmit={handleCheckoutSubmit} style={styles.checkoutForm}>
                      <div style={styles.formField}>
                        <label style={styles.formLabel}>
                          <User size={13} style={{ marginRight: 6 }} />
                          收件人姓名
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="請輸入收件人姓名"
                          style={styles.formInput}
                          value={checkoutForm.name}
                          onChange={(e) => setCheckoutForm({...checkoutForm, name: e.target.value})}
                        />
                      </div>

                      <div style={styles.formField}>
                        <label style={styles.formLabel}>
                          <Phone size={13} style={{ marginRight: 6 }} />
                          聯絡電話
                        </label>
                        <input 
                          type="tel" 
                          required
                          placeholder="請輸入電話 (如：0912-345-678)"
                          style={styles.formInput}
                          value={checkoutForm.phone}
                          onChange={(e) => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                        />
                      </div>

                      <div style={styles.formField}>
                        <label style={styles.formLabel}>
                          <MapPin size={13} style={{ marginRight: 6 }} />
                          收件地址 / 寄送門市
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="請輸入收件完整地址或超商門市"
                          style={styles.formInput}
                          value={checkoutForm.address}
                          onChange={(e) => setCheckoutForm({...checkoutForm, address: e.target.value})}
                        />
                      </div>

                      <div style={styles.formField}>
                        <label style={styles.formLabel}>
                          <MessageSquare size={13} style={{ marginRight: 6 }} />
                          給花藝師的溫馨備註 (選填)
                        </label>
                        <textarea 
                          placeholder="是否有特別想要調整的細節？或要寫在實體卡片上的卡片祝詞？"
                          style={styles.formTextarea}
                          value={checkoutForm.notes}
                          onChange={(e) => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                        />
                      </div>

                      <button 
                        type="submit" 
                        style={styles.formSubmitBtn}
                        disabled={checkoutSubmitting}
                      >
                        <Send size={16} />
                        {checkoutSubmitting ? "正在為您提交預訂..." : "確認預訂此賀卡"}
                      </button>

                      <div style={styles.formHelpText}>
                        <CreditCard size={12} style={{ marginRight: 4 }} />
                        <span>下單後花藝師將於 24 小時內聯絡確認實體製作與付款細節</span>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div style={styles.successWrapper}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 180 }}
                    style={{ marginBottom: 20 }}
                  >
                    <CheckCircle size={80} color="#8B5A2B" strokeWidth={1.5} />
                  </motion.div>
                  
                  <h2 style={styles.successTitleText}>客製化賀卡預訂成功！</h2>
                  <p style={styles.successSubText}>
                    我們已收到您的實體賀卡定製需求。<br />
                    花藝師將於 24 小時內親自透過電話與您確認手工製作與配送細節。
                  </p>
                  
                  <div style={styles.orderReceipt}>
                    <div style={styles.receiptRow}>
                      <span>專屬預訂單號</span>
                      <span style={{ fontWeight: 700, color: "#8B5A2B" }}>{orderId}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span>訂製款式</span>
                      <span>{card?.card_title || "無題的作品"}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span>收件人姓名</span>
                      <span>{checkoutForm.name}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span>珍藏定製金額</span>
                      <span style={{ fontWeight: 600, color: "#8B5A2B" }}>NT$ 520</span>
                    </div>
                  </div>

                  <button 
                    style={styles.successCloseBtn}
                    onClick={() => {
                      setShowCheckout(false);
                      setCheckoutSubmitted(false);
                      setCheckoutForm({ name: "", phone: "", address: "", notes: "" });
                    }}
                  >
                    返回卡片網頁
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    width: "100vw",
    background: "#FCF9F6", // Absolute pure oatmeal background
    color: "#3E2723",     // Warm brown ink
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflowX: "hidden",
    boxSizing: "border-box",
  },
  mistContainer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    overflow: "hidden",
  },
  mistBlob: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(60px)",
    mixBlendMode: "multiply",
    opacity: 0.5,
  },
  mistBlob1: {
    width: "550px",
    height: "550px",
    left: "-10%",
    top: "10%",
    background: "radial-gradient(circle, rgba(234, 220, 209, 0.6) 0%, rgba(252, 249, 246, 0) 70%)",
    animation: "detailMistDrift1 18s infinite ease-in-out",
  },
  mistBlob2: {
    width: "650px",
    height: "650px",
    right: "-10%",
    bottom: "5%",
    background: "radial-gradient(circle, rgba(223, 206, 190, 0.5) 0%, rgba(252, 249, 246, 0) 70%)",
    animation: "detailMistDrift2 22s infinite ease-in-out",
  },
  backBtnAbsolute: {
    position: "absolute",
    top: "24px",
    left: "40px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#F5EBE6",
    color: "#5C4033",
    borderRadius: "9999px",
    fontSize: "13px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(92, 64, 51, 0.06)",
    transition: "all 0.2s ease",
    zIndex: 10,
  },
  shareBtnAbsolute: {
    position: "absolute",
    top: "24px",
    right: "40px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    border: "1px solid #EADCD1",
    backgroundColor: "#FCF9F6",
    color: "#8B5A2B",
    borderRadius: "9999px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(92, 64, 51, 0.06)",
    transition: "all 0.2s ease",
    zIndex: 10,
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 40px",
    zIndex: 2,
    boxSizing: "border-box",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#7A6355",
  },
  loadingText: {
    fontSize: "15px",
    fontWeight: 500,
    fontFamily: "Noto Serif TC, Georgia, serif",
    letterSpacing: "0.05em",
  },
  errorContainer: {
    textAlign: "center",
    padding: "60px 40px",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: "28px",
    border: "1px solid #EADCD1",
    maxWidth: "400px",
    boxShadow: "0 10px 30px rgba(92, 64, 51, 0.04)",
  },
  errorTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#3E2723",
    margin: "0 0 8px 0",
  },
  errorSub: {
    fontSize: "14px",
    color: "#7A6355",
    lineHeight: 1.5,
    margin: "0 0 24px 0",
  },
  errorLink: {
    display: "inline-block",
    padding: "10px 24px",
    backgroundColor: "#8B5A2B",
    color: "#fff",
    borderRadius: "9999px",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(139, 90, 43, 0.15)",
  },
  cardGrid: {
    maxWidth: "1160px",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: "60px",
    alignItems: "center",
  } as React.CSSProperties,
  leftColumn: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    position: "relative",
    width: "440px",
    height: "587px", // Matches perfect 3:4 aspect ratio
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  cardShadowBlur: {
    position: "absolute",
    width: "480px",
    height: "630px",
    background: "radial-gradient(circle, rgba(139, 90, 43, 0.08) 0%, rgba(139, 90, 43, 0.015) 75%, transparent 100%)",
    filter: "blur(30px)",
    zIndex: 1,
  },
  cardFrame: {
    width: "100%",
    height: "100%",
    borderRadius: "28px",
    boxShadow: "0 30px 80px rgba(122, 99, 85, 0.2), 0 10px 24px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    border: "1px solid rgba(139, 90, 43, 0.12)",
    backgroundColor: "#fff",
    zIndex: 2,
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  cardGlow: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(105deg, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 60%)",
    pointerEvents: "none",
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  detailsCard: {
    backgroundColor: "rgba(252, 249, 246, 0.65)",
    border: "1px solid #EADCD1",
    borderRadius: "28px",
    padding: "44px",
    boxShadow: "0 12px 40px rgba(92, 64, 51, 0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  },
  detailsHeader: {
    marginBottom: '28px',
    textAlign: 'center',
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#8B5A2B',
    letterSpacing: '0.15em',
    marginBottom: '10px',
  },
  cardTitle: {
    fontSize: "30px",
    fontWeight: 700,
    color: "#3E2723",
    margin: "0 0 12px 0",
    fontFamily: "Noto Serif TC, Georgia, serif",
    letterSpacing: "0.04em",
    lineHeight: 1.3,
  },
  authorBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "13px",
    color: "#7A6355",
    backgroundColor: "rgba(234, 220, 209, 0.4)",
    padding: "4px 14px",
    borderRadius: "999px",
  },
  authorName: {
    fontWeight: 700,
    color: "#5C4033",
  },
  noteSection: {
    position: "relative",
    background: "rgba(245, 235, 230, 0.55)",
    borderLeft: "3px solid #8B5A2B",
    borderRadius: "0 16px 16px 0",
    padding: "20px 24px",
    margin: "0 0 32px 0",
  },
  quoteMarkLeft: {
    position: "absolute",
    left: "10px",
    top: "-5px",
    fontSize: "36px",
    fontFamily: "Georgia, serif",
    color: "rgba(139, 90, 43, 0.15)",
    lineHeight: 1,
  },
  quoteMarkRight: {
    position: "absolute",
    right: "12px",
    bottom: "-15px",
    fontSize: "36px",
    fontFamily: "Georgia, serif",
    color: "rgba(139, 90, 43, 0.15)",
    lineHeight: 1,
  },
  personalNote: {
    fontSize: "16px",
    lineHeight: 1.8,
    color: "#5C4033",
    fontFamily: "Noto Serif TC, Georgia, serif",
    fontStyle: "italic",
    margin: 0,
    textAlign: "justify",
  },
  meaningsSection: {
    background: "rgba(139, 90, 43, 0.04)",
    border: "1px solid rgba(139, 90, 43, 0.09)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
    marginBottom: "32px",
  },
  meaningsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#5C4033",
    letterSpacing: "0.06em",
  },
  meaningsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  meaningItem: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    flexWrap: "wrap",
  },
  flowerName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#3E2723",
  },
  meaningDot: {
    fontSize: "11px",
    color: "rgba(139, 90, 43, 0.3)",
  },
  flowerMeaning: {
    fontSize: "13px",
    color: "#7A6355",
    fontStyle: "italic",
    fontFamily: "Noto Serif TC, Georgia, serif",
  },
  detailsFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    color: "#A89587",
    paddingBottom: "24px",
    borderBottom: "1px dashed #EADCD1",
    marginBottom: "28px",
  },
  viewsCount: {
    display: "inline-flex",
    alignItems: "center",
  },
  dateText: {
    letterSpacing: "0.02em",
  },
  ctaBlock: {
    textAlign: "center",
  },
  ctaDivider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  ctaDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    backgroundColor: "#A89587",
  },
  ctaLine: {
    width: "40px",
    height: "1px",
    backgroundColor: "#EADCD1",
  },
  ctaBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: '8px',
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #7c5c30, #b38240)',
    color: '#fff',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(124, 92, 48, 0.15)',
    transition: 'all 0.25s ease',
    border: 'none',
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(62, 39, 35, 0.45)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modalContent: {
    width: "100%",
    maxWidth: "840px",
    backgroundColor: "#FCF9F6",
    borderRadius: "28px",
    border: "1px solid #EADCD1",
    boxShadow: "0 20px 60px rgba(62, 39, 35, 0.25)",
    position: "relative",
    overflow: "hidden",
    padding: "40px",
    boxSizing: "border-box",
  },
  modalCloseBtn: {
    position: "absolute",
    top: "24px",
    right: "24px",
    background: "rgba(92, 64, 51, 0.05)",
    border: "none",
    color: "#5C4033",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  modalBody: {
    display: "grid",
    gridTemplateColumns: "1fr 1.1fr",
    gap: "40px",
  },
  modalLeft: {
    display: "flex",
    flexDirection: "column",
  },
  modalSubtitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#8B5A2B",
    letterSpacing: "0.15em",
    margin: "0 0 6px 0",
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#3E2723",
    margin: "0 0 16px 0",
    fontFamily: "Noto Serif TC, Georgia, serif",
  },
  modalPriceContainer: {
    backgroundColor: "rgba(139, 90, 43, 0.05)",
    border: "1px solid rgba(139, 90, 43, 0.1)",
    borderRadius: "16px",
    padding: "14px 18px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  modalPriceLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#8B5A2B",
  },
  modalPrice: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#b38240",
    fontFamily: "Outfit",
  },
  modalPriceDesc: {
    fontSize: "10px",
    color: "#A89587",
    lineHeight: 1.4,
  },
  modalCardPreviewFrame: {
    width: "100%",
    aspectRatio: "3/4",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid rgba(139, 90, 43, 0.12)",
    boxShadow: "0 8px 24px rgba(92, 64, 51, 0.08)",
  },
  modalCardPreviewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  modalRight: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  checkoutForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  formLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#5C4033",
    display: "flex",
    alignItems: "center",
  },
  formInput: {
    padding: "12px 14px",
    borderRadius: "6px",
    border: "1px solid #EADCD1",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#fff",
    color: "#3E2723",
  },
  formTextarea: {
    padding: "12px 14px",
    borderRadius: "6px",
    border: "1px solid #EADCD1",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#fff",
    color: "#3E2723",
    minHeight: "80px",
    resize: "none",
    lineHeight: 1.5,
  },
  formSubmitBtn: {
    marginTop: "6px",
    padding: "14px",
    background: "linear-gradient(135deg, #7c5c30, #b38240)",
    color: "#fff",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    border: "none",
    boxShadow: "0 8px 24px rgba(124, 92, 48, 0.15)",
  },
  formHelpText: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "#A89587",
    textAlign: "center",
  },
  successWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "20px 0",
  },
  successTitleText: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#3E2723",
    margin: "0 0 10px 0",
    fontFamily: "Noto Serif TC, Georgia, serif",
  },
  successSubText: {
    fontSize: "14px",
    color: "#7A6355",
    lineHeight: 1.6,
    margin: "0 0 24px 0",
  },
  orderReceipt: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "rgba(139, 90, 43, 0.03)",
    border: "1px solid #EADCD1",
    borderRadius: "16px",
    padding: "18px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "28px",
    boxSizing: "border-box",
  },
  receiptRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#5C4033",
  },
  successCloseBtn: {
    width: "100%",
    maxWidth: "280px",
    padding: "14px",
    backgroundColor: "#8B5A2B",
    color: "#fff",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(62, 39, 35, 0.15)",
  },
  commentsSection: {
    width: "100%",
    maxWidth: "1160px",
    marginTop: "80px",
    borderTop: "1px solid #EADCD1",
    paddingTop: "60px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    boxSizing: "border-box",
  },
  commentsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  commentsTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#3E2723",
    margin: 0,
    fontFamily: "Noto Serif TC, Georgia, serif",
  },
  detailCommentForm: {
    backgroundColor: "rgba(139, 90, 43, 0.03)",
    border: "1px solid rgba(139, 90, 43, 0.08)",
    borderRadius: "20px",
    padding: "28px",
    boxSizing: "border-box",
  },
  commentFormRow: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
  commentLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#8B5A2B",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  },
  commentInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #EADCD1",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#fff",
    color: "#3E2723",
    boxSizing: "border-box",
  },
  commentSubmitBtn: {
    padding: "12px 28px",
    backgroundColor: "#8B5A2B",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(139, 90, 43, 0.15)",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  noCommentsBox: {
    textAlign: "center",
    padding: "48px 0",
    backgroundColor: "rgba(139, 90, 43, 0.01)",
    border: "1px dashed rgba(139, 90, 43, 0.15)",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  commentsFeed: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  commentCard: {
    display: "flex",
    gap: "18px",
    backgroundColor: "#fff",
    border: "1px solid rgba(139, 90, 43, 0.08)",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 15px rgba(92, 64, 51, 0.02)",
    boxSizing: "border-box",
  },
  commentAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "rgba(139, 90, 43, 0.1)",
    color: "#8B5A2B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "16px",
    flexShrink: 0,
  },
  commentBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  commentMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "8px",
  },
  commentAuthorName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#5C4033",
  },
  commentTime: {
    fontSize: "11px",
    color: "#A89587",
  },
  commentContentText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#3E2723",
    opacity: 0.9,
  },
};
