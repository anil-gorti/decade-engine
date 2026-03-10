import { generateMorningNBA, generateEveningCheckIn, generateWeeklySummary } from "./engine.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT, WEEKLY_SYSTEM_PROMPT } from "./prompts/system.js";
import { loadProfile, listUsers, recordAction, recordCheckIn, recordCoachNote } from "./store.js";
import { getLastActionSummary, getDefaultEveningUserResponse } from "./shared.js";
import type { EngineMode } from "./types.js";
import { today, setVerbose, setMockDate } from "./util.js";

const DIVIDER = "\u2500".repeat(60);
const DRY_RUN = process.argv.includes("--dry-run");

const SIMULATE_WEEK = process.argv.includes("--simulate-week");
const MOCK_MODE = !process.env.ANTHROPIC_API_KEY && !DRY_RUN;

// CLI always runs verbose so you see tool calls and eval results
setVerbose(true);

if (MOCK_MODE) {
  console.log("⚠️ No ANTHROPIC_API_KEY found. Running in MOCK LLM mode (simulating responses).\n");
} else if (DRY_RUN) {
  console.log("Running in dry-run mode (showing prompts only).\n");
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
  await recordAction(userName, {
    date: today(),
    action: result.metadata.action_summary,
    category: result.metadata.action_category,
  });
  console.log(`\u2713 Action recorded to data/${userName}.json`);

  return result;
}

async function runEvening(userName: string) {
  const profile = loadProfile(userName);

  const actionSummary = getLastActionSummary(profile);
  const userResponse = getDefaultEveningUserResponse(userName);

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
  await recordCheckIn(userName, {
    date: today(),
    action_taken: result.action_taken,
    notes: userResponse,
    energy_level: 3,
    sleep_last_night: profile.lifestyle.sleep_hours_avg,
  });
  console.log(`\u2713 Check-in recorded to data/${userName}.json`);

  if (result.coach_note) {
    await recordCoachNote(userName, result.coach_note);
    console.log(`\u2713 Coach note recorded to data/${userName}.json`);
  }

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
  console.log(`Mode: ${mode} | Users: ${users.join(", ")} | Dry run: ${DRY_RUN} | Mock: ${MOCK_MODE} | Simulate Week: ${SIMULATE_WEEK}\n`);

  if (SIMULATE_WEEK) {
    for (const userName of users) {
      console.log(`\nStarting 7-day simulation for ${userName}...\n`);
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const mockDateString = d.toISOString().slice(0, 10);
        setMockDate(mockDateString);
        console.log(`\n\n=== DAY ${dayOffset + 1} (${mockDateString}) ===`);
        await runMorning(userName);
        console.log(`\nFast forwarding to evening...`);
        await runEvening(userName);
      }
      setMockDate(""); // reset
    }
  } else {
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
  }

  console.log(`\n${DIVIDER}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Engine error:", err);
  process.exit(1);
});
