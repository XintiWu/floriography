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

export function FloriographyExplorer({
  flowers,
  cards,
}: {
  flowers: Flower[];
  cards: Card[];
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFlowerId, setActiveFlowerId] = useState<string>(
    flowers[0]?.id ?? ""
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [brokenFlowerImages, setBrokenFlowerImages] = useState<Set<string>>(
    () => new Set()
  );

  // 依花種名稱（及花語、故事）過濾
  const filteredFlowers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flowers;

    return flowers.filter((f) => {
      const labels = resolveFlowerMeanings(f.name);
      const storyText = resolveFlowerStory(f.name) ?? "";
      return (
        f.name.toLowerCase().includes(q) ||
        labels.some((m) => m.toLowerCase().includes(q)) ||
        storyText.toLowerCase().includes(q)
      );
    });
  }, [flowers, searchQuery]);

  // 搜尋後若目前選中的花種不在結果中，改選第一筆
  useEffect(() => {
    if (filteredFlowers.length === 0) return;
    if (!filteredFlowers.some((f) => f.id === activeFlowerId)) {
      setActiveFlowerId(filteredFlowers[0].id);
    }
  }, [filteredFlowers, activeFlowerId]);

  // 取得當前選中的花卉
  const activeFlower = useMemo(() => {
    return flowers.find((f) => f.id === activeFlowerId) ?? filteredFlowers[0] ?? flowers[0];
  }, [flowers, filteredFlowers, activeFlowerId]);

  /** 核心花語意涵：以 flower_meanings.json 為準，列出全部 */
  const activeFlowerMeanings = useMemo(() => {
    if (!activeFlower) return ["祝福"];
    return resolveFlowerMeanings(activeFlower.name);
  }, [activeFlower]);

  const activeFlowerStory = useMemo(() => {
    if (!activeFlower) return undefined;
    return resolveFlowerStory(activeFlower.name);
  }, [activeFlower]);

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
        </div>

        {/* 花種選擇列 */}
        <div className="w-full overflow-hidden min-h-[96px]">
          <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-hide w-full">
                {filteredFlowers.map((f) => {
                  const isActive = activeFlowerId === f.id;
                  const displayMeanings = getFlowerMeaningLabels(f.name, 3);

                  const imageSrc = getFlowerSpeciesImageUrl(f.name);
                  const imageBroken = brokenFlowerImages.has(f.id);

                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFlowerId(f.id)}
                      className={`flex flex-col items-center gap-1.5 flex-shrink-0 group transition-all duration-300 max-w-[88px] ${
                        isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div
                        className={`w-14 h-14 flex items-center justify-center transition-all duration-300 overflow-hidden shrink-0 ${
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
                      <span className={`text-[11px] font-semibold tracking-wide text-center leading-tight ${isActive ? "text-[color:var(--accent)]" : "text-[color:var(--foreground)] group-hover:text-[color:var(--foreground)]"}`}>
                        {f.name}
                      </span>
                      {displayMeanings.length > 0 && (
                        <span
                          className={`text-[9px] leading-snug text-center line-clamp-3 px-0.5 ${
                            isActive
                              ? "text-[color:var(--muted)]"
                              : "text-[color:var(--muted)]/80"
                          }`}
                          title={displayMeanings.join("、")}
                        >
                          {displayMeanings.join("、")}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filteredFlowers.length === 0 && (
                  <p className="text-xs text-[color:var(--muted)] py-4 px-2">
                    找不到符合的花種
                  </p>
                )}
          </div>
        </div>
      </div>

      {/* 核心雙欄佈局 */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        
        {/* 左側欄：選中的花語展示中心 (對應 NFT Reference 圖左側 Top NFT 動態圈) */}
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
              <span className="bg-[color:var(--accent)]/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[color:var(--accent)] border border-[color:var(--accent)]/20">
                精選花語解析
              </span>
            </div>

            {/* 視覺焦點：動態環形設計 (向使用者的 Reference 圓形儀表板致敬) */}
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

              {/* 浮動的裝飾小標記 (模仿 NFT 圖面左上/右下的浮動小指標) */}
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
                const listMeanings = resolveFlowerMeanings(f.name);
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

        {/* 右側欄：推薦卡片清單 (對應 NFT Reference 圖右側 Rare NFT 高光卡片網格) */}
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
              // 模擬首張卡片為「極致推薦 (高光 Highlight)」(呼應使用者截圖中帶有藍色光環的中心 NFT)
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
                  {/* 若是高光推薦，加入一個精緻的 Badge */}
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

                  {/* 底部按鈕列 (內嵌展開按鈕與預訂雙按鈕) */}
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
