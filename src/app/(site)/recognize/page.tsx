"use client";

import { useState } from "react";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { CardGrid } from "@/components/cards/CardGrid";

export default function RecognizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "generating" | "done">("idle");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setResponse(null);
    setError(null);
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("請先選擇一張花朵照片。 ");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setPhase("generating");

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/recognize", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "辨識失敗，請稍後再試。");
        setPhase("idle");
      } else {
        setResponse(data);
        const delay = 900; // ms for generation animation
        setTimeout(() => {
          setPhase("done");
        }, delay);
      }
    } catch (err) {
      setError("無法連線至辨識服務。請確認伺服器已啟動。");
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1">
      <div className="relative overflow-hidden border-b border-[color:var(--line)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color:var(--accent-2)]/14 blur-3xl" />
          <div className="absolute -right-28 -top-20 h-72 w-72 rounded-full bg-[color:var(--accent)]/12 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[color:var(--background)]" />
        </div>

        <Container className="py-12 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/70 px-3 py-1 text-[11px] font-semibold tracking-[0.26em] text-[color:var(--muted)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-2)]" />
            RECOGNIZE
          </div>

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] sm:text-5xl">
            花朵辨識與推薦
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-px w-14 bg-[color:var(--accent-2)]/70" />
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              在路上看到漂亮的花？隨手拍下它，立刻幫你找出包含它的花卡商品！
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="rounded-4xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm sm:p-10">
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--ink)] mb-2">
                上傳照片
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full rounded-3xl border border-[color:var(--line)] bg-[color:var(--background)] px-4 py-3 text-sm text-[color:var(--ink)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "辨識中..." : "執行辨識"}
              </Button>
              {file ? (
                <span className="text-sm text-[color:var(--muted)]">
                  已選擇：{file.name}
                </span>
              ) : (
                <span className="text-sm text-[color:var(--muted)]">尚未選擇檔案</span>
              )}
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {(phase !== "idle") ? (
              <div className="rounded-4xl border border-[color:var(--line)] bg-[color:var(--background)] p-5 text-sm text-[color:var(--ink)]">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">辨識結果</h2>
                  <p className="mt-2 text-2xl font-bold text-[color:var(--accent)]">
                    {phase === "generating"
                      ? "辨識中..."
                      : response?.recognizedName || "未辨識出花種"}
                  </p>
                  {response?.message ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{response.message}</p>
                  ) : null}
                </div>

                {phase === "generating" ? (
                  <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                    <div className="relative overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_45%)] opacity-80" />
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.08)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-scan-stripes" />
                      <div className="relative flex min-h-[260px] flex-col justify-center gap-4">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--accent)]/15 shadow-[0_18px_60px_-35px_rgba(169,168,149,0.8)]">
                          <div className="h-12 w-12 rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/20 blur-[0.5px]" />
                        </div>
                        <div className="space-y-3 text-center">
                          <p className="text-lg font-semibold text-[color:var(--ink)]">正在辨識花朵與搜尋花卡...</p>
                          {/* <p className="text-sm text-[color:var(--muted)]">請稍候，系統正在分析花朵特徵並準備推薦卡片。</p> */}
                        </div>
                      </div>
                      <div className="pointer-events-none absolute -left-10 top-12 h-24 w-24 rounded-full bg-[color:var(--accent-2)]/10 blur-3xl animate-float" />
                      <div
                        className="pointer-events-none absolute right-4 bottom-14 h-20 w-20 rounded-full bg-[color:var(--accent)]/10 blur-3xl animate-float"
                        style={{ animationDelay: "1.5s" }}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--card)] p-5 shadow-sm">
                          <div className="h-36 rounded-[1.5rem] bg-gradient-to-br from-[color:var(--accent)]/10 via-transparent to-[color:var(--accent-2)]/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
                          <div className="mt-4 h-4 w-3/4 rounded-full bg-[color:var(--muted)]/15" />
                          <div className="mt-3 h-3 w-1/2 rounded-full bg-[color:var(--muted)]/10" />
                          <div className="mt-3 flex gap-2">
                            <span className="h-8 w-16 rounded-full bg-[color:var(--muted)]/10" />
                            <span className="h-8 w-12 rounded-full bg-[color:var(--muted)]/10" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {Array.isArray(response?.recommendations) && response.recommendations.length > 0 ? (
                      <CardGrid cards={response.recommendations.map((r: any) => r.card)} />
                    ) : (
                      <div className="text-sm text-[color:var(--muted)]">目前沒有推薦項目。</div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
