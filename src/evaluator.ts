import Anthropic from "@anthropic-ai/sdk";
import type { NBAOutput, EvalResult, UserProfile } from "./types.js";

const MODEL = "claude-sonnet-4-20250514";

const EVAL_SYSTEM_PROMPT = `You are a quality evaluator for a health coaching AI called Decade. Your job is to review a generated Next Best Action (NBA) and determine if it meets the quality bar before it gets sent to the user.

Evaluate the NBA against these criteria:
1. SPECIFICITY: The action must include time, quantity, or context. "Drink more water" fails. "Drink 2 glasses of water before your 2pm meeting" passes.
2. NO REPETITION: The action must not be the same as yesterday's action. Similar category is fine, but the exact same action is not.
3. CHAOS-REALISTIC: The action must be feasible given the user's chaos context (travel, festivals, heavy work week, etc.). A cooking-based action during travel fails.
4. DIFFICULTY MATCH: If the user has a low completion rate or low energy, the action should be easy. Don't assign a hard action to someone who's been struggling.
5. TONE: The message should sound like a coach texting on WhatsApp, not a medical report. No bullet points, no clinical language, no hollow praise.

Return ONLY valid JSON with two fields:
- "pass": boolean
- "critique": string (empty if pass is true, otherwise a specific 1-2 sentence explanation of what's wrong)`;

export async function evaluateNBA(
  nba: NBAOutput,
  profile: UserProfile,
  yesterdayAction: string | null
): Promise<EvalResult> {
  const client = new Anthropic();

  const evalPrompt = `Here is the generated NBA to evaluate:

MESSAGE: "${nba.message}"

METADATA:
- Category: ${nba.metadata.action_category}
- Action: ${nba.metadata.action_summary}
- Difficulty: ${nba.metadata.difficulty_level}
- Estimated minutes: ${nba.metadata.estimated_minutes}
- Chaos-adjusted: ${nba.metadata.chaos_adjusted}

CONTEXT:
- Yesterday's action: ${yesterdayAction ?? "None (first day)"}
- User's chaos this week: "${profile.chaos_context.this_week_description}"
- Travelling: ${profile.chaos_context.travel}
- Festival: ${profile.chaos_context.festival_or_event ?? "None"}
- Work intensity: ${profile.chaos_context.work_intensity}

Does this NBA pass all 5 criteria? Return JSON with "pass" and "critique".`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: EVAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: evalPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(cleaned) as EvalResult;
  } catch {
    // If we can't parse the eval, assume it passes (don't block on eval failure)
    return { pass: true, critique: "" };
  }
}
