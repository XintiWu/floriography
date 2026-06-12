import { LlmParseError, LlmUnavailableError } from "@/lib/llmErrors";

export type RecommendLlmProvider = "auto" | "gemini" | "ollama";

const CHAT_TIMEOUT_MS = 120_000;

export type RecommendLlm = {
  chat: (
    system: string,
    user: string,
    options?: { maxOutputTokens?: number; thinkingBudget?: number }
  ) => Promise<string>;
  getEngineLabel: () => string;
  ready: () => Promise<void>;
};

function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getRecommendLlmProvider(): RecommendLlmProvider {
  const raw = process.env.RECOMMEND_LLM_PROVIDER?.trim().toLowerCase();
  if (raw === "gemini" || raw === "ollama" || raw === "auto") {
    return raw;
  }
  return "auto";
}

export function getGeminiRecommendModel(): string {
  return process.env.GEMINI_RECOMMEND_MODEL?.trim() || "gemini-2.5-flash";
}

function shouldFallbackToOllama(error: unknown): boolean {
  return error instanceof LlmUnavailableError;
}

async function geminiChat(
  system: string,
  user: string,
  options: { maxOutputTokens?: number; thinkingBudget?: number } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new LlmUnavailableError(
      "未設定 GEMINI_API_KEY。請至 Google AI Studio 建立 API 金鑰並寫入 .env.local。"
    );
  }

  const model = getGeminiRecommendModel();
  // Gemini 2.5 系列是思考模型（Thinking Model），思考 token 計入 maxOutputTokens 配額。
  // 預設限制思考預算為 1024，避免大量思考 token 擠壓實際輸出空間。
  const thinkingBudget = options.thinkingBudget ?? 1024;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
          maxOutputTokens: options.maxOutputTokens ?? 1024,
          thinkingConfig: { thinkingBudget },
        },
      }),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    }
  ).catch(() => null);

  if (!res) {
    throw new LlmUnavailableError(
      `無法連線 Gemini API（${model}）。請檢查網路或稍後再試。`
    );
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    if (res.status === 429 || res.status >= 500) {
      throw new LlmUnavailableError(
        `Gemini 服務忙碌或暫時不可用（HTTP ${res.status}）。`
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new LlmUnavailableError(
        "Gemini API 金鑰無效或未啟用 Generative Language API。請至 AI Studio 重新建立金鑰。"
      );
    }
    console.warn("Gemini recommend error:", res.status, errBody.slice(0, 400));
    throw new LlmUnavailableError(`Gemini 請求失敗（HTTP ${res.status}）。`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    const blockReason = data?.candidates?.[0]?.finishReason;
    console.log(
      "[Gemini] 未取得文字內容，完整回應：",
      JSON.stringify(data).slice(0, 600)
    );
    throw new LlmParseError(
      blockReason
        ? `Gemini 未回傳內容（${blockReason}）`
        : "Gemini 回傳內容為空"
    );
  }
  console.log(
    `[Gemini] model=${getGeminiRecommendModel()}`,
    `finishReason=${data?.candidates?.[0]?.finishReason ?? "?"}`,
    `len=${text.length}`,
    `preview=${JSON.stringify(text.slice(0, 200))}`
  );
  return text;
}

function getOllamaHost(): string {
  return process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
}

let resolvedOllamaModel: string | null = null;

export async function resolveOllamaModel(): Promise<string> {
  if (process.env.OLLAMA_MODEL?.trim()) {
    return process.env.OLLAMA_MODEL.trim();
  }
  if (resolvedOllamaModel) return resolvedOllamaModel;

  const host = getOllamaHost();
  const tagsRes = await fetch(`${host}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (!tagsRes?.ok) {
    throw new LlmUnavailableError(
      `無法連線 Ollama（${host}）。請執行 ollama serve 並確認已 pull 模型。`
    );
  }

  const tagsData = await tagsRes.json();
  const installed: string[] =
    tagsData?.models?.map((m: { name: string }) => m.name) ?? [];

  if (installed.length === 0) {
    throw new LlmUnavailableError(
      "Ollama 未安裝任何模型，請先執行 ollama pull llama3.2:3b"
    );
  }

  resolvedOllamaModel =
    installed.find((n) => n === "llama3.2:3b" || n.startsWith("llama3.2:3b")) ||
    installed.find((n) => n.startsWith("llama3.2")) ||
    installed.find((n) => n.includes("gemma2")) ||
    installed.find((n) => n.includes("qwen2.5")) ||
    installed.find((n) => n.includes("gemma")) ||
    installed[0];

  return resolvedOllamaModel;
}

export async function assertOllamaAvailable(): Promise<string> {
  const host = getOllamaHost();
  const tagsRes = await fetch(`${host}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (!tagsRes?.ok) {
    resolvedOllamaModel = null;
    throw new LlmUnavailableError(
      `無法連線 Ollama（${host}）。請執行 ollama serve 並確認已 pull 模型。`
    );
  }

  return resolveOllamaModel();
}

async function ollamaChat(
  system: string,
  user: string,
  model: string,
  options: { maxOutputTokens?: number } = {}
): Promise<string> {
  const host = getOllamaHost();
  
  const runChat = async (useJsonFormat: boolean) => {
    const res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(useJsonFormat ? { format: "json" } : {}),
        stream: false,
        options: {
          temperature: 0.35,
          ...(options.maxOutputTokens != null
            ? { num_predict: options.maxOutputTokens }
            : {}),
        },
      }),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    }).catch(() => null);

    if (!res?.ok) {
      throw new LlmUnavailableError(
        `Ollama 請求失敗（${res?.status ?? "無回應"}）。請確認 ollama serve 正在運行。`
      );
    }

    const data = await res.json();
    const content = data?.message?.content;
    console.log(
      `[Ollama${useJsonFormat ? " JSON" : " free"}] model=${model}`,
      `stop_reason=${data?.message?.stop_reason ?? data?.done_reason ?? "?"}`,
      `len=${typeof content === "string" ? content.length : "N/A"}`,
      `preview=${typeof content === "string" ? JSON.stringify(content.slice(0, 300)) : content}`
    );
    return content;
  };

  let text = await runChat(true);

  // If Ollama returned empty or functionally empty JSON, retry without forcing JSON format constraint
  if (!text || typeof text !== "string" || text.trim() === "" || text.trim() === "{}") {
    console.warn("[Ollama] JSON format 回傳空內容，改用 free-text 重試...");
    try {
      text = await runChat(false);
    } catch (err) {
      console.warn("[Ollama] free-text 重試也失敗:", err);
    }
  }

  if (!text || typeof text !== "string" || text.trim() === "") {
    throw new LlmParseError("Ollama 回傳內容為空");
  }
  return text;
}

/** 建立單次 API 請求共用的 LLM 連線（Gemini 優先，auto 時失敗改 Ollama） */
export function createRecommendLlm(): RecommendLlm {
  let active: "gemini" | "ollama" | null = null;
  let modelName = "";

  async function ensureBackend(): Promise<void> {
    if (active) return;

    const pref = getRecommendLlmProvider();

    if (pref === "ollama") {
      active = "ollama";
      modelName = await assertOllamaAvailable();
      return;
    }

    if (pref === "gemini") {
      if (!hasGeminiKey()) {
        throw new LlmUnavailableError(
          "RECOMMEND_LLM_PROVIDER=gemini 但未設定 GEMINI_API_KEY。"
        );
      }
      active = "gemini";
      modelName = getGeminiRecommendModel();
      return;
    }

    // auto
    if (hasGeminiKey()) {
      active = "gemini";
      modelName = getGeminiRecommendModel();
      return;
    }

    active = "ollama";
    modelName = await assertOllamaAvailable();
  }

  async function chat(
    system: string,
    user: string,
    options?: { maxOutputTokens?: number; thinkingBudget?: number }
  ): Promise<string> {
    await ensureBackend();

    try {
      if (active === "gemini") {
        return await geminiChat(system, user, options);
      }
      return await ollamaChat(system, user, modelName, options);
    } catch (error) {
      const pref = getRecommendLlmProvider();
      if (
        active === "gemini" &&
        pref === "auto" &&
        shouldFallbackToOllama(error)
      ) {
        console.warn(
          "Gemini unavailable, falling back to Ollama:",
          error instanceof Error ? error.message : error
        );
        active = "ollama";
        modelName = await assertOllamaAvailable();
        return await ollamaChat(system, user, modelName, options);
      }
      throw error;
    }
  }

  return {
    chat,
    getEngineLabel: () =>
      `${active === "gemini" ? "Gemini" : "Ollama"}(${modelName || "…"})`,
    ready: ensureBackend,
  };
}

/** 啟動前檢查：至少有一種後端可用（與 createRecommendLlm 邏輯一致） */
export async function assertLlmAvailable(): Promise<string> {
  const llm = createRecommendLlm();
  await llm.ready();
  return llm.getEngineLabel();
}
