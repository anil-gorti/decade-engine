import type { UserProfile } from "../types.js";

/**
 * Priority stack: evaluate top-to-bottom, stop at first match.
 * Returns the biomarker key to focus on today.
 */
export function determineFocusBiomarker(profile: UserProfile): string {
  const { biomarkers, action_history, recent_checkins, lifestyle } = profile;

  const recentActions = action_history.slice(-7);
  const lastCheckin = recent_checkins[recent_checkins.length - 1];

  // 1. HbA1c >= 6.0 AND last action was NOT glucose-related
  if (biomarkers.hba1c.value >= 6.0) {
    const lastAction = action_history[action_history.length - 1];
    if (!lastAction || lastAction.category !== "nutrition") {
      return "hba1c";
    }
  }

  // 2. LDL >= 130 AND no cardiovascular action in last 5 days
  if (biomarkers.ldl.value >= 130) {
    const last5 = action_history.slice(-5);
    const hasCardioAction = last5.some(
      (a) => a.category === "movement" || a.category === "nutrition"
    );
    if (!hasCardioAction) {
      return "ldl";
    }
  }

  // 3. Vitamin D < 20 AND no Vit D action in last 7 days
  if (biomarkers.vitamin_d.value < 20) {
    const hasVitDAction = recentActions.some((a) =>
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
    const hasTSHAction = recentActions.some((a) =>
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

function leastRecentlyAddressed(history: UserProfile["action_history"]): string {
  const biomarkerCategories: Record<string, string[]> = {
    hba1c: ["glucose", "hba1c", "sugar", "carb"],
    ldl: ["cholesterol", "ldl", "heart", "cardio"],
    vitamin_d: ["vitamin d", "sun", "sunlight"],
    sleep: ["sleep", "bed", "rest"],
    tsh: ["thyroid", "tsh"],
    hydration: ["water", "hydrat"],
  };

  const lastSeen: Record<string, number> = {};
  for (const key of Object.keys(biomarkerCategories)) {
    lastSeen[key] = -1;
  }

  for (let i = 0; i < history.length; i++) {
    const actionLower = history[i].action.toLowerCase();
    for (const [key, keywords] of Object.entries(biomarkerCategories)) {
      if (keywords.some((kw) => actionLower.includes(kw))) {
        lastSeen[key] = i;
      }
    }
  }

  let oldest = "";
  let oldestIndex = Infinity;
  for (const [key, idx] of Object.entries(lastSeen)) {
    if (idx < oldestIndex) {
      oldestIndex = idx;
      oldest = key;
    }
  }

  return oldest || "hba1c";
}
