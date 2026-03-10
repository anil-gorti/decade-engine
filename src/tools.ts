import type Anthropic from "@anthropic-ai/sdk";
import type { UserProfile, ActionCategory } from "./types.js";

// ── Tool schemas for the Anthropic API ──

type ToolDef = Anthropic.Messages.Tool;

export const TOOL_DEFINITIONS: ToolDef[] = [
  {
    name: "get_flagged_biomarkers",
    description:
      "Returns only the biomarkers that are NOT normal (borderline, high, or low), with their values, units, flags, and test dates. Use this to understand what needs attention.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_recent_actions",
    description:
      "Returns the last N actions from the user's history, with dates and categories. Use this to avoid repeating recent actions and to see what categories have been covered.",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Number of recent actions to return. Defaults to 7.",
        },
      },
    },
  },
  {
    name: "get_streak",
    description:
      "Returns the user's current streak — number of consecutive most-recent check-ins where they completed the action. A streak of 0 means they missed yesterday.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_completion_rate",
    description:
      "Returns the percentage of check-ins where the user completed the action, over the last N check-ins.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of recent check-ins to consider. Defaults to 7.",
        },
      },
    },
  },
  {
    name: "get_category_success",
    description:
      "Returns per-category success rates — for each action category (nutrition, movement, sleep, stress, hydration), shows how many times the user was given that category and how many times they followed through. Helps pick categories the user is likely to succeed at.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_energy_trend",
    description:
      "Returns the average energy level (1-5 scale) from the user's recent check-ins, plus the last 3 individual readings. Useful for calibrating action difficulty.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ── Tool handlers ──

interface ToolInput {
  count?: number;
  days?: number;
}

export function handleToolCall(
  toolName: string,
  input: ToolInput,
  profile: UserProfile
): string {
  switch (toolName) {
    case "get_flagged_biomarkers":
      return handleFlaggedBiomarkers(profile);
    case "get_recent_actions":
      return handleRecentActions(profile, input.count ?? 7);
    case "get_streak":
      return handleStreak(profile);
    case "get_completion_rate":
      return handleCompletionRate(profile, input.days ?? 7);
    case "get_category_success":
      return handleCategorySuccess(profile);
    case "get_energy_trend":
      return handleEnergyTrend(profile);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

function handleFlaggedBiomarkers(profile: UserProfile): string {
  const flagged: Record<string, { value: number; unit: string; flag: string; date: string }> = {};

  for (const [key, reading] of Object.entries(profile.biomarkers)) {
    if (reading.flag !== "normal") {
      flagged[key] = {
        value: reading.value,
        unit: reading.unit,
        flag: reading.flag,
        date: reading.date,
      };
    }
  }

  return JSON.stringify(flagged, null, 2);
}

function handleRecentActions(profile: UserProfile, count: number): string {
  const actions = profile.action_history.slice(-count).map((a) => ({
    date: a.date,
    action: a.action,
    category: a.category,
  }));

  return JSON.stringify(actions, null, 2);
}

function handleStreak(profile: UserProfile): string {
  const checkins = profile.recent_checkins;
  let streak = 0;

  // Walk backwards from most recent
  for (let i = checkins.length - 1; i >= 0; i--) {
    if (checkins[i].action_taken) {
      streak++;
    } else {
      break;
    }
  }

  return JSON.stringify({ current_streak: streak, total_checkins: checkins.length });
}

function handleCompletionRate(profile: UserProfile, days: number): string {
  const recent = profile.recent_checkins.slice(-days);
  if (recent.length === 0) {
    return JSON.stringify({ rate: 0, completed: 0, total: 0 });
  }

  const completed = recent.filter((c) => c.action_taken).length;
  const rate = Math.round((completed / recent.length) * 100);

  return JSON.stringify({ rate, completed, total: recent.length });
}

function handleCategorySuccess(profile: UserProfile): string {
  // Match actions to check-ins by date to determine success per category
  const categoryStats: Record<string, { assigned: number; completed: number }> = {};

  for (const action of profile.action_history) {
    if (!categoryStats[action.category]) {
      categoryStats[action.category] = { assigned: 0, completed: 0 };
    }
    categoryStats[action.category].assigned++;

    // Find matching check-in for this date
    const checkin = profile.recent_checkins.find((c) => c.date === action.date);
    if (checkin?.action_taken) {
      categoryStats[action.category].completed++;
    }
  }

  const result: Record<string, { assigned: number; completed: number; rate: string }> = {};
  for (const [cat, stats] of Object.entries(categoryStats)) {
    result[cat] = {
      ...stats,
      rate: stats.assigned > 0 ? `${Math.round((stats.completed / stats.assigned) * 100)}%` : "N/A",
    };
  }

  return JSON.stringify(result, null, 2);
}

function handleEnergyTrend(profile: UserProfile): string {
  const checkins = profile.recent_checkins;
  if (checkins.length === 0) {
    return JSON.stringify({ average: 0, recent: [] });
  }

  const recent = checkins.slice(-3);
  const allEnergy = checkins.map((c) => c.energy_level);
  const avg = allEnergy.reduce((a, b) => a + b, 0) / allEnergy.length;

  return JSON.stringify({
    average_energy: Math.round(avg * 10) / 10,
    recent_readings: recent.map((c) => ({
      date: c.date,
      energy: c.energy_level,
      sleep: c.sleep_last_night,
    })),
  });
}
