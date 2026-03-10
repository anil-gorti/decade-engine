import { generateMorningNBA, generateEveningCheckIn, generateWeeklySummary } from "./engine.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT, WEEKLY_SYSTEM_PROMPT } from "./prompts/system.js";
import { loadProfile, listUsers, recordAction, recordCheckIn } from "./store.js";
import type { EngineMode } from "./types.js";

const DIVIDER = "\u2500".repeat(60);
const DRY_RUN = process.argv.includes("--dry-run") || !process.env.ANTHROPIC_API_KEY;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

if (DRY_RUN && !process.argv.includes("--dry-run")) {
  console.log("No ANTHROPIC_API_KEY found. Running in dry-run mode (showing prompts).\n");
}

async function runMorning(userName: string) {
  const profile = loadProfile(userName);

  console.log(`\n${DIVIDER}`);
  console.log(`MORNING NBA \u2014 ${profile.user.name} (${profile.user.city})`);
  console.log(`Chaos: ${profile.chaos_context.this_week_description}`);
  console.log(`History: ${profile.action_history.length} actions, ${profile.recent_checkins.length} check-ins`);
  console.log(DIVIDER);

  if (DRY_RUN) {
    profile.focus_biomarker = determineFocusBiomarker(profile);
    console.log(`\nFocus biomarker (priority logic): ${profile.focus_biomarker}`);
    console.log(`\n[SYSTEM PROMPT]\n${MASTER_SYSTEM_PROMPT.slice(0, 200)}...\n`);
    console.log(`[USER PROMPT]\n${buildMorningPrompt(profile)}\n`);
    return;
  }

  const result = await generateMorningNBA(profile);
  console.log(`\nWhatsApp message:\n"${result.message}"\n`);
  console.log("Metadata:", JSON.stringify(result.metadata, null, 2));

  // Persist the action
  recordAction(userName, {
    date: today(),
    action: result.metadata.action_summary,
    category: result.metadata.action_category,
  });
  console.log(`\u2713 Action recorded to data/${userName}.json`);

  return result;
}

async function runEvening(userName: string) {
  const profile = loadProfile(userName);

  const lastAction = profile.action_history[profile.action_history.length - 1];
  const actionSummary = lastAction?.action ?? "15 minute post-lunch walk";

  const responses: Record<string, string> = {
    rahul: "Yeah did it, walked for about 12 mins after lunch",
    priya: "Couldn't today, the house was too chaotic with guests",
    vikram: "No, had back to back calls and then crashed",
  };
  const userResponse = responses[userName] ?? "Did it";

  console.log(`\n${DIVIDER}`);
  console.log(`EVENING CHECK-IN \u2014 ${profile.user.name}`);
  console.log(`Action was: "${actionSummary}"`);
  console.log(`User said: "${userResponse}"`);
  console.log(DIVIDER);

  if (DRY_RUN) {
    console.log(`\n[SYSTEM PROMPT]\n${EVENING_SYSTEM_PROMPT}\n`);
    console.log(`[USER PROMPT]\n${buildEveningPrompt(actionSummary, userResponse)}\n`);
    return;
  }

  const result = await generateEveningCheckIn(actionSummary, userResponse);
  console.log(`\nWhatsApp message:\n"${result.message}"\n`);
  console.log(`Action taken: ${result.action_taken}`);

  // Persist the check-in
  recordCheckIn(userName, {
    date: today(),
    action_taken: result.action_taken,
    notes: userResponse,
    energy_level: 3,
    sleep_last_night: profile.lifestyle.sleep_hours_avg,
  });
  console.log(`\u2713 Check-in recorded to data/${userName}.json`);

  return result;
}

async function runWeekly(userName: string) {
  const profile = loadProfile(userName);

  console.log(`\n${DIVIDER}`);
  console.log(`WEEKLY SUMMARY \u2014 ${profile.user.name}`);
  console.log(DIVIDER);

  if (DRY_RUN) {
    profile.focus_biomarker = determineFocusBiomarker(profile);
    console.log(`\nFocus biomarker: ${profile.focus_biomarker}`);
    console.log(`\n[SYSTEM PROMPT] (same as master)\n`);
    console.log(`[USER PROMPT]\n${buildWeeklyPrompt(profile)}\n`);
    return;
  }

  const result = await generateWeeklySummary(profile);
  console.log(`\nWhatsApp message:\n"${result.message}"\n`);
  return result;
}

async function main() {
  const args = process.argv.filter((a) => !a.startsWith("--"));
  const mode = (args[2] || "all") as EngineMode | "all";
  const userArg = args[3];
  const users = userArg ? [userArg] : listUsers();

  console.log(`Decade Engine v1.0`);
  console.log(`Mode: ${mode} | Users: ${users.join(", ")} | Dry run: ${DRY_RUN}\n`);

  for (const userName of users) {
    if (mode === "morning" || mode === "all") {
      await runMorning(userName);
    }
    if (mode === "evening" || mode === "all") {
      await runEvening(userName);
    }
    if (mode === "weekly" || mode === "all") {
      await runWeekly(userName);
    }
  }

  console.log(`\n${DIVIDER}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Engine error:", err);
  process.exit(1);
});
