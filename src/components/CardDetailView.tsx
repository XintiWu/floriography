"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, ArrowLeft, Flower2, Copy, Check, Share2 } from "lucide-react";
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

interface Petal {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  drift: number;
  color: string;
}

function generatePetals(count: number): Petal[] {
  const colors = [
    "rgba(210, 160, 100, 0.45)",
    "rgba(235, 195, 150, 0.35)",
    "rgba(180, 125, 75, 0.4)",
    "rgba(245, 220, 185, 0.4)",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 5 + Math.random() * 9,
    duration: 7 + Math.random() * 9,
    delay: Math.random() * 8,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 130,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
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

export function CardDetailView({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<CardData | null>(null);
  const [feedIndex, setFeedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [petals] = useState(() => generatePetals(18));
  const [linkCopied, setLinkCopied] = useState(false);

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
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at center, #1e160e 0%, #0d0a06 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Falling petals */}
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          style={{
            position: "fixed",
            top: "-30px",
            left: `${petal.x}%`,
            width: petal.size,
            height: petal.size * 0.6,
            borderRadius: "50% 0 50% 0",
            backgroundColor: petal.color,
            pointerEvents: "none",
            zIndex: 0,
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, petal.drift],
            rotate: [petal.rotation, petal.rotation + 540],
            opacity: [0.8, 0.5, 0],
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ position: "fixed", top: "24px", left: "24px", zIndex: 10 }}
      >
        <Link
          href="/gallery"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "rgba(235, 200, 160, 0.6)",
            fontSize: "13px",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
        >
          <ArrowLeft size={14} />
          花卡推特
        </Link>
      </motion.div>

      {/* Share link button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ position: "fixed", top: "24px", right: "24px", zIndex: 10 }}
      >
        <button
          onClick={handleCopyLink}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: linkCopied ? "rgba(210, 160, 100, 0.9)" : "rgba(235, 200, 160, 0.5)",
            fontSize: "13px",
            background: "none",
            border: "1px solid rgba(210, 160, 100, 0.2)",
            borderRadius: "999px",
            padding: "5px 14px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {linkCopied ? <Check size={13} /> : <Share2 size={13} />}
          {linkCopied ? "已複製！" : "分享此卡"}
        </button>
      </motion.div>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(210, 160, 100, 0.55)",
            fontSize: "11px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <Flower2 size={13} />
          Floriography · 花語花卡
        </motion.div>

        {/* Card image with float */}
        {loading ? (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: "360px",
              height: "480px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.05)",
            }}
          />
        ) : !card ? (
          <div
            style={{
              textAlign: "center",
              color: "rgba(235, 200, 160, 0.5)",
              padding: "60px 0",
            }}
          >
            <p style={{ fontSize: "16px" }}>找不到這張花卡</p>
            <Link
              href="/gallery"
              style={{
                display: "inline-block",
                marginTop: "16px",
                color: "rgba(210, 160, 100, 0.7)",
                fontSize: "14px",
                textDecoration: "underline",
              }}
            >
              瀏覽花卡推特
            </Link>
          </div>
        ) : (
          <>
            {/* Card image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  boxShadow: [
                    "0 24px 64px rgba(0,0,0,0.5)",
                    "0 36px 80px rgba(0,0,0,0.65)",
                    "0 24px 64px rgba(0,0,0,0.5)",
                  ],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  width: "360px",
                  position: "relative",
                }}
              >
                <img
                  src={card.image_data}
                  alt={card.card_title || "壓花賀卡"}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
                {/* Shimmer */}
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
                    pointerEvents: "none",
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
                  花語
                </p>
                {flowerPairs.map(({ name, meaning }) => (
                  <div key={name} style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "rgba(235, 205, 160, 0.95)",
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      {name}
                    </span>
                    {meaning && (
                      <>
                        <span style={{ fontSize: "11px", color: "rgba(210, 160, 100, 0.35)" }}>·</span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "rgba(220, 190, 150, 0.7)",
                            fontFamily: "'Georgia', 'Noto Serif TC', serif",
                            fontStyle: "italic",
                            lineHeight: 1.5,
                          }}
                        >
                          {meaning}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Personal note */}
            {card.personal_note && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ textAlign: "center", maxWidth: "360px" }}
              >
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.85,
                    color: "rgba(240, 220, 190, 0.85)",
                    fontFamily: "'Georgia', 'Noto Serif TC', serif",
                    fontStyle: "italic",
                    padding: "0 8px",
                    margin: 0,
                  }}
                >
                  「{card.personal_note}」
                </p>
              </motion.div>
            )}

            {/* Footer: author + views + time */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                maxWidth: "360px",
                color: "rgba(255,255,255,0.22)",
                fontSize: "12px",
              }}
            >
              <span>{card.author_name}</span>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Eye size={12} />
                  {card.view_count} 次瀏覽
                </span>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{ textAlign: "center" }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(210, 160, 100, 0.35)",
                  marginBottom: "14px",
                  letterSpacing: "0.05em",
                }}
              >
                ── ❀ ──
              </p>
              <Link
                href="/studio"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 22px",
                  borderRadius: "999px",
                  border: "1px solid rgba(210, 160, 100, 0.25)",
                  color: "rgba(235, 200, 160, 0.7)",
                  fontSize: "13px",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                製作你的花語花卡
                <Flower2 size={13} />
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
