"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Flower, Card } from "@/lib/types";

export function FloriographyExplorer({
  flowers,
  cards,
}: {
  flowers: Flower[];
  cards: Card[];
}) {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFlowerId, setActiveFlowerId] = useState<string>(
    flowers[0]?.id ?? ""
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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

  // 過濾花卉清單
  const filteredFlowers = useMemo(() => {
    return flowers.filter((f) => {
      const matchTag =
        selectedTag === "全部" ||
        f.meanings.includes(selectedTag) ||
        f.relatedTags?.includes(selectedTag);

      const matchQuery =
        !searchQuery.trim() ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.meanings.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.story && f.story.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchTag && matchQuery;
    });
  }, [flowers, selectedTag, searchQuery]);

  // 取得當前選中的花卉
  const activeFlower = useMemo(() => {
    return flowers.find((f) => f.id === activeFlowerId) ?? filteredFlowers[0] ?? flowers[0];
  }, [flowers, filteredFlowers, activeFlowerId]);

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

  // 過濾與當前花卉相關的推薦卡片作品
  const suitableCards = useMemo(() => {
    if (!activeFlower) return cards.slice(0, 4);
    
    // 找出直接包含該花名的卡片
    const directMatches = cards.filter((c) =>
      c.tags.flowers.some((fname) => fname.includes(activeFlower.name) || activeFlower.name.includes(fname))
    );

    if (directMatches.length > 0) return directMatches;

    // 若無直接對應，透過花語與情緒標籤做次級關聯
    const relatedMoods = activeFlower.meanings;
    const secondaryMatches = cards.filter((c) =>
      c.tags.moods.some((m) => relatedMoods.includes(m)) ||
      c.tags.occasions.some((o) => relatedMoods.includes(o))
    );

    if (secondaryMatches.length > 0) return secondaryMatches.slice(0, 4);

    // 回退展示前幾張精選卡片
    return cards.slice(0, 4);
  }, [cards, activeFlower]);

  return (
    <div className="flex flex-col gap-8">
      {/* 頂部搜尋與過濾列 (對齊 NFT 範例的頂部 Tab 列) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[color:var(--line)] pb-6">
        {/* 搜尋框 */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[color:var(--muted)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋花名、花語或故事寓意..."
            className="h-11 w-full rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/60 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] transition-all backdrop-blur"
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

        {/* 分類標籤列 (Pills) */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {popularTags.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`h-10 px-4 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? "bg-[color:var(--ink)] text-[color:var(--paper)] shadow-sm shadow-black/10"
                    : "bg-[color:var(--card)]/40 text-[color:var(--muted)] border border-[color:var(--line)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[color:var(--foreground)]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* 核心雙欄佈局 */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        
        {/* 左側欄：選中的花語展示中心 (對應 NFT Reference 圖左側 Top NFT 動態圈) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="relative rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 transition-all duration-300 overflow-hidden group">
            {/* 背景點綴光暈 */}
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[color:var(--accent)]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-[color:var(--accent-2)]/10 blur-3xl pointer-events-none" />

            {/* 標題列 */}
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-semibold tracking-[0.24em] text-[color:var(--muted)]">
                FLOWER MEANING
              </span>
              <span className="rounded-full bg-[color:var(--accent)]/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[color:var(--accent)] border border-[color:var(--accent)]/20">
                精選花語解析
              </span>
            </div>

            {/* 視覺焦點：動態環形設計 (向使用者的 Reference 圓形儀表板致敬) */}
            <div className="my-8 flex flex-col items-center justify-center relative py-6">
              {/* 外圈旋轉光環裝飾 */}
              <div className="absolute w-52 h-52 rounded-full border border-dashed border-[color:var(--accent)]/30 animate-[spin_30s_linear_infinite]" />
              <div className="absolute w-44 h-44 rounded-full border border-[color:var(--accent-2)]/20 animate-[spin_20s_linear_infinite_reverse]" />
              
              {/* 核心玻璃感立體圓盤 */}
              <div className="relative z-10 w-36 h-36 rounded-full bg-gradient-to-tr from-[color:var(--card)] to-[color:var(--background)] border border-[color:var(--line)] shadow-lg shadow-black/5 flex flex-col items-center justify-center backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                <p className="text-[10px] font-semibold text-[color:var(--muted)] tracking-widest uppercase">
                  寓意指標
                </p>
                <p className="mt-1 text-2xl font-[family-name:var(--font-display)] font-bold tracking-wider text-[color:var(--foreground)]">
                  {activeFlower?.name ?? "花藝"}
                </p>
                {activeFlower?.meanings?.[0] && (
                  <span className="mt-2 rounded-full bg-[color:var(--accent-2)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--paper)] tracking-widest">
                    #{activeFlower.meanings[0]}
                  </span>
                )}
              </div>

              {/* 浮動的裝飾小標記 (模仿 NFT 圖面左上/右下的浮動小指標) */}
              <div className="absolute top-2 left-6 rounded-xl border border-[color:var(--line)] bg-[color:var(--card)]/80 px-2.5 py-1 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur">
                <span className="text-[color:var(--muted)]">象徵 </span>
                <span className="font-bold text-[color:var(--accent)]">{activeFlower?.meanings?.length ?? 0} 種意境</span>
              </div>
              <div className="absolute bottom-2 right-6 rounded-xl border border-[color:var(--line)] bg-[color:var(--card)]/80 px-2.5 py-1 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur">
                <span className="text-[color:var(--muted)]">適性 </span>
                <span className="font-bold text-[color:var(--accent-2)]">極佳</span>
              </div>
            </div>

            {/* 花語與適合的花解說區 */}
            <div className="relative z-10 flex flex-col gap-4 border-t border-[color:var(--line)]/60 pt-6">
              <div>
                <span className="text-xs font-semibold text-[color:var(--muted)] tracking-wider block mb-2">
                  核心花語意涵
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeFlower?.meanings ?? ["祝福"]).map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-lg bg-[color:var(--foreground)]/[0.04] dark:bg-[color:var(--foreground)]/[0.08] px-3 py-1.5 text-xs font-medium tracking-wide text-[color:var(--foreground)]"
                    >
                      ✨ {m}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-[color:var(--muted)] tracking-wider block mb-1">
                  適合的花與典故故事
                </span>
                <p className="text-sm leading-relaxed text-[color:var(--muted)] line-clamp-6">
                  {activeFlower?.story ??
                    `${activeFlower?.name} 帶有典雅純淨的姿態，花語訴說著深邃動人的情感與真摯期盼。適合用來餽贈重要之人，傳遞無法言喻的感動。`}
                </p>
              </div>
            </div>
          </div>

          {/* 左下側：可快速點選切換花語的直視卷軸清單 */}
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)]/40 p-5">
            <span className="text-xs font-semibold tracking-wider text-[color:var(--muted)] block mb-3 px-2">
              選擇其他花語 ({filteredFlowers.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredFlowers.map((f) => {
                const isSelected = f.id === activeFlower?.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFlowerId(f.id)}
                    className={`flex items-center justify-between w-full p-3 rounded-2xl text-left transition-all ${
                      isSelected
                        ? "bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/30 text-[color:var(--accent)] font-semibold"
                        : "hover:bg-[color:var(--card)] border border-transparent text-[color:var(--foreground)]/80 hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium tracking-wide">{f.name}</p>
                      <p className="text-[11px] text-[color:var(--muted)] truncate max-w-[180px] mt-0.5">
                        {f.meanings.join("、")}
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
                  className={`group relative rounded-3xl p-5 transition-all duration-300 flex flex-col justify-between bg-[color:var(--card)] ${
                    isHighlyRecommended
                      ? "border-2 border-[color:var(--accent)] shadow-md shadow-[color:var(--accent)]/5"
                      : "border border-[color:var(--line)] hover:border-[color:var(--accent-2)]/50 shadow-sm"
                  }`}
                >
                  {/* 若是高光推薦，加入一個精緻的 Badge */}
                  {isHighlyRecommended && (
                    <div className="absolute -top-3 left-6 rounded-full bg-[color:var(--accent)] px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm">
                      最佳適性推薦
                    </div>
                  )}

                  {/* 上方創作者/擁有者標記列 */}
                  <div className="flex items-center justify-between gap-2 border-b border-[color:var(--line)]/60 pb-3 mb-4 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[color:var(--accent-2)]/20 border border-[color:var(--accent-2)]/40 flex items-center justify-center text-[10px] font-bold text-[color:var(--accent-2)]">
                        ❀
                      </div>
                      <div>
                        <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-wider">
                          花材調性
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

                  {/* 視覺卡片主體 (圖片預覽區) */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[color:var(--background)] to-[color:var(--card)] border border-[color:var(--line)] overflow-hidden mb-4 group-hover:shadow-inner transition-all flex items-center justify-center">
                    {/* 裝飾性幾何/花紋背景模擬精緻美感 */}
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--line)_1px,_transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-[color:var(--accent)]/5 blur-xl" />
                    
                    {/* 卡片標題與主視覺字樣 */}
                    <div className="relative z-10 text-center p-4">
                      <p className="text-lg font-[family-name:var(--font-display)] font-bold tracking-wider text-[color:var(--foreground)] group-hover:scale-105 transition-transform duration-300">
                        {c.title}
                      </p>
                      <p className="text-[11px] text-[color:var(--muted)] mt-1 tracking-wide">
                        {c.size ?? "純手工精緻壓花"}
                      </p>
                    </div>

                    {/* 懸浮預覽小標籤 */}
                    <span className="absolute bottom-2 left-2 rounded-lg bg-[color:var(--card)]/90 backdrop-blur px-2 py-0.5 text-[9px] font-semibold text-[color:var(--muted)] border border-[color:var(--line)]">
                      #{c.tags.moods[0] ?? "溫暖"}
                    </span>
                  </div>

                  {/* 動態內嵌展開的作品完整規格詳情 (不跳轉頁面) */}
                  {expandedCardId === c.id && (
                    <div className="mb-4 border-t border-[color:var(--line)]/60 pt-3 animate-fade-in text-left grid gap-2.5 bg-[color:var(--background)]/30 rounded-2xl p-3 border border-[color:var(--line)]/40">
                      <div>
                        <span className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-wider block">
                          作品設計理念 / 故事介紹
                        </span>
                        <p className="text-xs leading-relaxed text-[color:var(--foreground)] mt-0.5">
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
                      className={`h-10 rounded-xl border text-xs font-semibold tracking-wide transition-all flex items-center justify-center ${
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
                      className={`h-10 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center transition-all ${
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
          <div className="mt-4 rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)]/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
              className="h-10 px-5 rounded-full bg-[color:var(--accent-2)] text-xs font-bold tracking-wider text-white hover:bg-[color:var(--accent-2)]/90 flex items-center justify-center transition-all shrink-0 shadow-sm"
            >
              前往情境推薦 →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
