import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { UserProfile, NBAOutput, EveningCheckInOutput, WeeklySummaryOutput } from "./types.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT, WEEKLY_SYSTEM_PROMPT } from "./prompts/system.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";
import { TOOL_DEFINITIONS, handleToolCall } from "./tools.js";
import { evaluateNBA } from "./evaluator.js";
import { client, MODEL } from "./config.js";

const MAX_TOOL_ROUNDS = 10;
const MAX_EVAL_RETRIES = 1;

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as T;
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
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // If no tool use, extract text and return
    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock && textBlock.type === "text" ? textBlock.text : "";
    }

    // Collect all tool_use blocks from this response
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

    // Add the assistant's response (with tool_use blocks) to the conversation
    messages.push({ role: "assistant", content: response.content as ContentBlockParam[] });

    // Execute each tool and build tool_result blocks
    const toolResults: ContentBlockParam[] = toolUseBlocks.map((block) => {
      if (block.type !== "tool_use") throw new Error("Expected tool_use block");
      const result = handleToolCall(block.name, block.input as Record<string, unknown>, profile);
      console.log(`  │ Tool: ${block.name} → ${result.slice(0, 80)}${result.length > 80 ? "..." : ""}`);
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: result,
      };
    });

    // Add tool results as a user message
    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("Agentic loop exceeded maximum tool rounds");
}

/**
 * Generate the morning Next Best Action using the agentic loop + self-eval.
 */
export async function generateMorningNBA(profile: UserProfile): Promise<NBAOutput> {
  // Determine focus biomarker using priority logic
  profile.focus_biomarker = determineFocusBiomarker(profile);

  const userPrompt = buildMorningPrompt(profile);
  const yesterdayAction = profile.action_history.length > 0
    ? profile.action_history[profile.action_history.length - 1].action
    : null;

  console.log("  ┌ Agent: generating NBA (with tools)...");
  let text = await agenticLoop(MASTER_SYSTEM_PROMPT, userPrompt, profile);
  let nba = parseJSON<NBAOutput>(text);

  // Self-evaluation loop
  for (let attempt = 0; attempt < MAX_EVAL_RETRIES; attempt++) {
    console.log("  │ Evaluating NBA quality...");
    const evalResult = await evaluateNBA(nba, profile, yesterdayAction);

    if (evalResult.pass) {
      console.log("  └ Eval: PASS");
      return nba;
    }

    console.log(`  │ Eval: FAIL — ${evalResult.critique}`);
    console.log("  │ Regenerating with critique...");

    // Regenerate with the critique injected
    const retryPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt was rejected by the quality evaluator. Here is the critique:\n"${evalResult.critique}"\n\nGenerate a new, improved Next Best Action that addresses this feedback.`;
    text = await agenticLoop(MASTER_SYSTEM_PROMPT, retryPrompt, profile);
    nba = parseJSON<NBAOutput>(text);
  }

  console.log("  └ Returning best attempt");
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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: EVENING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseJSON<EveningCheckInOutput>(text);
}

/**
 * Generate the weekly summary.
 */
export async function generateWeeklySummary(profile: UserProfile): Promise<WeeklySummaryOutput> {

  // Ensure focus biomarker is set
  if (!profile.focus_biomarker) {
    profile.focus_biomarker = determineFocusBiomarker(profile);
  }

  const userPrompt = buildWeeklyPrompt(profile);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: WEEKLY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseJSON<WeeklySummaryOutput>(text);
}
