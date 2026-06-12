"use client";

import dynamic from "next/dynamic";

const RecommendForm = dynamic(
  () => import("@/components/recommend/RecommendForm").then((mod) => mod.RecommendForm),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-6xl animate-pulse rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 h-[420px]" />
    ),
  }
);

export function RecommendFormWrapper() {
  return <RecommendForm />;
}
