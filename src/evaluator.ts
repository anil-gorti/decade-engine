import type { NBAOutput, EvalResult, UserProfile } from "./types.js";
import { client, MODEL } from "./config.js";

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

function buildPerformanceContext(profile: UserProfile): {
  completionRate: number;
  currentStreak: number;
  averageEnergy: number;
  recentEnergy: string;
} {
  const recentCheckins = profile.recent_checkins.slice(-7);
  const completed = recentCheckins.filter((checkin) => checkin.action_taken).length;
  const completionRate = recentCheckins.length > 0
    ? Math.round((completed / recentCheckins.length) * 100)
    : 0;

  let currentStreak = 0;
  for (let i = profile.recent_checkins.length - 1; i >= 0; i -= 1) {
    if (!profile.recent_checkins[i].action_taken) {
      break;
    }
    currentStreak += 1;
  }

  const energyValues = recentCheckins.map((checkin) => checkin.energy_level);
  const averageEnergy = energyValues.length > 0
    ? Math.round((energyValues.reduce((sum, value) => sum + value, 0) / energyValues.length) * 10) / 10
    : 0;

  const recentEnergy = recentCheckins.slice(-3)
    .map((checkin) => `${checkin.date}: ${checkin.energy_level}/5 after ${checkin.sleep_last_night}h sleep`)
    .join("; ");

  return {
    completionRate,
    currentStreak,
    averageEnergy,
    recentEnergy: recentEnergy || "No recent energy readings",
  };
}

export async function evaluateNBA(
  nba: NBAOutput,
  profile: UserProfile,
  yesterdayAction: string | null
): Promise<EvalResult> {
  const performance = buildPerformanceContext(profile);
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
- Completion rate (last 7 check-ins): ${performance.completionRate}%
- Current completion streak: ${performance.currentStreak}
- Average energy (last 7 check-ins): ${performance.averageEnergy}/5
- Recent energy trend: ${performance.recentEnergy}

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
