import type { UserProfile, ActionCategory } from "../types.js";

/**
 * Priority stack: evaluate top-to-bottom, stop at first match.
 * Returns the biomarker key to focus on today.
 */
export function determineFocusBiomarker(profile: UserProfile): string {
  const { biomarkers, action_history, recent_checkins, lifestyle } = profile;

  const recentActions = action_history.slice(-7);
  const last5Actions = action_history.slice(-5);
  const lastCheckin = recent_checkins[recent_checkins.length - 1];

  // 1. HbA1c >= 6.0
  // No category guard — let the model use get_recent_actions to vary the action type.
  if (biomarkers.hba1c.value >= 6.0) {
    return "hba1c";
  }

  // 2. LDL >= 130 AND no movement action in last 5 days
  // Narrowed to movement only so LDL users actually get cardiovascular focus.
  if (biomarkers.ldl.value >= 130) {
    const hasMovementAction = last5Actions.some(
      (a) => a.category === "movement"
    );
    if (!hasMovementAction) {
      return "ldl";
    }
  }

  // 3. Vitamin D < 20 AND no Vit D action in last 7 days
  if (biomarkers.vitamin_d.value < 20) {
    const hasVitDAction = recentActions.some(
      (a) =>
        a.action.toLowerCase().includes("vitamin d") ||
        a.action.toLowerCase().includes("sun") ||
        a.action.toLowerCase().includes("sunlight")
    );
    if (!hasVitDAction) {
      return "vitamin_d";
    }
  }

  // 4. Sleep < 6.5 hours AND energy <= 2 in last checkin
  if (
    lifestyle.sleep_hours_avg < 6.5 &&
    lastCheckin &&
    lastCheckin.energy_level <= 2
  ) {
    return "sleep";
  }

  // 5. TSH flagged AND no thyroid action this week
  if (biomarkers.tsh.flag !== "normal") {
    const hasTSHAction = recentActions.some(
      (a) =>
        a.action.toLowerCase().includes("thyroid") ||
        a.action.toLowerCase().includes("tsh")
    );
    if (!hasTSHAction) {
      return "tsh";
    }
  }

  // 6. Default: rotate to least recently addressed biomarker
  return leastRecentlyAddressed(action_history);
}

// Maps biomarker keys to the action categories that address them.
// Uses the structured category field instead of text-matching action strings.
const BIOMARKER_CATEGORY_MAP: Record<string, ActionCategory[]> = {
  hba1c: ["nutrition"],
  ldl: ["movement", "nutrition"],
  vitamin_d: ["movement"], // sunlight = movement category
  sleep: ["sleep"],
  tsh: ["sleep", "stress"], // thyroid responds to sleep + stress management
  hydration: ["hydration"],
};

function leastRecentlyAddressed(history: UserProfile["action_history"]): string {
  const biomarkerKeys = Object.keys(BIOMARKER_CATEGORY_MAP);

  // For each biomarker, find the index of the most recent action that addresses it.
  // Using the category field — reliable, structured, no string matching.
  const lastSeen: Record<string, number> = {};
  for (const key of biomarkerKeys) {
    lastSeen[key] = -1;
  }

  for (let i = 0; i < history.length; i++) {
    const actionCategory = history[i].category;
    for (const [biomarker, categories] of Object.entries(BIOMARKER_CATEGORY_MAP)) {
      if (categories.includes(actionCategory as ActionCategory)) {
        lastSeen[biomarker] = i;
      }
    }
  }

  // Return the biomarker that was addressed least recently (lowest index = oldest).
  let oldest = "hba1c";
  let oldestIndex = Infinity;
  for (const [key, idx] of Object.entries(lastSeen)) {
    if (idx < oldestIndex) {
      oldestIndex = idx;
      oldest = key;
    }
  }

  return oldest;
}
