import type { UserProfile } from "../types.js";

/**
 * Builds the user prompt for the weekly summary (sent Sunday).
 */
export function buildWeeklyPrompt(profile: UserProfile): string {
  const { user, identity, action_history, recent_checkins, focus_biomarker, biomarkers } = profile;

  const weekActions = action_history.slice(-7).map((a) =>
    `${a.date}: ${a.action} (${a.category})`
  ).join("\n");

  const completedCount = recent_checkins.slice(-7).filter((c) => c.action_taken).length;
  const totalCount = recent_checkins.slice(-7).length;
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const focusValue = biomarkers[focus_biomarker as keyof typeof biomarkers];
  const biomarkerContext = focusValue && typeof focusValue === "object" && "value" in focusValue
    ? `${focus_biomarker}: ${focusValue.value} ${focusValue.unit} (${focusValue.flag})`
    : focus_biomarker;

  return `Generate a weekly summary for ${user.name}.

Actions this week:
${weekActions || "No actions logged this week."}

Check-in completion rate: ${rate}%
Key biomarker context: ${biomarkerContext}
Proud at 60 statement: "${identity.proud_at_60_statement}"

Rules:
- One paragraph, 4-6 sentences.
- Acknowledge what happened honestly — don't inflate a bad week.
- End with one sentence that connects this week's pattern to their 60-year-old goal.
- Do not list next week's actions. That's Monday's job.

Return JSON with a "message" field containing the paragraph.

Return ONLY valid JSON, no markdown fences.`;
}
