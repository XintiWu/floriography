/**
 * 送禮情境 → 欄位解析單元測試（規則引擎，毫秒級）
 * npx tsx scripts/test-parse-story-fields.ts
 * npx tsx scripts/test-parse-story-fields.ts --only F1,F2
 */
import {
  coerceFieldsFromStory,
  parseStoryWithRules,
  sanitizeParsedFields,
} from "../src/lib/parseStoryRules";
import {
  getStoryFieldFixtures,
  type StoryFieldExpectation,
} from "../src/data/storyFieldFixtures";

function parseOnlyArg(): string[] | undefined {
  const idx = process.argv.indexOf("--only");
  if (idx < 0 || !process.argv[idx + 1]) return undefined;
  return process.argv[idx + 1].split(",").map((s) => s.trim());
}

/** 模擬 Ollama 常見漏填／幻覺 */
function simulateMergedFields(story: string) {
  const llmEmpty = sanitizeParsedFields({});
  const llmHallucinate = sanitizeParsedFields({
    recipient: "朋友",
    mood: "思念",
    occasion: "加油",
  });
  return {
    rulesOnly: parseStoryWithRules(story),
    afterCoerceEmpty: coerceFieldsFromStory(story, llmEmpty),
    afterCoerceHallucinate: coerceFieldsFromStory(story, llmHallucinate),
  };
}

function checkPartial(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  label: string
): string[] {
  const errs: string[] = [];
  for (const [k, v] of Object.entries(expected)) {
    const a = actual[k];
    if (v === undefined) continue;
    if (a !== v) {
      errs.push(`${label}: ${k} 期望「${v}」實際「${a ?? ""}」`);
    }
  }
  return errs;
}

function runFixture(f: StoryFieldExpectation): {
  id: string;
  ok: boolean;
  errors: string[];
} {
  const { rulesOnly, afterCoerceEmpty, afterCoerceHallucinate } =
    simulateMergedFields(f.story);
  const errors: string[] = [];

  errors.push(...checkPartial(rulesOnly as Record<string, unknown>, f.must, "rules"));
  errors.push(
    ...checkPartial(
      afterCoerceEmpty as Record<string, unknown>,
      f.must,
      "coerce(empty LLM)"
    )
  );
  errors.push(
    ...checkPartial(
      afterCoerceHallucinate as Record<string, unknown>,
      f.must,
      "coerce(hallucinate)"
    )
  );

  if (f.should) {
    for (const [k, v] of Object.entries(f.should)) {
      const a = afterCoerceEmpty[k as keyof typeof afterCoerceEmpty];
      if (v && a !== v) {
        errors.push(`should: ${k} 期望「${v}」實際「${a ?? ""}」`);
      }
    }
  }

  return { id: f.id, ok: errors.length === 0, errors };
}

function main() {
  const fixtures = getStoryFieldFixtures(parseOnlyArg());
  console.log(`\n=== 情境欄位解析測試 (${fixtures.length} 則) ===\n`);

  let passed = 0;
  for (const f of fixtures) {
    const r = runFixture(f);
    if (r.ok) {
      passed++;
      console.log(`✓ ${f.id}  ${f.note}`);
    } else {
      console.log(`✗ ${f.id}  ${f.note}`);
      for (const e of r.errors) console.log(`    ${e}`);
      console.log(`    story: ${f.story.slice(0, 60)}…`);
    }
  }

  console.log(`\n結果: ${passed}/${fixtures.length} 通過\n`);
  process.exit(passed === fixtures.length ? 0 : 1);
}

main();
