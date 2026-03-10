import Anthropic from "@anthropic-ai/sdk";
import type { UserProfile, NBAOutput, EveningCheckInOutput, WeeklySummaryOutput } from "./types.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT, WEEKLY_SYSTEM_PROMPT } from "./prompts/system.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";

const MODEL = "claude-sonnet-4-20250514";

function createClient(): Anthropic {
  return new Anthropic();
}

function parseJSON<T>(text: string): T {
  // Strip markdown fences if the model wraps them
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Generate the morning Next Best Action.
 */
export async function generateMorningNBA(profile: UserProfile): Promise<NBAOutput> {
  const client = createClient();

  // Determine focus biomarker using priority logic
  profile.focus_biomarker = determineFocusBiomarker(profile);

  const userPrompt = buildMorningPrompt(profile);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: MASTER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseJSON<NBAOutput>(text);
}

/**
 * Generate the evening check-in reply.
 */
export async function generateEveningCheckIn(
  actionSummary: string,
  userResponse: string
): Promise<EveningCheckInOutput> {
  const client = createClient();

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
  const client = createClient();

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
