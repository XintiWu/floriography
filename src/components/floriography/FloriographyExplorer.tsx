"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Flower, Card } from "@/lib/types";
import {
  getFlowerMeaningLabels,
  resolveFlowerMeanings,
} from "@/lib/flowerMeanings";
import { resolveFlowerStory } from "@/lib/flowerStory";
import { getFlowerSpeciesImageUrl } from "@/lib/flowerSpeciesImage";
import { authService } from "@/services/authService";

export function FloriographyExplorer({
  flowers: initialFlowers,
  cards,
}: {
  flowers: Flower[];
  cards: Card[];
}) {
  // Deduplicate flowers from initial list to prevent UI duplication if any
  const flowers = useMemo(() => {
    const seen = new Set<string>();
    return initialFlowers.filter(f => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    });
  }, [initialFlowers]);

  const [searchMode, setSearchMode] = useState<"flower" | "meaning" | "favorite">("flower");
  const [selectedTag, setSelectedTag] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFlowerId, setActiveFlowerId] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [brokenFlowerImages, setBrokenFlowerImages] = useState<Set<string>>(
    () => new Set()
  );

  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // 提取熱門分類標籤
  const popularTags = useMemo(() => {
    const set = new Set<string>();
    flowers.forEach((f) => {
      f.relatedTags?.forEach((t) => set.add(t));
      // 若沒有 relatedTags，拿前幾個花語
      if (!f.relatedTags?.length) {
        f.meanings.slice(0, 1).forEach((m) => set.add(m));
      }
    });
    // 挑選幾個最具代表性的美學標籤呈現
    const targetTags = ["全部", "希望", "愛情", "祝福", "鼓勵", "思念", "穩定", "喜悅", "純潔"];
    return targetTags.filter(t => t === "全部" || set.has(t) || flowers.some(f => f.meanings.includes(t)));
  }, [flowers]);

  // Load favorites
  useEffect(() => {
    authService.getUser().then(setUser);
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          const res = await fetch("/api/flowers/favorite");
          const data = await res.json();
          if (data.favorites) {
            setFavorites(data.favorites);
          }
        } catch (err) {
          console.error("Failed to load DB favorites:", err);
        }
      } else {
        const local = localStorage.getItem("fav_flowers");
        if (local) {
          try {
            setFavorites(JSON.parse(local));
          } catch {
            setFavorites([]);
          }
        } else {
          setFavorites([]);
        }
      }
    };
    loadFavorites();
  }, [user]);

  // 過濾花卉清單
  const filteredFlowers = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return flowers.filter((f) => {
      if (searchMode === "favorite") {
        return favorites.includes(f.id);
      }

      const matchTag =
        searchMode === "flower" ||
        selectedTag === "全部" ||
        f.meanings.includes(selectedTag) ||
        f.relatedTags?.includes(selectedTag);

      const labels = resolveFlowerMeanings(f.name, f.meanings);
      const storyText = resolveFlowerStory(f.name) ?? f.story ?? "";

      const matchQuery =
        !q ||
        f.name.toLowerCase().includes(q) ||
        labels.some((m) => m.toLowerCase().includes(q)) ||
        storyText.toLowerCase().includes(q);

      return matchTag && matchQuery;
    });
  }, [flowers, selectedTag, searchQuery, searchMode, favorites]);

  // 取得當前選中的花卉
  const activeFlower = useMemo(() => {
    return flowers.find((f) => f.id === activeFlowerId) ?? filteredFlowers[0] ?? flowers[0];
  }, [flowers, filteredFlowers, activeFlowerId]);

  // Initialize activeFlowerId to first flower if not set
  useEffect(() => {
    if (!activeFlowerId && flowers.length > 0) {
      setActiveFlowerId(flowers[0].id);
    }
  }, [flowers, activeFlowerId]);

  /** 核心花語意涵：以 flower_meanings.json 為準，列出全部 */
  const activeFlowerMeanings = useMemo(() => {
    if (!activeFlower) return ["祝福"];
    return resolveFlowerMeanings(activeFlower.name, activeFlower.meanings);
  }, [activeFlower]);

  const activeFlowerStory = useMemo(() => {
    if (!activeFlower) return undefined;
    return resolveFlowerStory(activeFlower.name) ?? activeFlower.story;
  }, [activeFlower]);

  // 當過濾名單改變，且當前選中花卉不在過濾名單中，自動設為過濾名單的第一個
  useEffect(() => {
    if (filteredFlowers.length > 0) {
      if (!filteredFlowers.some((f) => f.id === activeFlowerId)) {
        setActiveFlowerId(filteredFlowers[0].id);
      }
    }
  }, [filteredFlowers, activeFlowerId, searchMode]);

  const toggleFavorite = async () => {
    if (!activeFlower) return;
    const flowerId = activeFlower.id;
    const isFav = favorites.includes(flowerId);
    
    let updatedFavorites: string[];
    if (isFav) {
      updatedFavorites = favorites.filter(id => id !== flowerId);
    } else {
      updatedFavorites = [...favorites, flowerId];
    }
    
    setFavorites(updatedFavorites);
    
    if (user) {
      try {
        await fetch("/api/flowers/favorite", {
          method: isFav ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flowerId })
        });
      } catch (err) {
        console.error("Failed to toggle DB favorite:", err);
      }
    } else {
      localStorage.setItem("fav_flowers", JSON.stringify(updatedFavorites));
    }
  };

  const isFavorited = useMemo(() => {
    if (!activeFlower) return false;
    return favorites.includes(activeFlower.id);
  }, [activeFlower, favorites]);

  // 當分類切換時，自動將選中花卉設為該分類的第一個
  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
    const firstOfTag = flowers.filter((f) => 
      tag === "全部" || f.meanings.includes(tag) || f.relatedTags?.includes(tag)
    )[0];
    if (firstOfTag) {
      setActiveFlowerId(firstOfTag.id);
    }
  };

  // 找出含有相對應花材的卡片，並將其替代成那種花的圖片
  const getCardImage = (c: Card) => {
    if (activeFlower) {
      const activeMatch = c.tags.flowers.some(
        (fname) => fname.includes(activeFlower.name) || activeFlower.name.includes(fname)
      );
      if (activeMatch && activeFlower.imageUrl) {
        return activeFlower.imageUrl;
      }
    }

    for (const fname of c.tags.flowers) {
      const found = flowers.find(
        (f) => f.name.includes(fname) || fname.includes(f.name)
      );
      if (found && found.imageUrl) {
        return found.imageUrl;
      }
    }

    return c.images[0] || activeFlower?.imageUrl || "/demo/pressed-cards.png";
  };

  // 過濾與當前花卉相關的推薦卡片作品
  const suitableCards = useMemo(() => {
    if (!activeFlower) return cards.slice(0, 4);
    
    // 找出直接包含該花名的卡片
    const directMatches = cards.filter((c) =>
      c.tags.flowers.some((fname) => fname.includes(activeFlower.name) || activeFlower.name.includes(fname))
    );

    if (directMatches.length > 0) return directMatches;

    // 若無直接對應，透過花語與情緒標籤做次級關聯
    const relatedMoods = activeFlowerMeanings;
    const secondaryMatches = cards.filter((c) =>
      c.tags.moods.some((m) => relatedMoods.includes(m)) ||
      c.tags.occasions.some((o) => relatedMoods.includes(o))
    );

    if (secondaryMatches.length > 0) return secondaryMatches.slice(0, 4);

    // 回退展示前幾張精選卡片
    return cards.slice(0, 4);
  }, [cards, activeFlower, activeFlowerMeanings]);

  return (
    <div className="flex flex-col gap-8">
      {/* 頂部搜尋與過濾列 */}
      <div className="flex flex-col gap-6 border-b border-[color:var(--line)] pb-6">
        <div className="flex flex-col gap-4">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[color:var(--muted)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋花種名稱..."
              className="h-11 w-full border border-[color:var(--line)] bg-[color:var(--card)]/60 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] transition-all backdrop-blur"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                清除
              </button>
            )}
          </div>

          {/* 模式切換開關 (Segmented Control) */}
          <div className="flex p-1 bg-[color:var(--card)]/60 border border-[color:var(--line)] backdrop-blur self-start md:self-auto">
            <button
              onClick={() => setSearchMode("flower")}
              className={`flex-1 md:flex-none px-5 py-2 text-xs font-semibold tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                searchMode === "flower"
                  ? "bg-[color:var(--ink)] text-[color:var(--paper)] shadow-sm"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              🌸 依花種尋找
            </button>
            <button
              onClick={() => setSearchMode("meaning")}
              className={`flex-1 md:flex-none px-5 py-2 text-xs font-semibold tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                searchMode === "meaning"
                  ? "bg-[color:var(--ink)] text-[color:var(--paper)] shadow-sm"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              ✨ 依意境尋找
            </button>
            <button
              onClick={() => setSearchMode("favorite")}
              className={`flex-1 md:flex-none px-5 py-2 text-xs font-semibold tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                searchMode === "favorite"
                  ? "bg-[color:var(--ink)] text-[color:var(--paper)] shadow-sm"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              ❤️ 我的收藏
            </button>
          </div>
        </div>

        {/* 依據模式顯示對應的選項列 */}
        <div className="w-full overflow-hidden min-h-[80px]">
          <AnimatePresence mode="wait">
            {searchMode === "flower" || searchMode === "favorite" ? (
              <motion.div
                key="flower-strip"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-hide w-full"
              >
                {filteredFlowers.length > 0 ? (
                  filteredFlowers.map((f) => {
                    const isActive = activeFlowerId === f.id;
                    const imageSrc = getFlowerSpeciesImageUrl(f.name);
                    const imageBroken = brokenFlowerImages.has(f.id);

                    return (
                      <button
                        key={f.id}
                        onClick={() => setActiveFlowerId(f.id)}
                        className={`flex flex-col items-center gap-2 flex-shrink-0 group transition-all duration-300 ${
                          isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden ${
                            isActive
                              ? "bg-[color:var(--accent)]/10 border-2 border-[color:var(--accent)] shadow-[0_0_15px_rgba(var(--accent),0.2)] scale-110"
                              : "bg-[color:var(--card)] border border-[color:var(--line)] group-hover:border-[color:var(--accent)]/50 group-hover:bg-[color:var(--accent)]/5"
                          }`}
                        >
                          {imageSrc && !imageBroken ? (
                            <img
                              src={imageSrc}
                              alt={f.name}
                              className="w-full h-full object-cover scale-[1.3] group-hover:scale-[1.4] transition-transform duration-500"
                              onError={() =>
                                setBrokenFlowerImages((prev) => {
                                  const next = new Set(prev);
                                  next.add(f.id);
                                  return next;
                                })
                              }
                            />
                          ) : (
                            <span
                              className="text-2xl text-[color:var(--accent)]/70"
                              aria-hidden
                            >
                              ❀
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-semibold tracking-widest ${isActive ? "text-[color:var(--accent)]" : "text-[color:var(--muted)] group-hover:text-[color:var(--foreground)]"}`}>
                          {f.name}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center w-full py-4 text-xs text-[color:var(--muted)] font-medium">
                    {searchMode === "favorite" 
                      ? "尚未收藏任何花卉。在左側卡片點選 ❤️ 即可將其加入收藏！" 
                      : "無符合搜尋條件的花卉"}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="meaning-pills"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center gap-2 pb-2"
              >
                {popularTags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagChange(tag)}
                      className={`h-9 px-4 text-xs font-semibold tracking-wider transition-all duration-300 whitespace-nowrap ${
                        isActive
                          ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/30 shadow-sm"
                          : "bg-[color:var(--card)]/40 text-[color:var(--muted)] border border-[color:var(--line)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[color:var(--foreground)]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 核心雙欄佈局 */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        
        {/* 左側欄：選中的花語展示中心 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="relative border border-[color:var(--line)] bg-[color:var(--card)] p-7 transition-all duration-300 overflow-hidden group">
            {/* 背景點綴光暈 */}
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[color:var(--accent)]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-[color:var(--accent-2)]/10 blur-3xl pointer-events-none" />

            {/* 標題列 */}
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-semibold tracking-[0.24em] text-[color:var(--muted)]">
                FLOWER MEANING
              </span>
              <div className="flex items-center gap-2">
                {activeFlower && (
                  <button
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${
                      isFavorited
                        ? "bg-red-500/10 border-red-500/30 text-red-500 scale-105"
                        : "bg-[color:var(--card)] border-[color:var(--line)] text-[color:var(--muted)] hover:text-red-500 hover:border-red-500/20"
                    }`}
                    title={isFavorited ? "取消收藏" : "加入收藏"}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={isFavorited ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                )}
                <span className="bg-[color:var(--accent)]/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[color:var(--accent)] border border-[color:var(--accent)]/20">
                  精選花語解析
                </span>
              </div>
            </div>

            {/* 視覺焦點：動態環形設計 */}
            <div className="my-8 flex flex-col items-center justify-center relative py-6">
              {/* 外圈旋轉光環裝飾 */}
              <div className="absolute w-52 h-52 rounded-full border border-dashed border-[color:var(--accent)]/30 animate-[spin_30s_linear_infinite]" />
              <div className="absolute w-44 h-44 rounded-full border border-[color:var(--accent-2)]/20 animate-[spin_20s_linear_infinite_reverse]" />
              
              {/* 核心玻璃感立體圓盤 */}
              <div className="relative z-10 w-36 h-36 bg-gradient-to-tr from-[color:var(--card)] to-[color:var(--background)] border border-[color:var(--line)] shadow-lg shadow-black/5 flex flex-col items-center justify-center backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                <p className="text-[10px] font-semibold text-[color:var(--muted)] tracking-widest uppercase">
                  寓意指標
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFlower?.id}
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center"
                  >
                    <p className="mt-1 text-2xl font-[family-name:var(--font-display)] font-bold tracking-wider text-[color:var(--foreground)]">
                      {activeFlower?.name ?? "花藝"}
                    </p>
                    {activeFlowerMeanings[0] && (
                      <span className="mt-2 bg-[color:var(--accent-2)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--paper)] tracking-widest">
                        #{activeFlowerMeanings[0]}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 浮動的裝飾小標記 */}
              <div className="absolute top-2 left-6 border border-[color:var(--line)] bg-[color:var(--card)]/80 px-2.5 py-1 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur">
                <span className="text-[color:var(--muted)]">象徵 </span>
                <span className="font-bold text-[color:var(--accent)]">{activeFlowerMeanings.length} 種意境</span>
              </div>
              <div className="absolute bottom-2 right-6 border border-[color:var(--line)] bg-[color:var(--card)]/80 px-2.5 py-1 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur">
                <span className="text-[color:var(--muted)]">適性 </span>
                <span className="font-bold text-[color:var(--accent-2)]">極佳</span>
              </div>
            </div>

            {/* 花語與適合的花解說區 */}
            <div className="relative z-10 flex flex-col gap-4 border-t border-[color:var(--line)]/60 pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`desc-${activeFlower?.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <span className="text-xs font-semibold text-[color:var(--muted)] tracking-wider block mb-2">
                      核心花語意涵
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeFlowerMeanings.map((m, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center bg-[color:var(--foreground)]/[0.04] dark:bg-[color:var(--foreground)]/[0.08] px-3 py-1.5 text-xs font-medium tracking-wide text-[color:var(--foreground)]"
                        >
                          ✨ {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[color:var(--muted)] tracking-wider block mb-1">
                      花材介紹
                    </span>
                    <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                      {activeFlowerStory ??
                        `${activeFlower?.name} 帶有典雅純淨的姿態，花語訴說著深邃動人的情感與真摯期盼。適合用來餽贈重要之人，傳遞無法言喻的感動。`}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* 左下側：可快速點選切換花語的直視卷軸清單 */}
          <div className="border border-[color:var(--line)] bg-[color:var(--card)]/40 p-5">
            <span className="text-xs font-semibold tracking-wider text-[color:var(--muted)] block mb-3 px-2">
              選擇其他花語 ({filteredFlowers.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredFlowers.map((f) => {
                const isSelected = f.id === activeFlower?.id;
                const listMeanings = resolveFlowerMeanings(f.name, f.meanings);
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFlowerId(f.id)}
                    className={`flex items-center justify-between w-full p-3 text-left transition-all ${
                      isSelected
                        ? "bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/30 text-[color:var(--accent)] font-semibold"
                        : "hover:bg-[color:var(--card)] border border-transparent text-[color:var(--foreground)]/80 hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium tracking-wide">{f.name}</p>
                      <p className="text-[11px] text-[color:var(--muted)] line-clamp-2 max-w-[180px] mt-0.5">
                        {listMeanings.join("、")}
                      </p>
                    </div>
                    <span className="text-xs">
                      {isSelected ? "✦" : "→"}
                    </span>
                  </button>
                );
              })}
              {filteredFlowers.length === 0 && (
                <p className="text-xs text-center py-6 text-[color:var(--muted)]">
                  無符合搜尋條件的花卉
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 右側欄：推薦卡片清單 */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-base font-bold tracking-wide">
                適合搭配的作品卡片
              </h2>
              <p className="text-xs text-[color:var(--muted)] mt-0.5">
                包含「{activeFlower?.name}」花材或高度契合其寓意氛圍的創作
              </p>
            </div>
            <span className="text-xs font-semibold text-[color:var(--muted)]">
              共顯示 {suitableCards.length} 件
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {suitableCards.map((c, idx) => {
              const isHighlyRecommended = idx === 0;

              return (
                <div
                  key={c.id}
                  className={`group relative p-5 transition-all duration-300 flex flex-col justify-between bg-[color:var(--card)] ${
                    isHighlyRecommended
                      ? "border-2 border-[color:var(--accent)] shadow-md shadow-[color:var(--accent)]/5"
                      : "border border-[color:var(--line)] hover:border-[color:var(--accent-2)]/50 shadow-sm"
                  }`}
                >
                  {isHighlyRecommended && (
                    <div className="absolute -top-3 left-6 bg-[color:var(--accent)] px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm">
                      最佳適性推薦
                    </div>
                  )}

                  {/* 上方創作者/擁有者標記列 */}
                  <div className="flex items-center justify-between gap-2 border-b border-[color:var(--line)]/60 pb-3 mb-4 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[color:var(--accent-2)]/20 border border-[color:var(--accent-2)]/40 flex items-center justify-center text-[10px] font-bold text-[color:var(--accent-2)]">
                        ❀
                      </div>
                      <div>
                        <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-wider">
                          主要花材
                        </p>
                        <p className="text-[11px] font-semibold text-[color:var(--foreground)] truncate max-w-[80px]">
                          {c.tags.flowers[0] ?? activeFlower?.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-wider">
                        供應狀態
                      </p>
                      <p className="text-[11px] font-semibold text-[color:var(--accent)]">
                        {c.status === "available" ? "現貨供應中" : "接受客製預約"}
                      </p>
                    </div>
                  </div>

                  {/* 作品圖：完整顯示不裁切（與情境推薦一致） */}
                  <div className="mb-4">
                    {c.images[0] ? (
                      <div className="relative w-full overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--background)]">
                        <span className="absolute top-2 right-2 z-10 rounded-lg border border-[color:var(--line)] bg-[color:var(--card)]/90 px-2 py-0.5 text-[9px] font-semibold text-[color:var(--muted)] backdrop-blur">
                          #{c.tags.moods[0] ?? "溫暖"}
                        </span>
                        <Image
                          src={c.images[0]}
                          alt={c.title}
                          width={c.imageWidth ?? 900}
                          height={c.imageHeight ?? 1200}
                          className="h-auto w-full object-contain"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-[color:var(--line)] bg-gradient-to-br from-[color:var(--background)] to-[color:var(--card)] p-4">
                        <p className="text-center text-lg font-[family-name:var(--font-display)] font-bold tracking-wider text-[color:var(--foreground)]">
                          {c.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                          {c.size ?? "純手工精緻壓花"}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex items-start justify-between gap-2 border-b border-[color:var(--line)]/50 pb-3">
                      <div>
                        <p className="text-sm font-[family-name:var(--font-display)] font-bold tracking-wide line-clamp-2">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[color:var(--muted)]">
                          {c.size ?? "植物標本"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 動態內嵌展開的作品完整規格詳情 (不跳轉頁面) */}
                  {expandedCardId === c.id && (
                    <div className="mb-4 border-t border-[color:var(--line)]/60 pt-3 animate-fade-in text-left grid gap-2.5 bg-[color:var(--background)]/30 p-3 border border-[color:var(--line)]/40">
                      <div>
                        <span className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-wider block">
                          作品設計理念 / 故事介紹
                        </span>
                        <p className="text-xs leading-relaxed text-[color:var(--foreground)] mt-0.5 whitespace-pre-line">
                          {c.description ||
                            "設計師精心挑選高質感實體壓花，揉合純粹自然的美學視角，透過多層次手工藝將植物的永恆姿態溫柔封存。"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[color:var(--line)]/30">
                        <div>
                          <span className="text-[9px] text-[color:var(--muted)] uppercase block">適用場合</span>
                          <span className="text-[11px] font-medium text-[color:var(--foreground)] block truncate">
                            {c.tags.occasions.join("、") || "通用送禮"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[color:var(--muted)] uppercase block">傳遞心意</span>
                          <span className="text-[11px] font-medium text-[color:var(--foreground)] block truncate">
                            {c.tags.moods.join("、") || "溫暖期盼"}
                          </span>
                        </div>
                      </div>

                      {c.tags.colors?.length > 0 && (
                        <div className="pt-0.5">
                          <span className="text-[9px] text-[color:var(--muted)] uppercase block">視覺主色系</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.tags.colors.map((colorItem) => (
                              <span
                                key={colorItem}
                                className="rounded bg-[color:var(--foreground)]/5 px-1.5 py-0.5 text-[10px] text-[color:var(--muted)]"
                              >
                                {colorItem}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 價格列與計算式展示 */}
                  <div className="flex items-baseline justify-between border-t border-[color:var(--line)]/40 pt-3 mt-1">
                    <span className="text-xs font-medium text-[color:var(--muted)]">
                      預訂價格
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] font-bold text-[color:var(--foreground)]">
                        NT$
                      </span>
                      <span className="text-lg font-extrabold tracking-tight text-[color:var(--foreground)]">
                        {c.priceTwd}
                      </span>
                    </div>
                  </div>

                  {/* 底部按鈕列 */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCardId((s) => (s === c.id ? null : c.id));
                      }}
                      className={`h-10 border text-xs font-semibold tracking-wide transition-all flex items-center justify-center ${
                        expandedCardId === c.id
                          ? "border-[color:var(--accent-2)] bg-[color:var(--accent-2)]/10 text-[color:var(--accent-2)]"
                          : "border-[color:var(--line)] bg-transparent text-[color:var(--muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[color:var(--foreground)]"
                      }`}
                    >
                      {expandedCardId === c.id ? "收起詳情" : "作品詳情"}
                    </button>
                    
                    <Link
                      href={`/reserve?cardId=${encodeURIComponent(c.id)}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`h-10 text-xs font-semibold tracking-wide flex items-center justify-center transition-all ${
                        isHighlyRecommended
                          ? "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90 shadow-sm shadow-[color:var(--accent)]/20"
                          : "bg-[color:var(--ink)] text-[color:var(--paper)] hover:bg-black/85"
                      }`}
                    >
                      立即預訂
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部互動提示橫幅 */}
          <div className="mt-4 border border-[color:var(--line)] bg-[color:var(--card)]/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide">
                想根據更複雜的情境或預算自動推算？
              </p>
              <p className="text-xs text-[color:var(--muted)] mt-1">
                試試我們的 AI 智能顧問，輸入故事即可自動化計算契合度與推薦組合。
              </p>
            </div>
            <Link
              href="/recommend"
              className="h-10 px-5 bg-[color:var(--accent-2)] text-xs font-bold tracking-wider text-white hover:bg-[color:var(--accent-2)]/90 flex items-center justify-center transition-all shrink-0 shadow-sm"
            >
              前往情境推薦 →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
