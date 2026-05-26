import { NextResponse } from "next/server";
import { z } from "zod";
import { createRecommendLlm } from "@/lib/llmProvider";
import {
  LlmParseError,
  LlmUnavailableError,
  parseStoryWithOllama,
} from "@/lib/recommendOllama";

const schema = z.object({
  story: z.string().min(1, "請輸入情境描述"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const llm = createRecommendLlm();
    const fields = await parseStoryWithOllama(parsed.data.story.trim(), llm);
    return NextResponse.json({ ...fields, engine: llm.getEngineLabel() });
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return NextResponse.json(
        { error: "llm_unavailable", message: error.message },
        { status: 503 }
      );
    }
    if (error instanceof LlmParseError) {
      return NextResponse.json(
        { error: "llm_parse_failed", message: error.message },
        { status: 502 }
      );
    }
    console.error("parse-story error", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
