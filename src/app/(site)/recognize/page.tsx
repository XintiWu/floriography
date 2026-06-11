"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { CardGrid } from "@/components/cards/CardGrid";

export default function RecognizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "generating" | "done">("idle");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const STORAGE_KEY = "floriography_recognize_response_v1";

  // Restore saved recognition result (if any)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setResponse(parsed);
          setPhase("done");
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist recognition result to localStorage
  useEffect(() => {
    try {
      if (response) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [response]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setResponse(null);
    setError(null);
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      console.error(err);
      setError("無法啟用相機，請確認您的裝置和權限設定。");
    }
  };

  const stopCamera = () => {
    setCameraOn(false);
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        // @ts-ignore
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
  };

  const capturePhoto = async () => {
    setError(null);
    try {
      const video = videoRef.current;
      if (!video) return;
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("無法取得畫布上下文");
      ctx.drawImage(video, 0, 0, w, h);
      const blob: Blob | null = await new Promise((resolve) => canvas!.toBlob((b) => resolve(b), "image/jpeg", 0.92));
      if (!blob) throw new Error("無法產生相片檔案");
      const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(capturedFile);
      stopCamera();
    } catch (err) {
      console.error(err);
      setError("拍照失敗，請再試一次。");
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // ignore play promise rejection
      });
    }
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recommendedCards = useMemo(() => {
    return response?.recommendations?.map((r: any) => r.card) ?? [];
  }, [response]);

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
        if (data?.error === "geminiserverbusy" || data?.error === "GeminiServerBusy") {
          setError("Gemini現在很忙，等等再試吧！");
        } else if (data?.error === "api_key_missing") {
          setError("請先在伺服器上設定 GEMINI_API_KEY 環境變數以啟用花朵辨識服務。");
        } else if (data?.error === "invalid_response") {
          setError("無法解析辨識服務的回傳結果。");
        } else if (data?.error === "api_error") {
          setError("呼叫辨識服務時發生錯誤。");
        } else if (data?.error === "internal_error") {
          setError("伺服器發生內部錯誤，請稍後再試。");
        } else {
          setError(data?.message || data?.error || "辨識失敗，請稍後再試。");
        }
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

  const clearSavedResult = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    setResponse(null);
    setPhase("idle");
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

            <div>
              <label className="block text-sm font-semibold text-[color:var(--ink)] mb-2">或使用相機</label>
              {!cameraOn ? (
                <div>
                  <Button
                    onClick={startCamera}
                    variant="ghost"
                    className="w-full rounded-3xl border border-[color:var(--line)] bg-[color:var(--background)] px-4 py-3 text-sm text-[color:var(--ink)] font-normal tracking-normal justify-start"
                  >
                    開啟相機
                  </Button>
                  <div className="mt-2 text-sm text-[color:var(--muted)]"></div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-black">
                    <video
                      ref={videoRef}
                      className="w-full h-auto max-h-[480px] object-cover"
                      playsInline
                      muted
                      autoPlay
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={capturePhoto}>拍照</Button>
                    <Button onClick={stopCamera} variant="ghost">取消</Button>
                    <span className="text-sm text-[color:var(--muted)]">預覽相機畫面，點擊「拍照」取得影像。</span>
                  </div>
                </div>
              )}
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
                <div className="mb-6 relative">
                  {phase === "done" && response ? (
                    <div className="absolute right-0 top-0">
                      <Button variant="ghost" onClick={clearSavedResult} className="text-sm">
                        清除
                      </Button>
                    </div>
                  ) : null}
                  <h2 className="text-lg font-semibold">辨識結果</h2>
                  <p className="mt-2 text-2xl font-bold text-[color:var(--accent)]">
                    {phase === "generating"
                      ? "辨識中..."
                      : response?.recognizedName || "未辨識出花種"}
                  </p>
                  {response?.message ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{response.message}</p>
                  ) : null}
                  {response?.recognizedName && !response?.matchedFlower && phase !== "generating" ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      {response.recognizedName === "圖片不含花朵，隨機推薦"
                        ? ""
                        : `我們目前沒有提供包含「${response.recognizedName}」的花卡，以下為隨機推薦之花卡。`
                      }
                    </p>
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
                      <CardGrid cards={recommendedCards} />
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