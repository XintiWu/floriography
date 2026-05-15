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

// 花材子分類資料
const FLOWER_CATEGORIES = [
  {
    id: "seasonal", label: "當季花材", emoji: "🌸",
    items: [
      { id: "fl-1", name: "紅粉佳人玫瑰", price: 120, image: "/images/flowers/IMG_8705_processed.png", meaning: "高雅、美好、純潔的愛與友情" },
      { id: "fl-2", name: "多瓣柔粉桔梗", price: 110, image: "/images/flowers/IMG_8706_processed.png", meaning: "真誠不變的愛、純潔、無望的愛" },
      { id: "fl-3", name: "初春紫嫣薰衣草", price: 95, image: "/images/flowers/IMG_8708_processed.png", meaning: "等待愛情、安靜、堅貞、浪漫" },
    ]
  },
  {
    id: "kyoto", label: "經典花材", emoji: "⭐",
    items: [
      { id: "fl-4", name: "陽光暖黃向日葵", price: 100, image: "/images/flowers/IMG_8709_processed.png", meaning: "信念、光輝、高傲、忠誠、愛慕" },
      { id: "fl-5", name: "純淨初雪白鬱金香", price: 130, image: "/images/flowers/IMG_8710_processed.png", meaning: "純潔、高尚、淡泊、純潔的戀情" },
    ]
  },
  {
    id: "combo", label: "組合花材", emoji: "💐",
    items: [
      { id: "fl-6", name: "春日粉彩混搭束", price: 180, image: "/images/flowers/IMG_8705_processed.png", meaning: "豐盛、喜悅、愛與感恩" },
    ]
  },
  {
    id: "tree", label: "樹材點綴", emoji: "🌿",
    items: [
      { id: "ac-1", name: "尤加利青綠葉脈", price: 50, image: "/images/flowers/IMG_8711_processed.png", meaning: "恩賜、回憶" },
      { id: "ac-2", name: "立體乾燥滿天星", price: 40, image: "/images/flowers/IMG_8712_processed.png", meaning: "清純、關懷、戀愛、配角、真愛" },
      { id: "ac-3", name: "奢華點綴金箔", price: 80, symbol: "🌟", meaning: "永恆、財富、閃耀的祝福" },
    ]
  },
];



export interface StudioLayer {
  id: string;
  type: "flower" | "accent" | "text";
  name: string;
  price: number;
  symbol?: string;
  image?: string;
  text?: string;
  meaning?: string;
  x: number; // 0 - 100 percentage
  y: number; // 0 - 100 percentage
  scale: number;
  rotation: number;
  zIndex: number;
}

export function WorkshopStudio() {
  const router = useRouter();

  // 左側面板模式切換: 底紙 | 花材 | 文字
  const [leftMode, setLeftMode] = useState<"bases" | "flowers" | "text">("flowers");
  // 花材分類手風琴展開狀態 (預設全展開)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(FLOWER_CATEGORIES.map(c => c.id)));

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
      meaning: "高雅、美好、純潔的愛與友情",
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
    
    // 建立一個絕美的客製化拖曳資訊小卡
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    ghost.style.left = "-1000px";
    ghost.style.width = "120px";
    ghost.style.height = "120px";
    ghost.style.backgroundColor = "white"; 
    ghost.style.borderRadius = "16px";
    ghost.style.border = "1.5px solid #9c665c";
    ghost.style.display = "flex";
    ghost.style.flexDirection = "column";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";
    ghost.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.15)";
    ghost.style.overflow = "hidden";
    ghost.style.fontFamily = "system-ui, -apple-system, sans-serif";

    // 價格標籤 (右上角)
    const priceTag = document.createElement("div");
    priceTag.innerText = `$${item.price}`;
    priceTag.style.position = "absolute";
    priceTag.style.top = "6px";
    priceTag.style.right = "6px";
    priceTag.style.fontSize = "10px";
    priceTag.style.fontWeight = "bold";
    priceTag.style.color = "#9c665c";
    priceTag.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    priceTag.style.padding = "2px 6px";
    priceTag.style.borderRadius = "6px";
    priceTag.style.border = "1px solid #ecd9d6";
    ghost.appendChild(priceTag);

    // 圖片或符號
    if (item.image) {
      const img = new Image();
      img.src = item.image;
      img.style.width = "75px";
      img.style.height = "75px";
      img.style.objectFit = "contain";
      img.style.marginBottom = "10px";
      ghost.appendChild(img);
    } else if (item.symbol) {
      const span = document.createElement("span");
      span.innerText = item.symbol;
      span.style.fontSize = "45px";
      span.style.marginBottom = "10px";
      ghost.appendChild(span);
    }

    // 底部文字與漸層遮罩
    const bottomBar = document.createElement("div");
    bottomBar.style.position = "absolute";
    bottomBar.style.bottom = "0";
    bottomBar.style.left = "0";
    bottomBar.style.right = "0";
    bottomBar.style.background = "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)";
    bottomBar.style.padding = "16px 8px 6px 8px";
    bottomBar.style.display = "flex";
    bottomBar.style.alignItems = "flex-end";
    bottomBar.style.justifyContent = "center";
    
    const nameStr = document.createElement("span");
    nameStr.innerText = item.name;
    nameStr.style.color = "white";
    nameStr.style.fontSize = "10px";
    nameStr.style.fontWeight = "bold";
    nameStr.style.textAlign = "center";
    nameStr.style.whiteSpace = "nowrap";
    nameStr.style.textOverflow = "ellipsis";
    nameStr.style.overflow = "hidden";
    
    bottomBar.appendChild(nameStr);
    ghost.appendChild(bottomBar);

    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 60, 60);

    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost);
      }
    }, 0);
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
    item: { name: string; price: number; symbol?: string; image?: string; type: "flower" | "accent" | "text"; text?: string; meaning?: string },
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
      meaning: item.meaning,
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

  const activeLayer = layers.find(l => l.id === activeLayerId);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch h-full">

      {/* ══ 左側：素材庫面板 (col-span-4) ══ */}
      <div className="lg:col-span-4">
        <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] shadow-sm overflow-hidden">
          {/* 模式切換 Tab */}
          <div className="flex border-b border-[color:var(--line)]">
            {([["flowers","花材"],["bases","底紙"],["text","文字"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setLeftMode(mode)}
                className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${leftMode === mode ? "bg-[color:var(--background)] text-[#9c665c] border-b-2 border-[#9c665c]" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
              >{label}</button>
            ))}
          </div>

          {/* 花材：手風琴分類 */}
          {leftMode === "flowers" && (
            <div className="divide-y divide-[color:var(--line)]">
              {FLOWER_CATEGORIES.map(cat => (
                <div key={cat.id}>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[color:var(--background)] transition-colors"
                  >
                    <span className="flex items-center gap-2 text-[12px] font-bold text-[color:var(--foreground)]">
                      <span>{cat.emoji}</span>{cat.label}
                      <span className="text-[10px] font-normal text-[color:var(--muted)]">({cat.items.length})</span>
                    </span>
                    <svg className={`w-3.5 h-3.5 text-[color:var(--muted)] transition-transform duration-200 ${expandedCategories.has(cat.id) ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                  </button>

                  {expandedCategories.has(cat.id) && (
                    <div className="grid grid-cols-3 gap-2 px-3 pb-4 pt-1">
                      {cat.items.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={e => handleDragStartNewItem(e, { ...item, type: cat.id === "tree" ? "accent" : "flower" })}
                          onClick={() => addLayer({ ...item, type: cat.id === "tree" ? "accent" : "flower" })}
                          className="group relative aspect-square rounded-lg border border-[color:var(--line)] bg-[color:var(--background)] hover:border-[#9c665c]/60 hover:bg-[#9c665c]/5 p-1.5 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all overflow-hidden"
                        >
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200 select-none pointer-events-none" />
                          ) : (
                            <span className="text-2xl select-none pointer-events-none">{(item as any).symbol}</span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-bold text-white block text-center truncate leading-tight">{item.name}</span>
                          </div>
                          <span className="absolute top-1 right-1 text-[7px] font-extrabold text-[#9c665c] bg-white/85 px-1 py-0.5 rounded leading-none">${item.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 底紙選擇 */}
          {leftMode === "bases" && (
            <div className="p-3 flex flex-col gap-2">
              {MOCK_BASES.map(b => {
                const isCurrent = selectedBase.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBase(b)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${isCurrent ? "border-[#9c665c] bg-[#9c665c]/5 shadow-sm" : "border-[color:var(--line)] hover:border-[color:var(--muted)]/40 bg-[color:var(--background)]"}`}
                  >
                    <div className="w-8 h-8 rounded-full border border-black/10 shadow-inner shrink-0" style={{ backgroundColor: b.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate">{b.name}</p>
                      <p className="text-[10px] text-[color:var(--muted)] truncate">{b.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#9c665c] shrink-0">${b.price}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 文字刻字 */}
          {leftMode === "text" && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">輸入簡短字句，模擬手工燙金覆膜效果：</p>
              <input
                type="text"
                value={customTextContent}
                onChange={e => setCustomTextContent(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddText()}
                placeholder="例：Happy Birthday"
                className="h-10 rounded-lg border border-[color:var(--line)] bg-[color:var(--background)] px-3 text-xs outline-none focus:ring-2 focus:ring-[#9c665c]/40"
              />
              <Button size="sm" onClick={handleAddText} disabled={!customTextContent.trim()}>
                新增燙金圖層 (+NT$60)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══ 中央：畫布區 (col-span-5) ══ */}
      <div className="lg:col-span-5 flex flex-col items-center justify-end h-full">
        <div className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--background)] px-5 py-8 shadow-sm flex flex-col items-center relative min-h-[640px] mt-auto">
          {/* 背景網格 */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--line)_1px,_transparent_1px)] [background-size:20px_20px] opacity-30 rounded-xl pointer-events-none" />

          {/* 卡片區域與控制列 (共同容器，確保等寬) */}
          <div className="relative w-full max-w-[340px] flex flex-col z-10 shrink-0">
            {/* 1. 卡片本身 */}
            <div
              ref={canvasRef}
              onClick={() => setActiveLayerId(null)}
              onDragOver={handleDragOverCanvas}
              onDrop={handleDropOnCanvas}
              className="w-full aspect-[3/4] rounded-2xl shadow-2xl transition-colors duration-500 relative cursor-default select-none"
              style={{ backgroundColor: selectedBase.color }}
            >
              <div className="absolute inset-3 border border-black/[0.07] dark:border-white/[0.1] rounded-xl pointer-events-none flex flex-col justify-between p-3 z-0">
                <span className="text-[7px] text-black/30 tracking-widest uppercase">Floriography</span>
                <span className="text-[7px] text-black/30 tracking-widest text-right">Studio</span>
              </div>

              {showCenterX && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#9c665c]/60 z-20 pointer-events-none" />}
              {showCenterY && <div className="absolute top-1/2 left-0 right-0 h-px bg-[#9c665c]/60 z-20 pointer-events-none" />}

              {layers.map(layer => {
                const isActive = activeLayerId === layer.id;
                const isDragging = draggingLayerId === layer.id;
                const isTransforming = transformingLayerId === layer.id;
                const currentZ = (isDragging || isTransforming) ? 999 : layer.zIndex;
                return (
                  <div
                    key={layer.id}
                    className={`absolute flex flex-col items-center justify-center select-none ${isDragging || isTransforming ? "transition-none" : "transition-all duration-75"}`}
                    style={{ left: `${layer.x}%`, top: `${layer.y}%`, transform: `translate(-50%,-50%) rotate(${layer.rotation||0}deg) scale(${layer.scale})`, zIndex: currentZ }}
                  >
                    {isActive && <div className="absolute inset-0 bg-[#e6c1a8]/40 blur-2xl rounded-full scale-[1.8] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />}
                    <div
                      className="relative w-full h-full p-2 rounded-xl cursor-grab active:cursor-grabbing flex items-center justify-center"
                      onPointerDown={e => handlePointerDown(e, layer)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onClick={e => e.stopPropagation()}
                    >
                      {isActive && (
                        <>
                          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-[3px] border-[#9c665c] rounded-full cursor-nwse-resize z-50 shadow-sm flex items-center justify-center hover:scale-110 transition-transform" onPointerDown={e => handleScalePointerDown(e, layer)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={e => e.stopPropagation()}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9c665c] pointer-events-none" />
                          </div>
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-[3px] border-[#839b83] rounded-full cursor-crosshair z-50 shadow-sm flex items-center justify-center hover:scale-110 transition-transform" onPointerDown={e => handleRotatePointerDown(e, layer)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={e => e.stopPropagation()}>
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#839b83] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                          </div>
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#9c665c] text-white rounded-full cursor-pointer z-50 shadow-sm flex items-center justify-center hover:scale-110 transition-transform" onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} onPointerDown={e => e.stopPropagation()}>
                            <svg viewBox="0 0 24 24" className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </div>
                        </>
                      )}
                      {layer.type === "text" ? (
                        <p className="font-bold text-xl tracking-widest text-amber-500 drop-shadow-sm whitespace-nowrap pointer-events-none relative z-10">{layer.text}</p>
                      ) : layer.image ? (
                        <img src={layer.image} alt={layer.name} className="w-28 h-28 object-contain filter drop-shadow-lg select-none pointer-events-none relative z-10" />
                      ) : (
                        <span className="text-5xl filter drop-shadow-lg select-none pointer-events-none relative z-10">{layer.symbol}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {layers.length === 0 && (
                <div className="text-center p-6 pointer-events-none opacity-40 z-10 absolute inset-0 flex flex-col items-center justify-center">
                  <svg className="w-10 h-10 mx-auto mb-2 text-[color:var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <p className="text-xs font-semibold">從左側拖曳花材置入</p>
                </div>
              )}
            </div>

            {/* 2. 精確控制列 (緊接在卡片正下方) */}
            <div className={`mt-3 w-full bg-[color:var(--card)] border border-[color:var(--line)] rounded-xl shadow-md px-4 py-3 transition-all duration-300 ${activeLayer ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}`}>
              {activeLayer && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#9c665c] truncate flex-1 tracking-wide">{activeLayer.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => adjustScale(-0.1)} className="w-8 h-8 rounded-lg border bg-[color:var(--background)] hover:bg-[#9c665c]/10 text-sm font-bold flex items-center justify-center">-</button>
                      <span className="text-sm font-mono w-11 text-center">{activeLayer.scale.toFixed(1)}x</span>
                      <button onClick={() => adjustScale(0.1)} className="w-8 h-8 rounded-lg border bg-[color:var(--background)] hover:bg-[#9c665c]/10 text-sm font-bold flex items-center justify-center">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      <button onClick={() => adjustRotation(-15)} className="w-8 h-8 rounded-lg border bg-[color:var(--background)] hover:bg-[#9c665c]/10 text-base flex items-center justify-center">↺</button>
                      <span className="text-sm font-mono w-11 text-center">{activeLayer.rotation||0}°</span>
                      <button onClick={() => adjustRotation(15)} className="w-8 h-8 rounded-lg border bg-[color:var(--background)] hover:bg-[#9c665c]/10 text-base flex items-center justify-center">↻</button>
                    </div>
                    <div className="w-px h-6 bg-[color:var(--line)] shrink-0" />
                    <div className="grid grid-cols-3 gap-1 w-[64px] shrink-0">
                      <div/><button onClick={() => nudgePos("up")} className="h-6 bg-[color:var(--line)]/40 hover:bg-[#9c665c]/20 rounded text-[11px] flex items-center justify-center">▲</button><div/>
                      <button onClick={() => nudgePos("left")} className="h-6 bg-[color:var(--line)]/40 hover:bg-[#9c665c]/20 rounded text-[11px] flex items-center justify-center">◀</button>
                      <button onClick={() => nudgePos("down")} className="h-6 bg-[color:var(--line)]/40 hover:bg-[#9c665c]/20 rounded text-[11px] flex items-center justify-center">▼</button>
                      <button onClick={() => nudgePos("right")} className="h-6 bg-[color:var(--line)]/40 hover:bg-[#9c665c]/20 rounded text-[11px] flex items-center justify-center">▶</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 右側：圖層 + 花語 + 結帳 (col-span-3) ══ */}
      <div className="lg:col-span-3 flex flex-col gap-4">

        {/* 圖層面板 */}
        <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[color:var(--line)] flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-[color:var(--muted)] uppercase">圖層 Layers</span>
            <span className="text-[10px] text-[color:var(--muted)]">{layers.length} 層</span>
          </div>
          <div className="p-3 flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
            {/* 底紙固定層 */}
            <div className="p-2.5 rounded-lg bg-[color:var(--background)] border border-[color:var(--line)] flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: selectedBase.color }} />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-[color:var(--muted)] block">底紙</span>
                <span className="text-[10px] font-bold truncate block">{selectedBase.name}</span>
              </div>
              <span className="text-[10px] font-bold text-[color:var(--muted)]">${selectedBase.price}</span>
            </div>

            {[...layers].sort((a,b) => b.zIndex - a.zIndex).map(l => {
              const isSelected = activeLayerId === l.id;
              const isPanelDragging = panelDraggingLayerId === l.id;
              return (
                <div
                  key={l.id}
                  draggable
                  onDragStart={e => handlePanelDragStart(e, l.id)}
                  onDragOver={handlePanelDragOver}
                  onDrop={e => handlePanelDrop(e, l.id)}
                  onDragEnd={() => setPanelDraggingLayerId(null)}
                  onClick={() => setActiveLayerId(l.id)}
                  className={`p-2 px-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group ${isSelected ? "border-[#9c665c] bg-[#9c665c]/5 text-[#9c665c]" : "border-[color:var(--line)] hover:bg-[color:var(--background)]"} ${isPanelDragging ? "opacity-30 border-dashed" : ""}`}
                >
                  <div className="flex items-center gap-2 truncate pointer-events-none">
                    <div className="w-5 h-5 flex items-center justify-center bg-white/50 dark:bg-black/20 rounded shrink-0">
                      {l.image ? <img src={l.image} alt={l.name} className="w-4 h-4 object-contain" /> : <span className="text-[10px]">{l.symbol || "✍️"}</span>}
                    </div>
                    <span className={`text-[10px] truncate max-w-[70px] ${isSelected ? "font-bold" : "font-medium"}`}>{l.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold">+{l.price}</span>
                    <button onClick={e => { e.stopPropagation(); deleteLayer(l.id); }} className="text-[10px] text-[color:var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">✕</button>
                  </div>
                </div>
              );
            })}

            {layers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 opacity-50">
                <span className="text-xl mb-1">🍃</span>
                <p className="text-[10px] text-center text-[color:var(--muted)]">尚無花材</p>
              </div>
            )}
          </div>
        </div>

        {/* 花語共鳴 */}
        {layers.some(l => l.meaning) && (
          <div className="rounded-xl border border-[#9c665c]/25 bg-[#9c665c]/5 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#9c665c]/15 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#9c665c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
              <span className="text-[11px] font-bold tracking-widest text-[#9c665c] uppercase">花語共鳴</span>
            </div>
            <div className="p-3 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
              {layers.filter(l => l.meaning).map(l => (
                <div key={`meaning-${l.id}`} className="flex flex-col border-b border-[#9c665c]/10 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 flex items-center justify-center bg-[#9c665c]/10 rounded-full shrink-0">
                      {l.image ? <img src={l.image} alt={l.name} className="w-3.5 h-3.5 object-contain" /> : <span className="text-[9px]">{l.symbol}</span>}
                    </div>
                    <span className="text-[11px] font-bold text-[color:var(--foreground)]">{l.name}</span>
                  </div>
                  <p className="text-[10px] text-[color:var(--muted)] leading-relaxed pl-7">{l.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 結帳區 */}
        <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <span className="text-xs text-[color:var(--muted)]">設計總額</span>
            <div className="text-right">
              <span className="text-[10px] text-[#9c665c] font-bold block">TWD</span>
              <span className="text-2xl font-extrabold leading-none">${totalPrice}</span>
            </div>
          </div>
          <Button onClick={handleSaveAndCheckout} className="w-full py-3 text-sm font-bold bg-gradient-to-r from-[#9c665c] to-[#b5846a] hover:opacity-90 transition-opacity border-none text-white shadow-md">
            確認設計，送出委託
          </Button>
        </div>
      </div>

    </div>
  );
}

