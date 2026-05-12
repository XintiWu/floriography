"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

// 預設模擬素材庫 (未來的去背素材可無縫取代此結構)
const MOCK_BASES = [
  { id: "base-1", name: "晨霧經典白卡", price: 450, color: "#f8f9fa", desc: "細膩原生紙質，完美襯托植物鮮豔度" },
  { id: "base-2", name: "極夜曜黑卡", price: 480, color: "#1a1d20", desc: "高反差深色底板，適合淺色或燙金花材" },
  { id: "base-3", name: "溫潤燕麥卡", price: 460, color: "#f1ece4", desc: "柔和大地色系，復古溫暖手作質感" },
  { id: "base-4", name: "香檳微光金卡", price: 520, color: "#e8dfd1", desc: "低調珠光質地，尊榮輕奢送禮首選" },
];

const MOCK_FLOWERS = [
  { id: "fl-1", name: "紅粉佳人玫瑰", price: 120, image: "/images/flowers/IMG_8705_processed.png" },
  { id: "fl-2", name: "多瓣柔粉桔梗", price: 110, image: "/images/flowers/IMG_8706_processed.png" },
  { id: "fl-3", name: "初春紫嫣薰衣草", price: 95, image: "/images/flowers/IMG_8708_processed.png" },
  { id: "fl-4", name: "陽光暖黃向日葵", price: 100, image: "/images/flowers/IMG_8709_processed.png" },
  { id: "fl-5", name: "純淨初雪白鬱金香", price: 130, image: "/images/flowers/IMG_8710_processed.png" },
];

const MOCK_ACCENTS = [
  { id: "ac-1", name: "尤加利青綠葉脈", price: 50, image: "/images/flowers/IMG_8711_processed.png" },
  { id: "ac-2", name: "立體乾燥滿天星", price: 40, image: "/images/flowers/IMG_8712_processed.png" },
  { id: "ac-3", name: "奢華點綴金箔", price: 80, symbol: "🌟" },
];

export interface StudioLayer {
  id: string;
  type: "flower" | "accent" | "text";
  name: string;
  price: number;
  symbol?: string;
  image?: string;
  text?: string;
  x: number; // 0 - 100 percentage
  y: number; // 0 - 100 percentage
  scale: number;
  zIndex: number;
}

export function WorkshopStudio() {
  const router = useRouter();

  // 活躍分頁切換 (素材類別)
  const [activeTab, setActiveTab] = useState<"bases" | "flowers" | "accents" | "text">("flowers");

  // 當前選用的底紙
  const [selectedBase, setSelectedBase] = useState(MOCK_BASES[0]);

  // 疊加的圖層陣列
  const [layers, setLayers] = useState<StudioLayer[]>([
    // 預設給予一個主花範例引導使用者
    {
      id: "layer-init",
      type: "flower",
      name: "紅粉佳人玫瑰",
      price: 120,
      image: "/images/flowers/IMG_8705_processed.png",
      x: 50,
      y: 50,
      scale: 1.0,
      zIndex: 1,
    },
  ]);

  // 當前選取的活躍圖層 ID (便於進行位置調整或刪除)
  const [activeLayerId, setActiveLayerId] = useState<string | null>("layer-init");

  // 自訂文字刻字暫存狀態
  const [customTextContent, setCustomTextContent] = useState("");

  // 拖曳互動支援 (PowerPoint / Canva 風格)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [showCenterX, setShowCenterX] = useState(false);
  const [showCenterY, setShowCenterY] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, layer: StudioLayer) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    setActiveLayerId(layer.id);
    setDraggingLayerId(layer.id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: layer.x,
      initY: layer.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
    if (draggingLayerId !== layerId || !dragRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const deltaPercentX = (deltaX / rect.width) * 100;
    const deltaPercentY = (deltaY / rect.height) * 100;

    let targetX = dragRef.current.initX + deltaPercentX;
    let targetY = dragRef.current.initY + deltaPercentY;

    // 智能對齊輔助線 (Smart Guides Snap to Center)
    const snapThreshold = 2.5;
    let isSnappedX = false;
    let isSnappedY = false;

    if (Math.abs(targetX - 50) < snapThreshold) {
      targetX = 50;
      isSnappedX = true;
    }
    if (Math.abs(targetY - 50) < snapThreshold) {
      targetY = 50;
      isSnappedY = true;
    }

    setShowCenterX(isSnappedX);
    setShowCenterY(isSnappedY);

    targetX = Math.max(0, Math.min(100, +targetX.toFixed(1)));
    targetY = Math.max(0, Math.min(100, +targetY.toFixed(1)));

    setLayers((s) =>
      s.map((l) => (l.id === layerId ? { ...l, x: targetX, y: targetY } : l))
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setDraggingLayerId(null);
    dragRef.current = null;
    setShowCenterX(false);
    setShowCenterY(false);
  };

  // 新增素材至畫布
  const addLayer = (item: { name: string; price: number; symbol?: string; image?: string; type: "flower" | "accent" | "text"; text?: string }) => {
    const nextZ = layers.length > 0 ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 1;
    // 隨機錯開預設座標，營造手作擺置的動態感
    const randomX = 30 + Math.floor(Math.random() * 40);
    const randomY = 30 + Math.floor(Math.random() * 40);

    const newLayer: StudioLayer = {
      id: `layer-${Date.now()}`,
      type: item.type,
      name: item.name,
      price: item.price,
      symbol: item.symbol,
      image: item.image,
      text: item.text,
      x: randomX,
      y: randomY,
      scale: 1.0,
      zIndex: nextZ,
    };

    setLayers((s) => [...s, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  // 新增刻字圖層
  const handleAddText = () => {
    if (!customTextContent.trim()) return;
    addLayer({
      name: `客製燙金字: "${customTextContent}"`,
      price: 60,
      type: "text",
      text: customTextContent,
    });
    setCustomTextContent("");
  };

  // 刪除指定圖層
  const deleteLayer = (id: string) => {
    setLayers((s) => s.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  // 微調控制器方法：調整座標或縮放
  const updateActiveLayer = (updates: Partial<StudioLayer>) => {
    if (!activeLayerId) return;
    setLayers((s) =>
      s.map((l) => {
        if (l.id === activeLayerId) {
          return { ...l, ...updates };
        }
        return l;
      })
    );
  };

  // 微調按鈕封裝
  const nudgePos = (dir: "up" | "down" | "left" | "right") => {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    const step = 4;
    if (dir === "up") updateActiveLayer({ y: Math.max(5, layer.y - step) });
    if (dir === "down") updateActiveLayer({ y: Math.min(95, layer.y + step) });
    if (dir === "left") updateActiveLayer({ x: Math.max(5, layer.x - step) });
    if (dir === "right") updateActiveLayer({ x: Math.min(95, layer.x + step) });
  };

  const adjustScale = (delta: number) => {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    updateActiveLayer({ scale: Math.max(0.6, Math.min(2.5, +(layer.scale + delta).toFixed(1))) });
  };

  // 即時總定價試算
  const totalPrice = useMemo(() => {
    const overlaysSum = layers.reduce((sum, l) => sum + l.price, 0);
    return selectedBase.price + overlaysSum;
  }, [selectedBase, layers]);

  // 儲存設計並帶入委託結帳流程
  const handleSaveAndCheckout = () => {
    const blueprint = {
      baseId: selectedBase.id,
      baseName: selectedBase.name,
      basePrice: selectedBase.price,
      layers: layers.map((l) => ({
        name: l.name,
        price: l.price,
        symbol: l.symbol,
        image: l.image,
        text: l.text,
      })),
      totalPrice,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("floriography_workshop_blueprint", JSON.stringify(blueprint));
      // 導向預訂路由，並附帶特定 ID 以觸發載入提示
      router.push("/reserve?cardId=workshop-custom");
    } catch (e) {
      console.error("Failed to store custom blueprint", e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 工作坊頂部狀態列 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[color:var(--card)] border border-[color:var(--line)] rounded-2xl p-4 px-6 shadow-sm">
        <div>
          <span className="text-[10px] font-bold text-[color:var(--accent)] uppercase tracking-wider block">
            LIVE PREVIEW STUDIO
          </span>
          <p className="text-sm font-semibold text-[color:var(--foreground)] mt-0.5">
            未命名創作 — 專屬混搭設計
          </p>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-[color:var(--muted)] block">實時累計試算</span>
            <span className="text-base font-extrabold text-[color:var(--accent)]">
              NT$ {totalPrice}
            </span>
          </div>

          <Button size="sm" onClick={handleSaveAndCheckout} className="shrink-0 shadow-sm">
            儲存並送出委託
          </Button>
        </div>
      </div>

      {/* 核心工作區域矩陣 (三欄互動佈局) */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        
        {/* 左側欄：素材調色盤面板 (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wider text-[color:var(--muted)] uppercase mb-3">
              素材類別選單
            </p>

            {/* 類別切換 Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl mb-4 text-center">
              {[
                { id: "bases", label: "底紙" },
                { id: "flowers", label: "主花" },
                { id: "accents", label: "配材" },
                { id: "text", label: "刻字" },
              ].map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                      isActive
                        ? "bg-[color:var(--ink)] text-[color:var(--paper)] shadow-sm"
                        : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* 素材清單呈現區 */}
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {/* 底色紙卡選單 */}
              {activeTab === "bases" &&
                MOCK_BASES.map((b) => {
                  const isCurrent = selectedBase.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBase(b)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isCurrent
                          ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5 shadow-xs"
                          : "border-[color:var(--line)] hover:border-[color:var(--muted)]/50 bg-[color:var(--background)]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full border border-black/10 shadow-inner shrink-0"
                          style={{ backgroundColor: b.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-[color:var(--foreground)]">{b.name}</p>
                          <p className="text-[10px] text-[color:var(--muted)] mt-0.5 line-clamp-1">{b.desc}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-[10px] font-bold text-[color:var(--muted)] block">基本價</span>
                        <span className="text-xs font-extrabold text-[color:var(--foreground)]">NT${b.price}</span>
                      </div>
                    </div>
                  );
                })}

              {/* 主視覺花卉選單 (純圖片網格佈局) */}
              {activeTab === "flowers" && (
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_FLOWERS.map((fl) => (
                    <div
                      key={fl.id}
                      onClick={() => addLayer({ name: fl.name, price: fl.price, image: fl.image, type: "flower" })}
                      className="group relative aspect-square rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/40 hover:border-[color:var(--accent)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] p-2 flex items-center justify-center cursor-pointer transition-all overflow-hidden shadow-xs"
                    >
                      {fl.image && (
                        <img
                          src={fl.image}
                          alt={fl.name}
                          className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 select-none"
                        />
                      )}
                      
                      {/* 懸浮覆蓋層顯示價格與名稱提示 */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex flex-col items-center justify-end">
                        <span className="text-[10px] font-bold text-white truncate max-w-full leading-tight">{fl.name}</span>
                        <span className="text-[9px] font-extrabold text-[color:var(--accent)] bg-white/90 dark:bg-black/90 px-1 rounded mt-0.5">+NT${fl.price}</span>
                      </div>

                      {/* 常駐右上角精巧小價格標籤 */}
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-extrabold text-[color:var(--muted)] group-hover:opacity-0 transition-opacity bg-[color:var(--card)]/80 backdrop-blur-xs px-1 py-0.5 rounded border border-[color:var(--line)]">
                        ${fl.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 配材點綴選單 (純圖片網格佈局) */}
              {activeTab === "accents" && (
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_ACCENTS.map((ac) => (
                    <div
                      key={ac.id}
                      onClick={() => addLayer({ name: ac.name, price: ac.price, image: ac.image, symbol: ac.symbol, type: "accent" })}
                      className="group relative aspect-square rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/40 hover:border-[color:var(--accent-2)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] p-2 flex items-center justify-center cursor-pointer transition-all overflow-hidden shadow-xs"
                    >
                      {ac.image ? (
                        <img
                          src={ac.image}
                          alt={ac.name}
                          className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 select-none"
                        />
                      ) : (
                        <span className="text-4xl group-hover:scale-110 transition-transform duration-300 select-none">{ac.symbol}</span>
                      )}
                      
                      {/* 懸浮覆蓋層顯示價格與名稱提示 */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex flex-col items-center justify-end">
                        <span className="text-[10px] font-bold text-white truncate max-w-full leading-tight">{ac.name}</span>
                        <span className="text-[9px] font-extrabold text-[color:var(--accent-2)] bg-white/90 dark:bg-black/90 px-1 rounded mt-0.5">+NT${ac.price}</span>
                      </div>

                      {/* 常駐右上角精巧小價格標籤 */}
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-extrabold text-[color:var(--muted)] group-hover:opacity-0 transition-opacity bg-[color:var(--card)]/80 backdrop-blur-xs px-1 py-0.5 rounded border border-[color:var(--line)]">
                        ${ac.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 心意燙金刻字 */}
              {activeTab === "text" && (
                <div className="p-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/40 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-[color:var(--muted)]">輸入簡短字句，模擬手工燙金覆膜效果：</p>
                  <input
                    type="text"
                    value={customTextContent}
                    onChange={(e) => setCustomTextContent(e.target.value)}
                    placeholder="例：Happy Birthday / 畢業快樂"
                    className="h-10 rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] px-3 text-xs outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                  <Button size="sm" onClick={handleAddText} disabled={!customTextContent.trim()}>
                    新增燙金圖層 (+NT$60)
                  </Button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[color:var(--muted)] text-center mt-3 pt-2 border-t border-[color:var(--line)]/40">
              💡 點擊素材即可直接置入中央預覽畫布
            </p>
          </div>
        </div>

        {/* 中央區：高保真動態預覽畫布 (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm rounded-3xl border border-[color:var(--line)] bg-black/5 dark:bg-white/5 p-6 shadow-inner flex flex-col items-center justify-center relative">
            <span className="absolute top-2 left-3 text-[9px] text-[color:var(--muted)] uppercase font-bold tracking-widest">
              CANVAS STAGE
            </span>
            <span className="absolute top-2 right-3 text-[9px] text-[color:var(--muted)]">
              {draggingLayerId ? (
                <span className="text-[color:var(--accent)] font-bold animate-pulse">
                  X: {layers.find((l) => l.id === draggingLayerId)?.x}% | Y: {layers.find((l) => l.id === draggingLayerId)?.y}%
                </span>
              ) : (
                `${layers.length} 疊加元素`
              )}
            </span>

            {/* 實體擬真卡片主體 (外掛光澤與陰影) */}
            <div
              ref={canvasRef}
              onClick={() => setActiveLayerId(null)} // 點擊空白處取消選取
              className="w-full aspect-[3/4] rounded-2xl shadow-xl transition-colors duration-500 relative overflow-hidden border border-black/10 my-4 cursor-crosshair flex flex-col items-center justify-center select-none"
              style={{ backgroundColor: selectedBase.color }}
            >
              {/* 智能中心對齊輔助線 (Smart Guides) */}
              {showCenterX && (
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[color:var(--accent)] border-x border-white/40 z-20 pointer-events-none animate-fade-in" />
              )}
              {showCenterY && (
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-[color:var(--accent)] border-y border-white/40 z-20 pointer-events-none animate-fade-in" />
              )}

              {/* 卡片優雅的燙金內邊框裝飾線 */}
              <div className="absolute inset-3 border border-black/[0.08] dark:border-white/[0.12] rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <span className="text-[8px] text-[color:var(--muted)] tracking-widest uppercase opacity-40">Floriography</span>
                <span className="text-[8px] text-[color:var(--muted)] tracking-widest text-right opacity-40">Handmade</span>
              </div>

              {/* 渲染所有視覺圖層 */}
              {layers.map((layer) => {
                const isActive = activeLayerId === layer.id;
                const isDragging = draggingLayerId === layer.id;

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLayerId(layer.id);
                    }}
                    onPointerDown={(e) => handlePointerDown(e, layer)}
                    onPointerMove={(e) => handlePointerMove(e, layer.id)}
                    onPointerUp={handlePointerUp}
                    className={`absolute cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-2 rounded-xl select-none ${
                      isDragging ? "z-40 scale-105" : "transition-all duration-75"
                    } ${isActive ? "ring-2 ring-[color:var(--accent)] bg-black/5 dark:bg-white/5 z-30 scale-105" : ""}`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: `translate(-50%, -50%) scale(${layer.scale})`,
                      zIndex: isDragging ? 999 : layer.zIndex,
                    }}
                  >
                    {/* 若為文字圖層 */}
                    {layer.type === "text" ? (
                      <p className="font-[family-name:var(--font-display)] font-bold text-xs tracking-widest text-amber-600 dark:text-amber-400 border-b border-amber-500/30 pb-0.5 whitespace-nowrap shadow-xs">
                        {layer.text}
                      </p>
                    ) : layer.image ? (
                      /* 若為去背圖片素材 */
                      <img
                        src={layer.image}
                        alt={layer.name}
                        className="w-24 h-24 object-contain filter drop-shadow-md select-none pointer-events-none"
                      />
                    ) : (
                      /* 若為花卉素材模擬符號 */
                      <span className="text-4xl filter drop-shadow-sm select-none">
                        {layer.symbol}
                      </span>
                    )}

                    {/* 活躍選取時顯示迷你提示點 */}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[color:var(--accent)] animate-ping" />
                    )}
                  </div>
                );
              })}

              {layers.length === 0 && (
                <div className="text-center p-6 pointer-events-none">
                  <p className="text-xs text-[color:var(--muted)]">畫布尚無花材</p>
                  <p className="text-[10px] text-[color:var(--muted)]/60 mt-1">請自左側清單點選置入</p>
                </div>
              )}
            </div>

            {/* 活躍圖層專屬的微調控制器面板 Widget (當有選取圖層時動態繪製) */}
            <div className="h-28 w-full mt-2 transition-all">
              {activeLayerId ? (
                <div className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--card)] p-3 shadow-sm animate-fade-in flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between border-b border-[color:var(--line)]/60 pb-1.5">
                    <span className="text-[10px] font-bold text-[color:var(--accent)] truncate max-w-[150px]">
                      ✏️ 調整: {layers.find((l) => l.id === activeLayerId)?.name}
                    </span>
                    <button
                      onClick={() => deleteLayer(activeLayerId)}
                      className="text-[10px] text-red-500 hover:text-red-600 font-semibold transition-colors"
                    >
                      移除圖層
                    </button>
                  </div>

                  {/* 位置與縮放控制列 */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div>
                      <span className="text-[9px] text-[color:var(--muted)] block mb-1">位置微移</span>
                      <div className="inline-flex rounded-lg border border-[color:var(--line)] bg-[color:var(--background)] p-0.5">
                        <button onClick={() => nudgePos("left")} className="px-2 py-0.5 text-xs hover:bg-black/5 rounded">←</button>
                        <button onClick={() => nudgePos("up")} className="px-2 py-0.5 text-xs hover:bg-black/5 rounded">↑</button>
                        <button onClick={() => nudgePos("down")} className="px-2 py-0.5 text-xs hover:bg-black/5 rounded">↓</button>
                        <button onClick={() => nudgePos("right")} className="px-2 py-0.5 text-xs hover:bg-black/5 rounded">→</button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-[color:var(--muted)] block mb-1">素材縮放</span>
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => adjustScale(-0.2)} className="w-6 h-6 rounded border bg-[color:var(--background)] text-xs font-bold hover:bg-black/5">-</button>
                        <span className="text-xs font-bold w-6 text-center">
                          {layers.find((l) => l.id === activeLayerId)?.scale}x
                        </span>
                        <button onClick={() => adjustScale(0.2)} className="w-6 h-6 rounded border bg-[color:var(--background)] text-xs font-bold hover:bg-black/5">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full rounded-2xl border border-dashed border-[color:var(--line)] flex items-center justify-center text-center p-3">
                  <p className="text-[11px] text-[color:var(--muted)]">
                    💡 提示：可直接拖曳畫布內的素材符號<br />點擊可開啟圖層縮放與精確微調面板
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側欄：圖層結構清單與結帳中心 (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-[color:var(--muted)] uppercase mb-3">
                圖層明細與計費
              </p>

              {/* 固定底層明細 */}
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between mb-3 border border-black/5">
                <div>
                  <span className="text-[9px] text-[color:var(--muted)] block">底座卡紙 (基礎)</span>
                  <span className="text-xs font-bold text-[color:var(--foreground)]">{selectedBase.name}</span>
                </div>
                <span className="text-xs font-bold text-[color:var(--muted)]">NT${selectedBase.price}</span>
              </div>

              {/* 疊加圖層清單 */}
              <p className="text-[10px] font-semibold text-[color:var(--muted)] mb-2 px-1">
                疊加裝飾 ({layers.length})
              </p>
              
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 mb-4">
                {layers.map((l, idx) => {
                  const isSelected = activeLayerId === l.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => setActiveLayerId(l.id)}
                      className={`p-2 px-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5 text-[color:var(--accent)] font-semibold"
                          : "border-[color:var(--line)] hover:bg-[color:var(--background)]/50 text-[color:var(--foreground)]/90"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {l.image ? (
                          <img src={l.image} alt={l.name} className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <span className="text-xs">{l.symbol || "✍️"}</span>
                        )}
                        <span className="text-xs truncate max-w-[110px]">{l.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold">+{l.price}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(l.id);
                          }}
                          className="text-[10px] text-[color:var(--muted)] hover:text-red-500 px-1"
                          title="移除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                {layers.length === 0 && (
                  <p className="text-[11px] text-center py-6 text-[color:var(--muted)] border border-dashed rounded-xl">
                    尚無額外收費圖層
                  </p>
                )}
              </div>
            </div>

            {/* 底部行動呼籲區塊 */}
            <div className="border-t border-[color:var(--line)]/60 pt-4 mt-2">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs font-medium text-[color:var(--muted)]">試算總額</span>
                <span className="text-lg font-extrabold text-[color:var(--foreground)]">NT$ {totalPrice}</span>
              </div>

              <Button onClick={handleSaveAndCheckout} className="w-full shadow-sm py-2.5 text-xs">
                委託製作專屬設計
              </Button>
              <p className="text-[9px] text-[color:var(--muted)] text-center mt-2 leading-relaxed">
                自動保存藍圖與圖層順序<br />設計師將依據此草圖比例為您還原實體創作
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
