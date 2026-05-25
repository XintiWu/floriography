import { NextResponse } from "next/server";
import { z } from "zod";
import { parseStoryWithRules } from "@/lib/parseStoryRules";

const schema = z.object({
  story: z.string().min(1, "請輸入情境描述"),
});

/** 本機關鍵字規則解析，不呼叫任何 LLM / Ollama API */
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

    const fields = parseStoryWithRules(parsed.data.story.trim());
    return NextResponse.json({ ...fields, engine: "LocalRules" });
  } catch (error) {
    console.error("parse-story error", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
