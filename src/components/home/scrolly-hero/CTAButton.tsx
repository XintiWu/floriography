"use client";

export function CTAButton() {
  return (
    <button 
      onClick={() => console.log('Start creating card')}
      className="mt-6 px-8 py-3.5 rounded-full bg-[#1a1a18] text-[#fbfaf7] text-sm font-semibold tracking-wider shadow-lg hover:opacity-85 hover:-translate-y-0.5 transition-all duration-300"
    >
      探索情境推薦
    </button>
  );
}
