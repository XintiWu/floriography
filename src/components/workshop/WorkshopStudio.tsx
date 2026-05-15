"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

// 預設模擬素材庫
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
  rotation: number;
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
    {
      id: "layer-init",
      type: "flower",
      name: "紅粉佳人玫瑰",
      price: 120,
      image: "/images/flowers/IMG_8705_processed.png",
      x: 50,
      y: 50,
      scale: 1.0,
      rotation: -15, // 給予一個自然的微傾斜
      zIndex: 1,
    },
  ]);

  // 當前選取的活躍圖層 ID
  const [activeLayerId, setActiveLayerId] = useState<string | null>("layer-init");
  const [panelDraggingLayerId, setPanelDraggingLayerId] = useState<string | null>(null);

  // 自訂文字刻字暫存狀態
  const [customTextContent, setCustomTextContent] = useState("");

  // 畫布與拖曳參考
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // 操作狀態
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [transformingLayerId, setTransformingLayerId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<"scale" | "rotate" | null>(null);
  
  // 輔助線
  const [showCenterX, setShowCenterX] = useState(false);
  const [showCenterY, setShowCenterY] = useState(false);

  // 記錄初始操作座標與狀態
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initScale?: number;
    initRotation?: number;
    centerX?: number;
    centerY?: number;
  } | null>(null);

  // ============================
  // 互動事件處理 (點擊、移動、放開)
  // ============================

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, layer: StudioLayer) => {
    if (e.button !== 0) return; // 僅回應左鍵
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    
    setActiveLayerId(layer.id);
    setDraggingLayerId(layer.id);
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: layer.x,
      initY: layer.y,
    };
  };

  const handleScalePointerDown = (e: React.PointerEvent<HTMLDivElement>, layer: StudioLayer) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    
    setActiveLayerId(layer.id);
    setTransformingLayerId(layer.id);
    setTransformMode("scale");
    
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + (layer.x / 100) * rect.width : 0;
    const centerY = rect ? rect.top + (layer.y / 100) * rect.height : 0;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: layer.x,
      initY: layer.y,
      initScale: layer.scale,
      centerX,
      centerY
    };
  };

  const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>, layer: StudioLayer) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    
    setActiveLayerId(layer.id);
    setTransformingLayerId(layer.id);
    setTransformMode("rotate");

    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + (layer.x / 100) * rect.width : 0;
    const centerY = rect ? rect.top + (layer.y / 100) * rect.height : 0;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: layer.x,
      initY: layer.y,
      initRotation: layer.rotation || 0,
      centerX,
      centerY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !canvasRef.current) return;

    // 處理縮放
    if (transformingLayerId && transformMode === "scale") {
       const dx = e.clientX - (dragRef.current.centerX || 0);
       const dy = e.clientY - (dragRef.current.centerY || 0);
       const currentDist = Math.sqrt(dx*dx + dy*dy);
       
       const initDx = dragRef.current.startX - (dragRef.current.centerX || 0);
       const initDy = dragRef.current.startY - (dragRef.current.centerY || 0);
       const initDist = Math.sqrt(initDx*initDx + initDy*initDy);
       
       const ratio = currentDist / (initDist || 1);
       let newScale = (dragRef.current.initScale || 1) * ratio;
       
       // 動態計算最大縮放比例：不超過畫布的 90%
       const canvasRect = canvasRef.current.getBoundingClientRect();
       const maxDimension = Math.min(canvasRect.width, canvasRect.height);
       const baseItemSize = 112; // 預設圖片 w-28 h-28 大約是 112px
       const dynamicMaxScale = Math.max(1.5, (maxDimension * 0.9) / baseItemSize);

       newScale = Math.max(0.3, Math.min(dynamicMaxScale, +newScale.toFixed(2))); // 限制縮放範圍
       
       setLayers(s => s.map(l => l.id === transformingLayerId ? { ...l, scale: newScale } : l));
       return;
    }

    // 處理旋轉
    if (transformingLayerId && transformMode === "rotate") {
       const dx = e.clientX - (dragRef.current.centerX || 0);
       const dy = e.clientY - (dragRef.current.centerY || 0);
       const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
       
       const initDx = dragRef.current.startX - (dragRef.current.centerX || 0);
       const initDy = dragRef.current.startY - (dragRef.current.centerY || 0);
       const initAngle = Math.atan2(initDy, initDx) * 180 / Math.PI;
       
       let angleDiff = currentAngle - initAngle;
       let newRotation = (dragRef.current.initRotation || 0) + angleDiff;
       
       // 按住 Shift 鍵可進行 45 度角的吸附
       if (e.shiftKey) {
          newRotation = Math.round(newRotation / 45) * 45;
       }
       
       setLayers(s => s.map(l => l.id === transformingLayerId ? { ...l, rotation: Math.round(newRotation) } : l));
       return;
    }

    // 處理位置拖曳
    if (draggingLayerId) {
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
          s.map((l) => (l.id === draggingLayerId ? { ...l, x: targetX, y: targetY } : l))
        );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    setDraggingLayerId(null);
    setTransformingLayerId(null);
    setTransformMode(null);
    dragRef.current = null;
    setShowCenterX(false);
    setShowCenterY(false);
  };


  // ============================
  // 外部素材直接拖曳置入 (Drag & Drop)
  // ============================

  const handleDragStartNewItem = (e: React.DragEvent<HTMLDivElement>, item: any) => {
    // 傳遞素材的 JSON 資料
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
    
    // 自訂拖曳縮圖：解決原本帶有白底外框的醜陋預設拖曳影像
    if (item.image) {
       const img = new Image();
       img.src = item.image;
       e.dataTransfer.setDragImage(img, 50, 50);
    }
  };

  const handlePanelDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    setPanelDraggingLayerId(id);
    e.dataTransfer.effectAllowed = "move";
    
    // 取消面板預設拖曳鬼影，讓畫面保持簡潔
    const ghost = document.createElement('div');
    e.dataTransfer.setDragImage(ghost, 0, 0);
  };

  const handlePanelDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handlePanelDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!panelDraggingLayerId || panelDraggingLayerId === targetId) {
        setPanelDraggingLayerId(null);
        return;
    }

    setLayers((prev) => {
      // 根據目前畫面上的 Z-index 由上往下排序（數值大在前面）
      const sorted = [...prev].sort((a, b) => b.zIndex - a.zIndex);
      const draggedIdx = sorted.findIndex(l => l.id === panelDraggingLayerId);
      const targetIdx = sorted.findIndex(l => l.id === targetId);
      
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      // 抽出來然後插入到目標位置
      const [draggedItem] = sorted.splice(draggedIdx, 1);
      sorted.splice(targetIdx, 0, draggedItem);
      
      // 重新賦予乾淨且連貫的 z-index
      const baseZ = 1;
      return sorted.map((l, idx) => ({
        ...l,
        zIndex: baseZ + sorted.length - 1 - idx
      }));
    });
    setPanelDraggingLayerId(null);
  };

  const handleDragOverCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // 允許放下
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDropOnCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    
    try {
      const item = JSON.parse(data);
      const rect = canvasRef.current.getBoundingClientRect();
      // 計算滑鼠落在畫布內的座標比例
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      
      const percentX = Math.max(0, Math.min(100, (dropX / rect.width) * 100));
      const percentY = Math.max(0, Math.min(100, (dropY / rect.height) * 100));
      
      addLayer(item, percentX, percentY);
    } catch (err) {
      console.error("Drop parsing error", err);
    }
  };

  // 新增素材至畫布
  const addLayer = (
    item: { name: string; price: number; symbol?: string; image?: string; type: "flower" | "accent" | "text"; text?: string },
    x?: number,
    y?: number
  ) => {
    const nextZ = layers.length > 0 ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 1;
    // 如果沒有指定座標(點擊新增)，則隨機錯開預設座標
    const finalX = x !== undefined ? x : 30 + Math.floor(Math.random() * 40);
    const finalY = y !== undefined ? y : 30 + Math.floor(Math.random() * 40);

    const newLayer: StudioLayer = {
      id: `layer-${Date.now()}`,
      type: item.type,
      name: item.name,
      price: item.price,
      symbol: item.symbol,
      image: item.image,
      text: item.text,
      x: finalX,
      y: finalY,
      scale: 1.0,
      rotation: 0,
      zIndex: nextZ,
    };

    setLayers((s) => [...s, newLayer]);
    setActiveLayerId(newLayer.id);
  };

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

  const deleteLayer = (id: string) => {
    setLayers((s) => s.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  // 微調控制器方法：調整屬性
  const updateActiveLayer = (updates: Partial<StudioLayer>) => {
    if (!activeLayerId) return;
    setLayers((s) =>
      s.map((l) => (l.id === activeLayerId ? { ...l, ...updates } : l))
    );
  };

  const nudgePos = (dir: "up" | "down" | "left" | "right") => {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    const step = 2;
    if (dir === "up") updateActiveLayer({ y: Math.max(0, layer.y - step) });
    if (dir === "down") updateActiveLayer({ y: Math.min(100, layer.y + step) });
    if (dir === "left") updateActiveLayer({ x: Math.max(0, layer.x - step) });
    if (dir === "right") updateActiveLayer({ x: Math.min(100, layer.x + step) });
  };

  const adjustScale = (delta: number) => {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    
    // 面板中的縮放也套用動態上限
    let maxScale = 5.0;
    if (canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        maxScale = Math.max(1.5, (Math.min(canvasRect.width, canvasRect.height) * 0.9) / 112);
    }
    updateActiveLayer({ scale: Math.max(0.3, Math.min(maxScale, +(layer.scale + delta).toFixed(2))) });
  };

  const adjustRotation = (delta: number) => {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    updateActiveLayer({ rotation: Math.round((layer.rotation || 0) + delta) });
  };

  const bringToFront = () => {
    if (!activeLayerId || layers.length <= 1) return;
    const maxZ = Math.max(...layers.map((l) => l.zIndex));
    updateActiveLayer({ zIndex: maxZ + 1 });
  };

  const sendToBack = () => {
    if (!activeLayerId || layers.length <= 1) return;
    const minZ = Math.min(...layers.map((l) => l.zIndex));
    updateActiveLayer({ zIndex: minZ - 1 });
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
            自訂卡片設計工作室
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
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold tracking-wider text-[color:var(--muted)] uppercase">
                素材庫 Library
              </p>
              <span className="text-[10px] text-[color:var(--muted)] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                支援拖曳置入
              </span>
            </div>

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
            <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1 pb-4">
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
                    </div>
                  );
                })}

              {/* 主視覺花卉選單 */}
              {activeTab === "flowers" && (
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_FLOWERS.map((fl) => (
                    <div
                      key={fl.id}
                      draggable
                      onDragStart={(e) => handleDragStartNewItem(e, { ...fl, type: "flower" })}
                      onClick={() => addLayer({ name: fl.name, price: fl.price, image: fl.image, type: "flower" })}
                      className="group relative aspect-square rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/40 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent)]/5 p-2 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all overflow-hidden shadow-xs"
                    >
                      {fl.image && (
                        <img
                          src={fl.image}
                          alt={fl.name}
                          className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-end">
                        <span className="text-[10px] font-bold text-white truncate max-w-full">{fl.name}</span>
                      </div>
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-extrabold text-[color:var(--muted)] bg-[color:var(--card)]/80 backdrop-blur-xs px-1 py-0.5 rounded border border-[color:var(--line)]">
                        ${fl.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 配材點綴選單 */}
              {activeTab === "accents" && (
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_ACCENTS.map((ac) => (
                    <div
                      key={ac.id}
                      draggable
                      onDragStart={(e) => handleDragStartNewItem(e, { ...ac, type: "accent" })}
                      onClick={() => addLayer({ name: ac.name, price: ac.price, image: ac.image, symbol: ac.symbol, type: "accent" })}
                      className="group relative aspect-square rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/40 hover:border-[color:var(--accent-2)] hover:bg-[color:var(--accent-2)]/5 p-2 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all overflow-hidden shadow-xs"
                    >
                      {ac.image ? (
                        <img
                          src={ac.image}
                          alt={ac.name}
                          className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none"
                        />
                      ) : (
                        <span className="text-4xl group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none">{ac.symbol}</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-end">
                        <span className="text-[10px] font-bold text-white truncate max-w-full">{ac.name}</span>
                      </div>
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-extrabold text-[color:var(--muted)] bg-[color:var(--card)]/80 backdrop-blur-xs px-1 py-0.5 rounded border border-[color:var(--line)]">
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

            <p className="text-[10px] text-[color:var(--muted)] text-center mt-3 pt-2 border-t border-[color:var(--line)]/40 flex items-center justify-center gap-1">
              <span>💡 提示：點擊或直接</span>
              <span className="font-bold text-[color:var(--foreground)] border-b border-dashed border-[color:var(--muted)]">拖曳素材</span>
              <span>至右側畫布</span>
            </p>
          </div>
        </div>

        {/* 中央區：高保真動態預覽畫布 (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="w-full max-w-md rounded-3xl border border-[color:var(--line)] bg-black/5 dark:bg-white/5 p-6 shadow-inner flex flex-col items-center justify-center relative min-h-[500px]">
            
            {/* 實體擬真卡片主體 */}
            <div
              ref={canvasRef}
              onClick={() => setActiveLayerId(null)}
              onDragOver={handleDragOverCanvas}
              onDrop={handleDropOnCanvas}
              className="w-full aspect-[3/4] rounded-2xl shadow-2xl transition-colors duration-500 relative my-4 cursor-default flex flex-col items-center justify-center select-none bg-cover bg-center"
              style={{ backgroundColor: selectedBase.color }}
            >
              {/* 卡片優雅的燙金內邊框裝飾線 */}
              <div className="absolute inset-3 border border-black/[0.08] dark:border-white/[0.12] rounded-xl pointer-events-none flex flex-col justify-between p-3 z-0">
                <span className="text-[8px] text-[color:var(--muted)] tracking-widest uppercase opacity-40">Floriography</span>
                <span className="text-[8px] text-[color:var(--muted)] tracking-widest text-right opacity-40">Studio</span>
              </div>

              {/* 智能中心對齊輔助線 (Smart Guides) */}
              {showCenterX && (
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[color:var(--accent)] z-20 pointer-events-none animate-fade-in opacity-50" />
              )}
              {showCenterY && (
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[color:var(--accent)] z-20 pointer-events-none animate-fade-in opacity-50" />
              )}

              {/* 渲染所有視覺圖層 */}
              {layers.map((layer) => {
                const isActive = activeLayerId === layer.id;
                const isDragging = draggingLayerId === layer.id;
                const isTransforming = transformingLayerId === layer.id;
                
                // 動態層級提昇
                const currentZ = (isDragging || isTransforming) ? 999 : layer.zIndex;

                return (
                  <div
                    key={layer.id}
                    className={`absolute flex flex-col items-center justify-center p-0 select-none ${
                      isDragging || isTransforming ? "transition-none" : "transition-all duration-75"
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${layer.scale})`,
                      zIndex: currentZ,
                    }}
                    onClick={(e) => {
                      // 防止點擊事件冒泡到畫布導致取消選取
                      e.stopPropagation();
                      setActiveLayerId(layer.id);
                    }}
                  >
                    {/* Bounding Box 互動熱區與外框 */}
                    <div 
                      className="relative w-full h-full p-2 rounded-xl cursor-grab active:cursor-grabbing flex items-center justify-center"
                      onPointerDown={(e) => handlePointerDown(e, layer)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    >
                      {/* 優雅背光發光效果 (Backlight glow) */}
                      {isActive && (
                        <div className="absolute inset-0 bg-[#e6c1a8]/40 dark:bg-[#e6c1a8]/20 blur-2xl rounded-full scale-[1.8] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
                      )}
                        
                      {/* Scale Handle (右下角 - 棕紅邊框白底圓圈加上點點) */}
                      {isActive && (
                        <div 
                          className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-[3px] border-[#9c665c] rounded-full cursor-nwse-resize z-50 shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                          onPointerDown={(e) => handleScalePointerDown(e, layer)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onClick={(e) => e.stopPropagation()}
                          title="拖曳縮放"
                        >
                           <span className="w-1.5 h-1.5 rounded-full bg-[#9c665c] pointer-events-none" />
                        </div>
                      )}

                      {/* Rotate Handle (正上方 - 灰綠邊框白底圓圈加上旋轉符號) */}
                      {isActive && (
                        <div 
                          className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-[3px] border-[#839b83] rounded-full cursor-crosshair z-50 shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                          onPointerDown={(e) => handleRotatePointerDown(e, layer)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onClick={(e) => e.stopPropagation()}
                          title="拖曳旋轉"
                        >
                           <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#839b83] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                        </div>
                      )}

                      {/* Delete Handle (右上角 - 棕紅底白叉叉) */}
                      {isActive && (
                        <div 
                          className="absolute -top-2 -right-2 w-7 h-7 bg-[#9c665c] text-white rounded-full cursor-pointer z-50 shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(layer.id);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          title="移除圖層"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )}

                      {/* Content 內容本體 */}
                      {layer.type === "text" ? (
                        <p className="font-[family-name:var(--font-display)] font-bold text-xl tracking-widest text-amber-500 drop-shadow-sm whitespace-nowrap pointer-events-none relative z-10">
                          {layer.text}
                        </p>
                      ) : layer.image ? (
                        <img
                          src={layer.image}
                          alt={layer.name}
                          className="w-28 h-28 object-contain filter drop-shadow-lg select-none pointer-events-none relative z-10"
                        />
                      ) : (
                        <span className="text-5xl filter drop-shadow-lg select-none pointer-events-none relative z-10">
                          {layer.symbol}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {layers.length === 0 && (
                <div className="text-center p-6 pointer-events-none opacity-50 z-10">
                  <svg className="w-12 h-12 mx-auto mb-2 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-semibold">畫布尚無素材</p>
                  <p className="text-[11px] mt-1">請自左側拖曳花材置入</p>
                </div>
              )}
            </div>

          </div>

          {/* 浮動式精確控制工具列 (當有選取圖層時顯示) */}
          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 w-[90%] transition-all duration-300 ${activeLayerId ? "opacity-100 z-50" : "opacity-0 pointer-events-none -translate-y-4 z-[-1]"}`}>
            <div className="bg-[color:var(--card)]/95 backdrop-blur-md border border-[color:var(--accent)]/40 rounded-2xl shadow-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-[color:var(--line)]/60 pb-2 px-1">
                <span className="text-[11px] font-bold text-[color:var(--accent)] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  編輯: {layers.find((l) => l.id === activeLayerId)?.name}
                </span>
                <div className="flex gap-2">
                  <button onClick={bringToFront} className="text-[10px] text-[color:var(--muted)] hover:text-[color:var(--foreground)] px-1" title="移至最上層">上移</button>
                  <button onClick={sendToBack} className="text-[10px] text-[color:var(--muted)] hover:text-[color:var(--foreground)] px-1" title="移至最下層">下移</button>
                  <button onClick={() => deleteLayer(activeLayerId!)} className="text-[10px] text-red-500 hover:text-red-600 font-semibold px-1 ml-1 border-l border-[color:var(--line)] pl-2" title="移除圖層">移除</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[color:var(--muted)] mb-0.5">精確縮放</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjustScale(-0.1)} className="w-6 h-6 rounded border bg-[color:var(--background)] hover:bg-[color:var(--accent)]/10 text-xs flex items-center justify-center">-</button>
                      <span className="text-[10px] font-mono w-8 text-center">{layers.find((l) => l.id === activeLayerId)?.scale.toFixed(1)}x</span>
                      <button onClick={() => adjustScale(0.1)} className="w-6 h-6 rounded border bg-[color:var(--background)] hover:bg-[color:var(--accent)]/10 text-xs flex items-center justify-center">+</button>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-[color:var(--line)]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[color:var(--muted)] mb-0.5">精確旋轉</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjustRotation(-15)} className="w-6 h-6 rounded border bg-[color:var(--background)] hover:bg-[color:var(--accent)]/10 text-xs flex items-center justify-center">↺</button>
                      <span className="text-[10px] font-mono w-9 text-center">{layers.find((l) => l.id === activeLayerId)?.rotation || 0}°</span>
                      <button onClick={() => adjustRotation(15)} className="w-6 h-6 rounded border bg-[color:var(--background)] hover:bg-[color:var(--accent)]/10 text-xs flex items-center justify-center">↻</button>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <span className="text-[9px] text-[color:var(--muted)] mb-0.5">微調位置</span>
                   <div className="grid grid-cols-3 gap-0.5 w-[52px]">
                     <div />
                     <button onClick={() => nudgePos("up")} className="bg-[color:var(--line)]/50 hover:bg-[color:var(--accent)]/20 rounded h-4 text-[8px] flex items-center justify-center">▲</button>
                     <div />
                     <button onClick={() => nudgePos("left")} className="bg-[color:var(--line)]/50 hover:bg-[color:var(--accent)]/20 rounded h-4 text-[8px] flex items-center justify-center">◀</button>
                     <button onClick={() => nudgePos("down")} className="bg-[color:var(--line)]/50 hover:bg-[color:var(--accent)]/20 rounded h-4 text-[8px] flex items-center justify-center">▼</button>
                     <button onClick={() => nudgePos("right")} className="bg-[color:var(--line)]/50 hover:bg-[color:var(--accent)]/20 rounded h-4 text-[8px] flex items-center justify-center">▶</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右側欄：圖層結構清單與結帳中心 (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 shadow-sm flex flex-col h-full min-h-[400px]">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-wider text-[color:var(--muted)] uppercase mb-3">
                圖層面板 Layers
              </p>

              {/* 固定底層明細 */}
              <div className="p-2.5 rounded-xl bg-[color:var(--background)] border border-[color:var(--line)] flex items-center justify-between mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: selectedBase.color }} />
                  <div>
                    <span className="text-[9px] text-[color:var(--muted)] block leading-tight">底座紙材</span>
                    <span className="text-[11px] font-bold text-[color:var(--foreground)]">{selectedBase.name}</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[color:var(--muted)]">${selectedBase.price}</span>
              </div>

              {/* 疊加圖層清單 (反向排列，符合視覺上層在上面的邏輯) */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-semibold text-[color:var(--muted)]">
                  裝飾元素 ({layers.length})
                </span>
                <span className="text-[9px] text-[color:var(--muted)]/70">由上到下排序</span>
              </div>
              
              <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                {[...layers].sort((a, b) => b.zIndex - a.zIndex).map((l) => {
                  const isSelected = activeLayerId === l.id;
                  const isPanelDragging = panelDraggingLayerId === l.id;
                  return (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={(e) => handlePanelDragStart(e, l.id)}
                      onDragOver={handlePanelDragOver}
                      onDrop={(e) => handlePanelDrop(e, l.id)}
                      onDragEnd={() => setPanelDraggingLayerId(null)}
                      onClick={() => setActiveLayerId(l.id)}
                      className={`p-2 px-3 rounded-xl border text-left cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group ${
                        isSelected
                          ? "border-[#9c665c] bg-[#9c665c]/10 text-[#9c665c] shadow-sm"
                          : "border-[color:var(--line)] hover:bg-[color:var(--background)] hover:border-[color:var(--muted)]/30 text-[color:var(--foreground)]/90"
                      } ${isPanelDragging ? "opacity-30 border-dashed" : "opacity-100"}`}
                    >
                      <div className="flex items-center gap-2.5 truncate pointer-events-none">
                        <div className="w-5 h-5 flex items-center justify-center bg-white/50 dark:bg-black/20 rounded shadow-inner shrink-0">
                          {l.image ? (
                            <img src={l.image} alt={l.name} className="w-4 h-4 object-contain" />
                          ) : (
                            <span className="text-[10px]">{l.symbol || "✍️"}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                           <span className={`text-[11px] truncate max-w-[90px] ${isSelected ? "font-bold" : "font-medium"}`}>{l.name}</span>
                           <span className="text-[9px] opacity-60">Z-index: {l.zIndex}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold">+{l.price}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(l.id);
                          }}
                          className="text-[10px] text-[color:var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="移除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                {layers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 border border-dashed border-[color:var(--line)] rounded-xl opacity-60">
                    <span className="text-xl mb-1">🍃</span>
                    <p className="text-[10px] text-center text-[color:var(--muted)]">沒有任何花材</p>
                  </div>
                )}
              </div>
            </div>

            {/* 底部行動呼籲區塊 */}
            <div className="border-t border-[color:var(--line)]/60 pt-4 mt-4">
              <div className="flex items-end justify-between mb-3">
                <span className="text-xs font-medium text-[color:var(--muted)]">設計總額</span>
                <div className="text-right">
                  <span className="text-[10px] text-[color:var(--accent)] font-bold block mb-0.5">TWD</span>
                  <span className="text-2xl font-extrabold text-[color:var(--foreground)] leading-none">${totalPrice}</span>
                </div>
              </div>

              <Button onClick={handleSaveAndCheckout} className="w-full shadow-md py-3 text-sm font-bold bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] hover:opacity-90 transition-opacity border-none text-white">
                確認設計，送出委託
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
