"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Clock, Flower2, Share2, Copy, Check, Heart, MessageSquare, ArrowRight } from "lucide-react";
import { Container } from "@/components/Container";

interface Comment {
  id: string;
  author_name: string;
  text: string;
  created_at: string;
}

interface SharedCard {
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
  like_count?: number;
  comments?: Comment[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  const days = Math.floor(hrs / 24);
  return `${days} 天前`;
}

function FlowerMeaningBadges({ names, meanings }: { names: string[]; meanings: string[] }) {
  if (!names || names.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", margin: "10px 0" }}>
      {names.slice(0, 3).map((name, idx) => (
        <div key={name} style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 9px",
              borderRadius: "999px",
              background: "hsl(33 30% 92%)",
              color: "hsl(30 45% 30%)",
              fontWeight: 600,
              letterSpacing: "0.03em",
              flexShrink: 0,
            }}
          >
            {name}
          </span>
          {meanings[idx] && (
            <span
              style={{
                fontSize: "11px",
                color: "hsl(30 30% 50%)",
                fontFamily: "'Georgia', 'Noto Serif TC', serif",
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              {meanings[idx]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function CardTweet({ card, index }: { card: SharedCard; index: number }) {
  const [copied, setCopied] = useState(false);

  // Social interactive states
  const [likes, setLikes] = useState(card.like_count || 0);
  const [hasLiked, setHasLiked] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}/card/${card.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasLiked) return;
    setHasLiked(true);
    setLikes((prev) => prev + 1);
    try {
      const res = await fetch(`/api/cards/${card.id}/like`, { method: "POST" });
      const data = await res.json();
      if (typeof data.likeCount === "number") {
        setLikes(data.likeCount);
      }
    } catch (err) {
      console.error("Failed to like:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "var(--background)",
        border: "1px solid var(--line)",
        borderRadius: "16px",
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
      whileHover={{
        boxShadow: "0 8px 32px rgba(0,0,0,0.09)",
        borderColor: "hsl(33 30% 82%)",
      }}
    >
      {/* Card image – tappable */}
      <Link href={`/card/${card.id}`} style={{ textDecoration: "none", display: "block" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "3 / 4",
            background: "hsl(40 20% 94%)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {card.image_data ? (
            <img
              src={card.image_data}
              alt={card.card_title || "花語花卡"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Flower2 size={28} style={{ opacity: 0.18 }} />
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div style={{ padding: "14px 16px 12px" }}>
        {/* Card title */}
        {card.card_title && (
          <Link href={`/card/${card.id}`} style={{ textDecoration: "none" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--foreground)",
                margin: "0 0 6px",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.03em",
                lineHeight: 1.4,
              }}
            >
              {card.card_title}
            </h3>
          </Link>
        )}

        {/* Flower name + meaning pairs */}
        <FlowerMeaningBadges names={card.flower_names} meanings={card.flower_meanings} />

        {/* Personal note */}
        {card.personal_note && (
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.65,
              color: "var(--foreground)",
              opacity: 0.75,
              fontFamily: "'Georgia', 'Noto Serif TC', serif",
              margin: "8px 0 10px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.personal_note}
          </p>
        )}

        {/* Social Metrics Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "12px 0 8px",
            paddingTop: "10px",
            borderTop: "1px dashed var(--line)",
          }}
        >
          {/* Like button */}
          <button
            onClick={handleLike}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: hasLiked ? "hsl(30 50% 40%)" : "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: hasLiked ? "rgba(179, 130, 64, 0.06)" : "transparent",
              fontWeight: hasLiked ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            <Heart size={13} fill={hasLiked ? "hsl(30 50% 40%)" : "none"} strokeWidth={hasLiked ? 1.5 : 2} />
            <span>{likes}</span>
          </button>

          {/* Comment button - links to card detail page */}
          <Link
            href={`/card/${card.id}#comments`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "var(--muted)",
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(92, 64, 51, 0.05)";
              e.currentTarget.style.color = "hsl(30 45% 30%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            <MessageSquare size={13} />
            <span>{card.comments?.length || 0}</span>
          </Link>
        </div>

        {/* Top Comment (if exists, links to details comments) */}
        {card.comments && card.comments.length > 0 && (
          <Link href={`/card/${card.id}#comments`} style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                backgroundColor: "rgba(179, 130, 64, 0.04)",
                borderLeft: "2px solid rgba(179, 130, 64, 0.25)",
                padding: "8px 12px",
                borderRadius: "0 8px 8px 0",
                fontSize: "12px",
                margin: "8px 0",
                lineHeight: 1.4,
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(179, 130, 64, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(179, 130, 64, 0.04)";
              }}
            >
              <span style={{ fontWeight: 700, color: "hsl(30 45% 30%)", marginRight: "4px" }}>
                {card.comments[card.comments.length - 1].author_name}：
              </span>
              <span style={{ color: "var(--foreground)", opacity: 0.85 }}>
                {card.comments[card.comments.length - 1].text}
              </span>
            </div>
          </Link>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--line)",
            paddingTop: "10px",
            marginTop: "10px",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
            {card.author_name}
          </span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* View count */}
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: "var(--muted)" }}>
              <Eye size={12} />
              {card.view_count}
            </span>
            {/* Time */}
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: "var(--muted)" }}>
              <Clock size={12} />
              {timeAgo(card.created_at)}
            </span>
            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              title="複製分享連結"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "12px",
                color: copied ? "hsl(30 50% 40%)" : "var(--muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "6px",
                transition: "color 0.2s",
              }}
            >
              {copied ? <Check size={12} /> : <Share2 size={12} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryWall() {
  const [cards, setCards] = useState<SharedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 12;

  useEffect(() => {
    fetch(`/api/cards?limit=${LIMIT}&offset=0`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setHasMore((data.cards || []).length === LIMIT);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;

    fetch(`/api/cards?limit=${LIMIT}&offset=${nextOffset}`)
      .then((r) => r.json())
      .then((data) => {
        const newCards = data.cards || [];
        setCards((prev) => [...prev, ...newCards]);
        setOffset(nextOffset);
        setHasMore(newCards.length === LIMIT);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: "80px" }}>
      {/* Hero header */}
      <div
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "56px 0 36px",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "10px",
            }}
          >
            Flower Card Feed
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 5vw, 44px)",
              letterSpacing: "0.07em",
              color: "var(--foreground)",
              marginBottom: "10px",
            }}
          >
            花卡推特
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.7 }}>
            每一張花卡，都是一句無聲的祝福
            <br />
            在這裡分享你的創作，讓花語流傳
          </p>
          <Link
            href="/studio"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "20px",
              padding: "9px 20px",
              borderRadius: "999px",
              background: "var(--foreground)",
              color: "var(--background)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.03em",
            }}
          >
            創作花卡
            <ArrowRight size={13} />
          </Link>
        </motion.div>
      </div>

      {/* Feed */}
      <div style={{ paddingTop: "40px" }}>
        <Container>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "360px",
                    borderRadius: "16px",
                    background: "rgba(139, 90, 43, 0.03)",
                    border: "1px solid rgba(139, 90, 43, 0.08)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Vertical scanning light beam */}
                  <motion.div
                    animate={{
                      y: ["-100%", "250%"],
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15,
                    }}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      height: "40%",
                      background: "linear-gradient(to bottom, transparent, rgba(188, 158, 125, 0.18), transparent)",
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  />
                  
                  {/* Card Image Skeleton Placeholder */}
                  <div style={{ height: "65%", background: "rgba(139, 90, 43, 0.02)", borderBottom: "1px solid rgba(139, 90, 43, 0.05)" }} />
                  
                  {/* Card Content Skeleton Placeholders */}
                  <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ height: "14px", width: "65%", background: "rgba(139, 90, 43, 0.08)", borderRadius: "4px" }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ height: "18px", width: "50px", background: "rgba(139, 90, 43, 0.06)", borderRadius: "99px" }} />
                      <div style={{ height: "18px", width: "80px", background: "rgba(139, 90, 43, 0.04)", borderRadius: "99px" }} />
                    </div>
                    <div style={{ height: "10px", width: "90%", background: "rgba(139, 90, 43, 0.04)", borderRadius: "3px", marginTop: "4px" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
              <Flower2 size={48} style={{ margin: "0 auto 16px", opacity: 0.25 }} />
              <p style={{ fontSize: "16px", marginBottom: "6px" }}>還沒有人分享花卡</p>
              <p style={{ fontSize: "13px" }}>快去工作坊創作你的第一張花卡！</p>
              <Link
                href="/studio"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "24px",
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                前往工作坊
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <AnimatePresence>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "20px",
                    alignItems: "start",
                  }}
                >
                  {cards.map((card, i) => (
                    <CardTweet key={card.id} card={card} index={i} />
                  ))}
                </div>
              </AnimatePresence>

              {/* Load More Button */}
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: "48px" }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      padding: "12px 36px",
                      borderRadius: "999px",
                      border: "1px solid var(--line)",
                      background: "transparent",
                      color: "var(--foreground)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      outline: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(92, 64, 51, 0.04)";
                      e.currentTarget.style.borderColor = "hsl(33 30% 75%)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "var(--line)";
                    }}
                  >
                    {loadingMore ? "正在載入..." : "載入更多"}
                  </button>
                </div>
              )}
            </>
          )}
        </Container>
      </div>
    </div>
  );
}
