import type Anthropic from "@anthropic-ai/sdk";
import type { UserProfile, NBAOutput, EveningCheckInOutput, WeeklySummaryOutput } from "./types.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT, WEEKLY_SYSTEM_PROMPT } from "./prompts/system.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";
import { TOOL_DEFINITIONS, handleToolCall } from "./tools.js";
import { evaluateNBA } from "./evaluator.js";
import { llm, MODEL } from "./config.js";
import { verboseLog, parseLLMJSON, LLMParseError } from "./util.js";
import { NBASchema, EveningCheckInSchema, WeeklySummarySchema } from "./schema.js";

const MAX_TOOL_ROUNDS = 10;
const MAX_EVAL_RETRIES = 1;

type MessageParam = Anthropic.Messages.MessageParam;
type TextBlock = Anthropic.Messages.TextBlock;
type ToolUseBlock = Anthropic.Messages.ToolUseBlock;
type ContentBlockParam = Anthropic.Messages.ContentBlockParam;

function validateNBA(obj: unknown): NBAOutput {
  return NBASchema.parse(obj) as NBAOutput;
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  const textBlock = content.find((b): b is TextBlock => b.type === "text");
  return textBlock?.text ?? "";
}

/**
 * Run the agentic tool-use loop: send messages, handle tool calls,
 * repeat until the model produces a final text response.
 */
async function agenticLoop(
  systemPrompt: string,
  initialUserPrompt: string,
  profile: UserProfile,
  maxTokens: number = 1024
): Promise<string> {
  const messages: MessageParam[] = [
    { role: "user", content: initialUserPrompt },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await llm.createMessage({
      model: MODEL,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: TOOL_DEFINITIONS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return extractText(response.content);
    }

    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content as ContentBlockParam[] });

    const toolResults: ContentBlockParam[] = toolUseBlocks.map((block) => {
      const result = handleToolCall(block.name, block.input as Record<string, unknown>, profile);
      verboseLog(`  │ Tool: ${block.name} → ${result.slice(0, 80)}${result.length > 80 ? "..." : ""}`);
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: result,
      };
    });

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("Agentic loop exceeded maximum tool rounds");
}

/**
 * Generate the morning Next Best Action using the agentic loop + self-eval.
 */
export async function generateMorningNBA(profile: UserProfile): Promise<NBAOutput> {
  profile.focus_biomarker = determineFocusBiomarker(profile);

  const userPrompt = buildMorningPrompt(profile);
  const yesterdayAction = profile.action_history.length > 0
    ? profile.action_history[profile.action_history.length - 1].action
    : null;

  verboseLog("  ┌ Agent: generating NBA (with tools)...");
  let text = await agenticLoop(MASTER_SYSTEM_PROMPT, userPrompt, profile);
  let nba: NBAOutput;
  try {
    nba = validateNBA(parseLLMJSON<unknown>(text));
  } catch (err) {
    if (err instanceof LLMParseError) {
      console.error("[generateMorningNBA] LLM output parse failed:", err.code, err.rawPreview);
    }
    throw err;
  }

  for (let attempt = 0; attempt < MAX_EVAL_RETRIES; attempt++) {
    verboseLog("  │ Evaluating NBA quality...");
    const evalResult = await evaluateNBA(nba, profile, yesterdayAction);

    if (evalResult.pass) {
      verboseLog("  └ Eval: PASS");
      return nba;
    }

    verboseLog(`  │ Eval: FAIL — ${evalResult.critique}`);
    verboseLog("  │ Regenerating with critique...");

    const retryPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt was rejected by the quality evaluator. Here is the critique:\n"${evalResult.critique}"\n\nGenerate a new, improved Next Best Action that addresses this feedback.`;
    text = await agenticLoop(MASTER_SYSTEM_PROMPT, retryPrompt, profile);
    try {
      nba = validateNBA(parseLLMJSON<unknown>(text));
    } catch (err) {
      if (err instanceof LLMParseError) {
        console.error("[generateMorningNBA] Retry LLM output parse failed:", err.code, err.rawPreview);
      }
      throw err;
    }
  }

  verboseLog("  └ Returning best attempt");
  return nba;
}

/**
 * Generate the evening check-in reply.
 */
export async function generateEveningCheckIn(
  actionSummary: string,
  userResponse: string
): Promise<EveningCheckInOutput> {
  const userPrompt = buildEveningPrompt(actionSummary, userResponse);

  const response = await llm.createMessage({
    model: MODEL,
    max_tokens: 512,
    system: EVENING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = extractText(response.content);

  try {
    return EveningCheckInSchema.parse(parseLLMJSON<unknown>(text)) as EveningCheckInOutput;
  } catch (err) {
    if (err instanceof LLMParseError) {
      console.error("[generateEveningCheckIn] LLM output parse failed:", err.code, err.rawPreview);
    }
    throw err;
  }
}

/**
 * Generate the weekly summary.
 */
export async function generateWeeklySummary(profile: UserProfile): Promise<WeeklySummaryOutput> {
  if (!profile.focus_biomarker) {
    profile.focus_biomarker = determineFocusBiomarker(profile);
  }

  const userPrompt = buildWeeklyPrompt(profile);

  const response = await llm.createMessage({
    model: MODEL,
    max_tokens: 1024,
    system: WEEKLY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = extractText(response.content);

  try {
    return WeeklySummarySchema.parse(parseLLMJSON<unknown>(text)) as WeeklySummaryOutput;
  } catch (err) {
    if (err instanceof LLMParseError) {
      console.error("[generateWeeklySummary] LLM output parse failed:", err.code, err.rawPreview);
    }
    throw err;
  }
}
