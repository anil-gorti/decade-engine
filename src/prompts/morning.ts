import type { UserProfile } from "../types.js";
import { buildChaosModifier } from "../logic/chaos.js";

/**
 * Builds the user prompt for the morning Next Best Action call.
 */
export function buildMorningPrompt(profile: UserProfile): string {
  const { user, identity, biomarkers, lifestyle, chaos_context, recent_checkins, action_history, focus_biomarker } = profile;

  const last3Checkins = recent_checkins.slice(-3).map((c) =>
    `${c.date}: action taken = ${c.action_taken}, energy = ${c.energy_level}/5, notes: "${c.notes}"`
  ).join("\n");

  const recentActions = action_history.slice(-7).map((a) =>
    `${a.date}: ${a.action} (${a.category})`
  ).join("\n");

  const chaosModifier = buildChaosModifier(chaos_context);

  return `Here is the user profile for today's Next Best Action:

USER: ${user.name}, ${user.age}, ${user.city}
OCCUPATION: ${user.occupation}
HOUSEHOLD: ${user.household}
PROUD AT 60: "${identity.proud_at_60_statement}"
PRIMARY FEAR: "${identity.primary_fear}"
MOTIVATION STYLE: ${identity.motivation_style}

KEY BIOMARKERS:
- HbA1c: ${biomarkers.hba1c.value}% (${biomarkers.hba1c.flag}) — last tested ${biomarkers.hba1c.date}
- Fasting Glucose: ${biomarkers.fasting_glucose.value} mg/dL (${biomarkers.fasting_glucose.flag})
- LDL: ${biomarkers.ldl.value} mg/dL (${biomarkers.ldl.flag})
- HDL: ${biomarkers.hdl.value} mg/dL (${biomarkers.hdl.flag})
- Triglycerides: ${biomarkers.triglycerides.value} mg/dL (${biomarkers.triglycerides.flag})
- Vitamin D: ${biomarkers.vitamin_d.value} ng/mL (${biomarkers.vitamin_d.flag})
- TSH: ${biomarkers.tsh.value} uIU/mL (${biomarkers.tsh.flag})
- Creatinine: ${biomarkers.creatinine.value} mg/dL (${biomarkers.creatinine.flag})
- Uric Acid: ${biomarkers.uric_acid.value} mg/dL (${biomarkers.uric_acid.flag})

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
LAST 3 DAYS:
${last3Checkins || "No check-ins yet."}

RECENT ACTION HISTORY (avoid repeating):
${recentActions || "No actions yet."}

FOCUS BIOMARKER TODAY: ${focus_biomarker}

Generate today's Next Best Action. Return JSON with "message" and "metadata" fields.
The "message" is the WhatsApp text (3-5 sentences).
The "metadata" has: action_category, action_summary (10 words max), biomarker_targeted, chaos_adjusted (boolean), identity_anchor_used (boolean), difficulty_level, estimated_minutes.

Return ONLY valid JSON, no markdown fences.`;
}
