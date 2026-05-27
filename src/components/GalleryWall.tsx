"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Share2, Check, Heart, MessageCircle, Flower2, Eye, Clock } from "lucide-react";
import { Container } from "@/components/Container";
import { getDisplayCardTitle } from "@/lib/galleryDisplay";

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

function getCardHeaderStyle(flowerNames: string[]) {
  const primaryFlower = flowerNames && flowerNames[0];
  let bgColor = "bg-[#8b857a]"; // neutral warm taupe
  let label = "BOTANICAL ART";

  if (primaryFlower) {
    label = primaryFlower;
    if (primaryFlower.includes("玫瑰")) {
      bgColor = "bg-[#a3706c]"; // dusty rose
    } else if (primaryFlower.includes("繡球花")) {
      bgColor = "bg-[#70806a]"; // sage green
    } else if (primaryFlower.includes("星辰花")) {
      bgColor = "bg-[#867587]"; // muted purple
    } else if (primaryFlower.includes("野草")) {
      bgColor = "bg-[#6b7960]"; // olive green
    } else if (primaryFlower.includes("混合")) {
      bgColor = "bg-[#7d8c99]"; // slate blue
    }
  }
  return { bgColor, label };
}

function getMockComment(index: number) {
  const comments = [
    { author: "蝙蝠俠", content: "１００分的創作" },
    { author: "小草莓", content: "顏色好溫暖，阿公一定超開心的 🌸" },
    { author: "花友小智", content: "九里香配夏堇真的好特別，學到一招！" },
    { author: "Alice", content: "簡約又精緻，太喜歡了！" },
    { author: "山林漫步", content: "好溫馨的氛圍，字體選得非常優雅 🌿" },
  ];
  return comments[index % comments.length];
}

function CardTweet({ card, index }: { card: SharedCard; index: number }) {
  const displayTitle = getDisplayCardTitle(card, index);
  const [copied, setCopied] = useState(false);
  const { bgColor, label } = getCardHeaderStyle(card.flower_names);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => {
    return card.view_count ? Math.floor(card.view_count / 3) : 0;
  });

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (liked) {
      setLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  // Social interactive states
  const [likes, setLikes] = useState(card.like_count || 0);
  const [hasLiked, setHasLiked] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/card/${card.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasComment = index % 3 === 0 || index % 2 === 0;
  const commentCount = hasComment ? (index % 3 === 0 ? 2 : 1) : 0;
  const mockComment = getMockComment(index);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.6 }}
      className="group flex flex-col h-full bg-[color:var(--background)] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
    >
      {/* Card Image Container */}
      <Link 
        href={`/card/${card.id}`} 
        className="block bg-[#e8e4db] dark:bg-[#1a1a18] relative overflow-hidden shrink-0 w-full aspect-[3/4] flex flex-col"
      >
        {/* Actual Card Image */}
        <div className="w-full grow relative overflow-hidden">
          {card.image_data ? (
            <img
              src={card.image_data}
              alt={displayTitle}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-20">
              <Flower2 size={28} />
            </div>
          )}
        </div>

        {/* Bottom Muted Color Label (Inspired by Reference) */}
        <div className={`${bgColor} w-full py-2.5 px-4 text-[10px] font-bold tracking-[0.2em] text-white uppercase shrink-0`}>
          {label}
        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-col p-6 lg:p-8 w-full grow">
        {/* 1. 卡片名稱 */}
        <Link href={`/card/${card.id}`} className="hover:underline underline-offset-4">
          <h3 className="font-sans tracking-wide text-[color:var(--foreground)] text-2xl font-bold mb-4">
            {displayTitle}
          </h3>
        </Link>

        {/* 2. 花 花語 (Beige pills and italic descriptions) */}
        {card.flower_names && card.flower_names.length > 0 && (
          <div className="flex flex-col gap-2.5 mb-4">
            {card.flower_names.slice(0, 3).map((name, idx) => (
              <div key={name} className="flex items-center flex-wrap gap-2 text-xs">
                <span 
                  className="shrink-0 bg-[#f2ede4] dark:bg-[#2e2b26] text-[#70563b] dark:text-[#cbb5a0] px-3 py-0.5 font-semibold text-[11px]"
                  style={{ borderRadius: "9999px" }}
                >
                  {name}
                </span>
                {card.flower_meanings && card.flower_meanings[idx] && (
                  <span className="font-[family-name:var(--font-display)] italic text-[#8a7259] dark:text-[#b49f8b] text-sm">
                    {card.flower_meanings[idx]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3. 貼文內文 */}
        {card.personal_note && (
          <p className="font-sans text-[color:var(--foreground)] opacity-90 leading-relaxed text-sm mb-4">
            {card.personal_note.replace(/^#\s*/, "")}
          </p>
        )}

        {/* 4. 分隔線 (Dashed) */}
        <div className="border-t border-dashed border-[color:var(--line)] my-4" />

        {/* 5. 按讚 留言 */}
        <div className="flex items-center gap-6 text-[#70563b] dark:text-[#cbb5a0] text-sm mb-5">
          <button 
            onClick={handleLike}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit outline-none"
          >
            <Heart 
              size={16} 
              strokeWidth={1.5} 
              className={liked ? "fill-[#a3706c] text-[#a3706c]" : ""} 
            />
            <span>{likesCount}</span>
          </button>
          <span className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
            <MessageCircle size={16} strokeWidth={1.5} />
            <span>{commentCount}</span>
          </span>
        </div>

        {/* 5.5 留言區塊 (Mock Comment Box) */}
        {hasComment && (
          <div
            className="bg-[#fcfaf2] dark:bg-[#1f1e1b] px-4 py-3 text-xs text-[color:var(--foreground)] opacity-95 mb-6 border-l-[3.5px] border-[#a3706c]"
            style={{
              borderRadius: "6px",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.01)",
            }}
          >
            <p className="font-[family-name:var(--font-display)] leading-relaxed m-0 text-sm">
              <span className="font-bold text-[#70563b] dark:text-[#cbb5a0] mr-1">
                {mockComment.author}
              </span>
              ：{mockComment.content}
            </p>
          </div>
        )}

        {/* 6. Footer (Author name, views, time, share) */}
        <div className="mt-auto pt-4 border-t border-[color:var(--line)]">
          <div className="flex items-center justify-between text-[color:var(--muted)] text-xs">
            <span className="font-semibold text-sm text-[color:var(--foreground)]">{card.author_name}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {card.view_count}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {timeAgo(card.created_at)}
              </span>
              <button
                onClick={handleCopyLink}
                title="複製分享連結"
                className="hover:text-[color:var(--foreground)] transition-colors"
              >
                {copied ? <Check size={12} className="text-green-600" /> : <Share2 size={12} />}
              </button>
            </div>
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
    <div className="min-h-screen bg-[color:var(--background)] pb-20">
      {/* Newspaper Masthead Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.65 }}
        className="pt-12 md:pt-20 pb-8 md:pb-10 border-b border-[color:var(--line)]"
      >
        <Container>
          <div className="flex flex-col items-center text-center">
            {/* Top tiny line */}
            <div className="w-full flex items-center justify-between text-[10px] tracking-[0.25em] font-semibold text-[color:var(--muted)] uppercase border-b border-[color:var(--line)] pb-3 mb-8">
              <span>EST. 2026</span>
              <span>FLOWER CARD FEED</span>
              <span>VOL. I NO. I</span>
            </div>

            {/* Giant Title */}
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[0.1em] text-[color:var(--foreground)] uppercase mb-6 leading-none">
              SEASONAL BOTANICALS
            </h1>
            
            {/* Subtitle */}
            <p className="font-display text-lg md:text-xl tracking-[0.05em] text-[color:var(--foreground)] opacity-85 italic mb-8">
              — 花卡推特 —
            </p>

            {/* Middle horizontal double lines or border wrapper for meta info */}
            <div className="w-full border-y-2 border-double border-[color:var(--line)] py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold tracking-wider text-[color:var(--muted)] uppercase">
              <div className="flex items-center gap-1.5">
                <span>TAIPEI, TAIWAN</span>
              </div>
              <div className="hidden sm:block text-[11px] italic font-display lowercase tracking-normal">
                "every pressed flower holds a silent blessing"
              </div>
              <div className="flex items-center gap-2">
                <span>本週新增</span>
                <span className="bg-[color:var(--foreground)] text-[color:var(--background)] px-2.5 py-0.5 rounded-sm font-bold text-[10px]">
                  {loading ? '-' : cards.length} 件作品
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="mt-6 max-w-4xl text-sm leading-relaxed text-[color:var(--muted)]">
              每一張花卡，都是一句無聲的祝福。在這裡探索大家分享的壓花創作，寫下你的心意與心情，讓花語在字裡行間溫柔流傳。
            </p>
          </div>
        </Container>
      </motion.div>


      {/* Grid Feed */}
      <Container className="mt-8">
        {loading ? (
          <div 
            className="grid gap-x-6 gap-y-12"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-[color:var(--background)] p-8 h-[400px]"
              >
                 <div className="w-full h-full bg-black/5 dark:bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-[color:var(--background)] py-32 text-center text-[color:var(--muted)] border border-[color:var(--line)]">
            <Flower2 size={48} className="mx-auto mb-4 opacity-25" />
            <p className="text-base mb-2">還沒有人分享花卡</p>
            <p className="text-sm">快去工作坊創作你的第一張花卡！</p>
            <Link
              href="/studio"
              className="mt-8 inline-flex items-center gap-2 bg-[color:var(--foreground)] text-[color:var(--background)] px-6 py-3 text-sm font-semibold tracking-wide"
            >
              前往工作坊
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div 
            className="grid gap-x-6 gap-y-12"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
          >
            {cards.map((card, i) => (
              <CardTweet key={card.id} card={card} index={i} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
