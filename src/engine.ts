import type Anthropic from "@anthropic-ai/sdk";
import type { UserProfile, NBAOutput, EveningCheckInOutput, WeeklySummaryOutput } from "./types.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT, WEEKLY_SYSTEM_PROMPT } from "./prompts/system.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";
import { TOOL_DEFINITIONS, handleToolCall } from "./tools.js";
import { evaluateNBA } from "./evaluator.js";
import { client, MODEL } from "./config.js";
import { verboseLog } from "./util.js";
import { NBASchema, EveningCheckInSchema, WeeklySummarySchema } from "./schema.js";

const MAX_TOOL_ROUNDS = 10;
const MAX_EVAL_RETRIES = 1;

type MessageParam = Anthropic.Messages.MessageParam;
type ContentBlockParam = Anthropic.Messages.ContentBlockParam;

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Validate that the parsed NBA has the expected shape using Zod.
 */
function validateNBA(obj: unknown): NBAOutput {
  return NBASchema.parse(obj) as NBAOutput;
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
    let response: any;
    if (!process.env.ANTHROPIC_API_KEY) {
      await new Promise((r) => setTimeout(r, 1500));
      if (round === 0) {
        response = {
          stop_reason: "tool_use",
          content: [
            { type: "tool_use", id: "mock_1", name: "get_flagged_biomarkers", input: {} },
            { type: "tool_use", id: "mock_2", name: "get_coach_notes", input: { count: 3 } },
            { type: "tool_use", id: "mock_3", name: "get_weather_aqi", input: {} },
            { type: "tool_use", id: "mock_4", name: "get_streak", input: {} }
          ]
        };
      } else {
        response = {
          stop_reason: "end_turn",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "I see you're in a heavy sprint week. With your A1C borderline, let's keep it super easy today: Just stand up and stretch for 2 minutes after lunch. No prep needed.",
                metadata: {
                  action_category: "movement",
                  action_summary: "2 min stretch after lunch",
                  biomarker_targeted: "hba1c",
                  chaos_adjusted: true,
                  identity_anchor_used: false,
                  difficulty_level: "easy",
                  estimated_minutes: 2
                }
              })
            }
          ]
        };
      }
    } else {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" }
          }
        ],
        tools: TOOL_DEFINITIONS,
        messages,
      });
    }

    // If no tool use, extract text and return
    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b: any) => b.type === "text");
      return textBlock && textBlock.type === "text" ? textBlock.text : "";
    }

    // Collect all tool_use blocks from this response
    const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");

    // Add the assistant's response (with tool_use blocks) to the conversation
    messages.push({ role: "assistant", content: response.content as ContentBlockParam[] });

    // Execute each tool and build tool_result blocks
    const toolResults: ContentBlockParam[] = toolUseBlocks.map((block: any) => {
      if (block.type !== "tool_use") throw new Error("Expected tool_use block");
      const result = handleToolCall(block.name, block.input as Record<string, unknown>, profile);
      verboseLog(`  │ Tool: ${block.name} → ${result.slice(0, 80)}${result.length > 80 ? "..." : ""}`);
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

  verboseLog("  ┌ Agent: generating NBA (with tools)...");
  let text = await agenticLoop(MASTER_SYSTEM_PROMPT, userPrompt, profile);
  let nba = validateNBA(parseJSON<unknown>(text));

  // Self-evaluation loop
  for (let attempt = 0; attempt < MAX_EVAL_RETRIES; attempt++) {
    verboseLog("  │ Evaluating NBA quality...");
    const evalResult = await evaluateNBA(nba, profile, yesterdayAction);

    if (evalResult.pass) {
      verboseLog("  └ Eval: PASS");
      return nba;
    }

    verboseLog(`  │ Eval: FAIL — ${evalResult.critique}`);
    verboseLog("  │ Regenerating with critique...");

    // Regenerate with the critique injected
    const retryPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt was rejected by the quality evaluator. Here is the critique:\n"${evalResult.critique}"\n\nGenerate a new, improved Next Best Action that addresses this feedback.`;
    text = await agenticLoop(MASTER_SYSTEM_PROMPT, retryPrompt, profile);
    nba = validateNBA(parseJSON<unknown>(text));
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

  let text: string;
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 1000));
    text = JSON.stringify({
      message: "Solid effort today! Get some rest, tomorrow is a new day.",
      action_taken: userResponse.toLowerCase().includes("did it") || userResponse.toLowerCase().includes("yeah"),
      coach_note: "User seemed responsive today despite the heavy week. Keep actions small."
    });
  } else {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: EVENING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  }
  return EveningCheckInSchema.parse(parseJSON<unknown>(text)) as EveningCheckInOutput;
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

  let text: string;
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 1000));
    text = JSON.stringify({
      message: "Here is your mock weekly summary! You did a great job holding the line this week. Let's focus on recovery next."
    });
  } else {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: WEEKLY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  }
  return WeeklySummarySchema.parse(parseJSON<unknown>(text)) as WeeklySummaryOutput;
}
