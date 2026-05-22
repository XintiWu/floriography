"use client";

import { useState } from "react";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

export default function RecognizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
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
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError("無法連線至辨識服務。請確認伺服器已啟動。");
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
              上傳花朵照片，辨識花名並回傳系統推薦結果。
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

            {response ? (
              <div className="rounded-4xl border border-[color:var(--line)] bg-[color:var(--background)] p-5 text-sm text-[color:var(--ink)]">
                <h2 className="mb-4 text-lg font-semibold">辨識結果</h2>
                <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
