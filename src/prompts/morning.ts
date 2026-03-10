import type { UserProfile } from "../types.js";
import { buildChaosModifier } from "../logic/chaos.js";

/**
 * Builds the user prompt for the morning Next Best Action call.
 *
 * This is now a slimmed-down prompt. The model uses tools to pull
 * biomarker data, action history, streaks, and energy trends on demand.
 */
export function buildMorningPrompt(profile: UserProfile): string {
  const { user, identity, lifestyle, chaos_context, focus_biomarker } = profile;

  const chaosModifier = buildChaosModifier(chaos_context);

  return `Generate today's Next Best Action for this user.

USER: ${user.name}, ${user.age}, ${user.city}
OCCUPATION: ${user.occupation}
HOUSEHOLD: ${user.household}
PROUD AT 60: "${identity.proud_at_60_statement}"
PRIMARY FEAR: "${identity.primary_fear}"
MOTIVATION STYLE: ${identity.motivation_style}

LIFESTYLE SNAPSHOT:
- Sleep: ${lifestyle.sleep_hours_avg} hours avg, quality ${lifestyle.sleep_quality}
- Exercise: ${lifestyle.exercise_type}, ${lifestyle.exercise_frequency_per_week}x/week
- Meal control: ${lifestyle.meal_control}
- Alcohol: ${lifestyle.alcohol}
- Stress: ${lifestyle.stress_level}
- Screen time after 9pm: ${lifestyle.screen_time_after_9pm}

THIS WEEK'S CHAOS CONTEXT:
"${chaos_context.this_week_description}"
- Travelling: ${chaos_context.travel}
- Festival/event: ${chaos_context.festival_or_event || "None"}
- Work intensity: ${chaos_context.work_intensity}
- Family demands: ${chaos_context.family_demands}
${chaosModifier}
FOCUS BIOMARKER TODAY: ${focus_biomarker}

BEFORE generating the action, use your tools to gather the data you need:
1. Call get_flagged_biomarkers to see which biomarkers need attention and their values.
2. Call get_recent_actions to see what was already recommended (avoid repeating).
3. Call get_completion_rate or get_streak to understand how well the user is following through.
4. Call get_energy_trend to calibrate action difficulty.
5. Optionally call get_category_success to pick categories the user succeeds at.
6. Call get_coach_notes to see any private notes left by you from previous check-ins.
7. Call get_weather_aqi to know the current weather and air quality for the user's city, to avoid suggesting outdoor activities during poor air quality or extreme weather.

After gathering data, generate the NBA.

Return JSON with "message" and "metadata" fields.
The "message" is the WhatsApp text (3-5 sentences).
The "metadata" has: action_category, action_summary (10 words max), biomarker_targeted, chaos_adjusted (boolean), identity_anchor_used (boolean), difficulty_level, estimated_minutes.

Return ONLY valid JSON, no markdown fences.`;
}
