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
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#faf8f5] text-[#4a423e] font-[family-name:var(--font-body)] antialiased overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #dcd8d1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #c5c0b8; }
      `}} />

      {/* 頂部工具列 */}
      <div className="h-[56px] border-b border-[#e3dfd8] bg-[#fdfdfc] flex items-center justify-between px-5 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="w-9 h-9 flex items-center justify-center rounded hover:bg-[#f2efe9] text-[#8a7b72] hover:text-[#5c4d44] transition-colors" title="返回首頁">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="h-5 w-px bg-[#e3dfd8]" />
          <span className="text-sm font-[family-name:var(--font-display)] font-bold tracking-widest text-[#5c4d44] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#9c665c]" />
            FLORIOGRAPHY <span className="text-[#a8a098] font-sans font-normal tracking-[0.2em] ml-1">STUDIO</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#a8a098] font-sans tracking-widest">{layers.length} 層物件</span>
          <div className="h-5 w-px bg-[#e3dfd8]" />
          <span className="text-sm font-sans font-bold text-[#5c4d44] mr-2">NT$ {totalPrice}</span>
          <button onClick={handleSaveAndCheckout} className="text-sm font-bold px-6 py-2 rounded-md bg-[#9c665c] text-white hover:bg-[#86564e] transition-all flex items-center gap-2 shadow-sm">
            <span>完成設計</span>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* 工作區主體 */}
      <div className="flex-1 flex overflow-hidden">
        {/* ══ 左側：素材庫面板 (w-[320px]) ══ */}
        <div className="w-[320px] flex flex-col bg-[#fdfdfc] border-r border-[#e3dfd8] shrink-0 z-10 shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
          {/* 模式切換 Tab */}
          <div className="flex border-b border-[#e3dfd8] shrink-0 p-2 gap-1.5 bg-[#f7f5f0]">
            {([["flowers","花材"],["bases","底紙"],["text","文字"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setLeftMode(mode)}
                className={`flex-1 py-2 text-sm font-bold tracking-widest rounded-md transition-all ${leftMode === mode ? "bg-white text-[#9c665c] shadow-sm border border-[#e3dfd8]/50" : "text-[#8a7b72] hover:text-[#5c4d44] hover:bg-[#f2efe9]/50"}`}
              >{label}</button>
            ))}
          </div>

          {/* 花材：手風琴分類 */}
          {leftMode === "flowers" && (
            <div className="divide-y divide-[#e3dfd8]/50 overflow-y-auto flex-1 custom-scrollbar">
              {FLOWER_CATEGORIES.map(cat => (
                <div key={cat.id}>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#f2efe9]/50 transition-colors group"
                  >
                    <span className="flex items-center gap-3 text-sm font-bold text-[#5c4d44] group-hover:text-[#4a423e] transition-colors">
                      <span className="text-lg opacity-90">{cat.emoji}</span>{cat.label}
                      <span className="text-xs font-sans text-[#8a7b72] bg-[#f2efe9] px-2 py-0.5 rounded-full">{cat.items.length}</span>
                    </span>
                    <svg className={`w-4 h-4 text-[#a8a098] transition-transform duration-200 ${expandedCategories.has(cat.id) ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                  </button>

                  {expandedCategories.has(cat.id) && (
                    <div className="grid grid-cols-2 gap-3 px-4 pb-5 pt-1">
                      {cat.items.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={e => handleDragStartNewItem(e, { ...item, type: cat.id === "tree" ? "accent" : "flower" })}
                          onClick={() => addLayer({ ...item, type: cat.id === "tree" ? "accent" : "flower" })}
                          className="group relative aspect-square rounded-lg border border-[#e3dfd8] bg-white hover:border-[#9c665c]/40 hover:bg-[#faf8f5] p-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all overflow-hidden shadow-sm"
                        >
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="flex-1 w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none mb-1.5" />
                          ) : (
                            <span className="text-4xl flex-1 flex items-center select-none pointer-events-none mb-1.5">{(item as any).symbol}</span>
                          )}
                          <span className="text-xs font-bold text-[#8a7b72] group-hover:text-[#5c4d44] truncate w-full text-center tracking-wide">{item.name}</span>
                          <span className="absolute top-2 right-2 text-[10px] font-sans font-bold text-[#9c665c] bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-[#e3dfd8]/50 shadow-sm">${item.price}</span>
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
            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
              {MOCK_BASES.map(b => {
                const isCurrent = selectedBase.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBase(b)}
                    className={`w-full p-4 rounded-lg border text-left transition-all flex items-center gap-4 ${isCurrent ? "border-[#9c665c] bg-[#faf8f5] shadow-sm" : "border-[#e3dfd8] hover:border-[#c5c0b8] bg-white"}`}
                  >
                    <div className="w-10 h-10 rounded-md border border-black/10 shadow-inner shrink-0" style={{ backgroundColor: b.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#4a423e] truncate tracking-wide">{b.name}</p>
                      <p className="text-xs text-[#8a7b72] truncate mt-1">{b.desc}</p>
                    </div>
                    <span className="text-sm font-sans font-bold text-[#9c665c] shrink-0">${b.price}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 文字刻字 */}
          {leftMode === "text" && (
            <div className="p-5 flex flex-col gap-4 flex-1 bg-[#fdfdfc]">
              <p className="text-sm text-[#8a7b72] leading-relaxed tracking-wide">輸入簡短字句，模擬手工燙金覆膜效果：</p>
              <input
                type="text"
                value={customTextContent}
                onChange={e => setCustomTextContent(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddText()}
                placeholder="例：Happy Birthday"
                className="h-11 rounded-md border border-[#e3dfd8] bg-white px-4 text-sm text-[#5c4d44] outline-none focus:border-[#9c665c] focus:ring-1 focus:ring-[#9c665c]/20 transition-all shadow-sm font-sans"
              />
              <button onClick={handleAddText} disabled={!customTextContent.trim()} className="h-10 rounded-md bg-[#f2efe9] border border-[#e3dfd8] hover:bg-[#e3dfd8] disabled:opacity-50 disabled:hover:bg-[#f2efe9] text-sm font-bold tracking-wide text-[#5c4d44] transition-colors shadow-sm">
                新增燙金圖層 (+NT$60)
              </button>
            </div>
          )}
        </div>

        {/* ══ 中央：畫布區 (flex-1) ══ */}
        <div className="flex-1 flex flex-col h-full bg-[#f2efe9] relative overflow-hidden">
          {/* 頂部快速工具列 */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 backdrop-blur border border-[#e3dfd8] rounded-lg p-1.5 z-20 shadow-sm">
             <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f2efe9] text-[#8a7b72] hover:text-[#5c4d44] transition-colors" title="復原 (Undo)"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 015 5v2M3 10l5 5M3 10l5-5"/></svg></button>
             <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f2efe9] text-[#8a7b72] hover:text-[#5c4d44] transition-colors" title="重做 (Redo)"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H11a5 5 0 00-5 5v2M21 10l-5 5M21 10l-5-5"/></svg></button>
             <div className="w-px h-5 bg-[#e3dfd8] mx-1.5" />
             <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#f2efe9] text-[#8a7b72] hover:text-[#5c4d44] transition-colors" title="置中對齊" onClick={() => updateActiveLayer({x: 50, y: 50})}><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg></button>
          </div>

          <div className="w-full h-full p-6 sm:p-10 flex flex-col items-center justify-center relative min-h-[640px]">
            {/* 背景網格 - 細緻的手作點陣 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#dcd8d1_1px,_transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

            {/* 卡片區域與控制列 (共同容器) */}
            <div className="relative w-full max-w-[420px] flex flex-col z-10 shrink-0">
              {/* 1. 卡片本身 */}
              <div
                ref={canvasRef}
                onClick={() => setActiveLayerId(null)}
                onDragOver={handleDragOverCanvas}
                onDrop={handleDropOnCanvas}
                className="w-full aspect-[3/4] shadow-[0_15px_40px_rgba(100,90,80,0.15)] transition-colors duration-500 relative cursor-default select-none border border-black/5 rounded-sm"
                style={{ backgroundColor: selectedBase.color }}
              >
                <div className="absolute inset-5 border border-black/[0.04] pointer-events-none flex flex-col justify-between p-4 z-0">
                  <span className="text-[9px] text-[#8a7b72]/60 tracking-[0.25em] uppercase font-bold font-sans">Floriography</span>
                  <span className="text-[9px] text-[#8a7b72]/60 tracking-[0.25em] text-right font-sans">CRAFT STUDIO</span>
                </div>

                {showCenterX && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#9c665c] z-20 pointer-events-none opacity-40" />}
                {showCenterY && <div className="absolute top-1/2 left-0 right-0 h-px bg-[#9c665c] z-20 pointer-events-none opacity-40" />}

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
                      <div
                        className={`relative w-full h-full p-2.5 cursor-grab active:cursor-grabbing flex items-center justify-center ${isActive ? "ring-1 ring-[#9c665c]/60 ring-offset-2 ring-offset-transparent bg-black/5 rounded-sm" : ""}`}
                        onPointerDown={e => handlePointerDown(e, layer)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onClick={e => e.stopPropagation()}
                      >
                        {isActive && (
                          <>
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border border-[#9c665c] rounded-sm cursor-nwse-resize z-50 shadow-sm" onPointerDown={e => handleScalePointerDown(e, layer)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={e => e.stopPropagation()} />
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-[#9c665c] rounded-full cursor-crosshair z-50 shadow-sm flex items-center justify-center" onPointerDown={e => handleRotatePointerDown(e, layer)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={e => e.stopPropagation()}>
                              <div className="w-1.5 h-1.5 bg-[#9c665c] rounded-full pointer-events-none"/>
                            </div>
                          </>
                        )}
                        {layer.type === "text" ? (
                          <p className="font-[family-name:var(--font-display)] font-bold text-2xl tracking-widest text-[#d4af37] drop-shadow-sm whitespace-nowrap pointer-events-none relative z-10" style={{ textShadow: "0 1px 1px rgba(0,0,0,0.15)" }}>{layer.text}</p>
                        ) : layer.image ? (
                          <img src={layer.image} alt={layer.name} className="w-32 h-32 object-contain filter drop-shadow-md select-none pointer-events-none relative z-10" />
                        ) : (
                          <span className="text-6xl filter drop-shadow-md select-none pointer-events-none relative z-10">{layer.symbol}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {layers.length === 0 && (
                  <div className="text-center p-8 pointer-events-none opacity-40 z-10 absolute inset-0 flex flex-col items-center justify-center">
                    <svg className="w-10 h-10 mx-auto mb-3 text-[#8a7b72]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <p className="text-xs font-sans tracking-widest uppercase text-[#5c4d44] font-bold">Drop floral assets</p>
                  </div>
                )}
              </div>

              {/* 2. 精確控制列 (緊接在卡片正下方) */}
              <div className={`mt-5 w-full bg-white/95 border border-[#e3dfd8] rounded-lg shadow-lg p-4 transition-all duration-300 backdrop-blur-md ${activeLayer ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                {(() => {
                  const displayLayer = activeLayer || layers[0] || { name: "Placeholder", scale: 1, rotation: 0 };
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-[#5c4d44] truncate flex-1 tracking-wider">{displayLayer.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 bg-[#f7f5f0] rounded-md p-1 border border-[#e3dfd8]">
                          <button onClick={() => adjustScale(-0.1)} className="w-7 h-7 rounded hover:bg-white hover:shadow-sm text-sm font-bold flex items-center justify-center text-[#5c4d44]">-</button>
                          <span className="text-xs font-sans font-bold w-10 text-center text-[#8a7b72]">{Number(displayLayer.scale).toFixed(1)}x</span>
                          <button onClick={() => adjustScale(0.1)} className="w-7 h-7 rounded hover:bg-white hover:shadow-sm text-sm font-bold flex items-center justify-center text-[#5c4d44]">+</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 flex-1 bg-[#f7f5f0] rounded-md p-1 border border-[#e3dfd8]">
                          <button onClick={() => adjustRotation(-15)} className="w-7 h-7 rounded hover:bg-white hover:shadow-sm text-sm flex items-center justify-center text-[#5c4d44]">↺</button>
                          <span className="text-xs font-sans font-bold flex-1 text-center text-[#8a7b72]">{displayLayer.rotation||0}°</span>
                          <button onClick={() => adjustRotation(15)} className="w-7 h-7 rounded hover:bg-white hover:shadow-sm text-sm flex items-center justify-center text-[#5c4d44]">↻</button>
                        </div>
                        <div className="w-px h-6 bg-[#e3dfd8] shrink-0" />
                        <div className="flex items-center gap-1">
                          <button onClick={() => bringToFront()} className="h-9 px-3 bg-[#f7f5f0] border border-[#e3dfd8] hover:bg-white hover:shadow-sm rounded-md text-xs font-bold text-[#8a7b72] hover:text-[#5c4d44]" title="移至最前">↑</button>
                          <button onClick={() => sendToBack()} className="h-9 px-3 bg-[#f7f5f0] border border-[#e3dfd8] hover:bg-white hover:shadow-sm rounded-md text-xs font-bold text-[#8a7b72] hover:text-[#5c4d44]" title="移至最後">↓</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ══ 右側：屬性與圖層面板 (w-[320px]) ══ */}
        <div className="w-[320px] flex flex-col bg-[#fdfdfc] border-l border-[#e3dfd8] shrink-0 z-10 shadow-[-2px_0_12px_rgba(0,0,0,0.02)]">

          {/* 圖層面板 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-[#e3dfd8] flex items-center justify-between shrink-0 bg-[#f7f5f0]">
              <span className="text-xs font-sans font-bold tracking-widest text-[#8a7b72] uppercase">Layers</span>
              <button className="text-[#a8a098] hover:text-[#5c4d44]"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4"/></svg></button>
            </div>
            <div className="p-3 flex flex-col gap-1.5 overflow-y-auto flex-1 custom-scrollbar">
              {/* 底紙固定層 */}
              <div className="p-3 rounded-lg bg-[#fdfdfc] border border-[#e3dfd8] flex items-center gap-3 shadow-sm">
                <div className="w-4 h-4 rounded-sm border border-black/10 shrink-0" style={{ backgroundColor: selectedBase.color }} />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-[#5c4d44] truncate block tracking-wide">{selectedBase.name}</span>
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#a8a098] shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
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
                    className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors flex items-center justify-between group ${isSelected ? "border-[#9c665c]/40 bg-[#faf8f5] shadow-sm" : "border-transparent hover:bg-[#f2efe9]"} ${isPanelDragging ? "opacity-30 border-dashed border-[#a8a098]" : ""}`}
                  >
                    <div className="flex items-center gap-3 truncate pointer-events-none">
                      <div className="w-5 h-5 flex items-center justify-center bg-black/5 rounded-sm shrink-0">
                        {l.image ? <img src={l.image} alt={l.name} className="w-4 h-4 object-contain" /> : <span className="text-[10px]">{l.symbol || "T"}</span>}
                      </div>
                      <span className={`text-xs tracking-wide truncate max-w-[140px] ${isSelected ? "font-bold text-[#9c665c]" : "font-medium text-[#5c4d44]"}`}>{l.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-sans font-bold ${isSelected ? "text-[#9c665c]" : "text-[#a8a098]"}`}>+{l.price}</span>
                      <button onClick={e => { e.stopPropagation(); deleteLayer(l.id); }} className="text-[#a8a098] hover:text-[#9c665c] opacity-0 group-hover:opacity-100 transition-opacity"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 花語解析面板 (取代原本的 Inspector) */}
          <div className="border-t border-[#e3dfd8] bg-[#fdfdfc] flex flex-col shrink-0 h-[280px]">
            <div className="px-5 py-3 border-b border-[#e3dfd8] flex items-center gap-2 shrink-0 bg-[#f7f5f0]">
              <span className="text-xs font-sans font-bold tracking-widest text-[#8a7b72] uppercase">花語解析</span>
            </div>
            {activeLayer ? (
              <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full">
                {activeLayer.type === "flower" || activeLayer.type === "accent" ? (
                  activeLayer.meaning ? (
                    <div className="flex flex-col gap-3 h-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{activeLayer.symbol || "🌸"}</span>
                        <h4 className="text-sm font-bold text-[#5c4d44]">{activeLayer.name}</h4>
                      </div>
                      <div className="w-6 h-px bg-[#e3dfd8] mb-1" />
                      <p className="text-sm text-[#8a7b72] leading-relaxed tracking-wide whitespace-pre-line flex-1">
                        {activeLayer.meaning}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#a8a098]">
                      <span className="text-2xl mb-2">{activeLayer.symbol || "🌿"}</span>
                      <p className="text-xs tracking-wide">目前此花材沒有特別紀錄的花語。</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#a8a098]">
                    <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p className="text-xs tracking-wide">{activeLayer.type === "text" ? "自訂刻字圖層" : "非花材物件"}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#a8a098]">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                 <span className="text-xs font-sans tracking-wide">點擊花材，探索背後的故事</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

