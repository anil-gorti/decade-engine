import http from "node:http";
import { generateMorningNBA, generateEveningCheckIn, generateWeeklySummary } from "./engine.js";
import { determineFocusBiomarker } from "./logic/priority.js";
import { buildMorningPrompt } from "./prompts/morning.js";
import { buildEveningPrompt } from "./prompts/evening.js";
import { buildWeeklyPrompt } from "./prompts/weekly.js";
import { MASTER_SYSTEM_PROMPT, EVENING_SYSTEM_PROMPT } from "./prompts/system.js";
import { loadProfile, listUsers, recordAction, recordCheckIn, hasActionToday } from "./store.js";
import { MAX_BODY_BYTES } from "./config.js";

const PORT = 3456;
const DRY_RUN = !process.env.ANTHROPIC_API_KEY;

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    req.on("data", (chunk: Buffer | string) => {
      bytes += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function html(res: http.ServerResponse, body: string) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    json(res, {}, 204);
    return;
  }

  try {

  if (path === "/") {
    const userKeys = listUsers();
    const users = userKeys.map((key) => {
      const u = loadProfile(key);
      return {
        key,
        name: u.user.name,
        city: u.user.city,
        focusBiomarker: determineFocusBiomarker(u),
        hba1c: u.biomarkers.hba1c.value,
        ldl: u.biomarkers.ldl.value,
        vitD: u.biomarkers.vitamin_d.value,
        chaosContext: u.chaos_context.this_week_description,
        checkins: u.recent_checkins.length,
        actions: u.action_history.length,
      };
    });

    html(res, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Decade Engine v1.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; color: #fff; }
    .subtitle { color: #888; margin-bottom: 2rem; font-size: 0.95rem; }
    .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; margin-bottom: 2rem; }
    .status.dry { background: #3b2f00; color: #fbbf24; }
    .status.live { background: #052e16; color: #4ade80; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 1.5rem; }
    .card h2 { font-size: 1.2rem; margin-bottom: 0.25rem; }
    .card .city { color: #888; font-size: 0.85rem; margin-bottom: 1rem; }
    .card .chaos { background: #1f1f1f; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.85rem; color: #aaa; font-style: italic; }
    .biomarkers { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .biomarker { background: #111; border: 1px solid #333; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .biomarker .label { color: #888; }
    .biomarker .value { color: #fff; font-weight: 600; }
    .biomarker.focus { border-color: #f59e0b; background: #1a1500; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; cursor: pointer; font-size: 0.85rem; text-decoration: none; }
    .btn:hover { background: #333; }
    .btn.primary { background: #1d4ed8; border-color: #2563eb; }
    .btn.primary:hover { background: #2563eb; }
    .output { margin-top: 2rem; }
    .output h3 { margin-bottom: 0.5rem; }
    pre { background: #111; border: 1px solid #333; border-radius: 8px; padding: 1rem; overflow-x: auto; font-size: 0.85rem; white-space: pre-wrap; }
    #result { display: none; }
    .endpoints { margin-top: 2rem; }
    .endpoints h3 { margin-bottom: 0.75rem; }
    .endpoint { background: #111; border: 1px solid #333; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; font-family: monospace; font-size: 0.85rem; }
    .method { color: #4ade80; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Decade Engine</h1>
  <p class="subtitle">Personal health coaching for Indian tech professionals</p>
  <span class="status ${DRY_RUN ? "dry" : "live"}">${DRY_RUN ? "Dry Run (no API key)" : "Live"}</span>

  <div class="grid">
    ${users.map(u => `
    <div class="card">
      <h2>${u.name}</h2>
      <p class="city">${u.city}</p>
      <div class="chaos">"${u.chaosContext}"</div>
      <div class="biomarkers">
        <div class="biomarker${u.focusBiomarker === 'hba1c' ? ' focus' : ''}">
          <span class="label">HbA1c</span> <span class="value">${u.hba1c}%</span>
        </div>
        <div class="biomarker${u.focusBiomarker === 'ldl' ? ' focus' : ''}">
          <span class="label">LDL</span> <span class="value">${u.ldl}</span>
        </div>
        <div class="biomarker${u.focusBiomarker === 'vitamin_d' ? ' focus' : ''}">
          <span class="label">Vit D</span> <span class="value">${u.vitD}</span>
        </div>
        <div class="biomarker focus">
          <span class="label">Focus</span> <span class="value">${u.focusBiomarker}</span>
        </div>
      </div>
      <div class="actions">
        <a class="btn primary" href="/api/morning/${u.key}" target="_blank">Morning NBA</a>
        <a class="btn" href="/api/evening/${u.key}" target="_blank">Evening</a>
        <a class="btn" href="/api/weekly/${u.key}" target="_blank">Weekly</a>
      </div>
    </div>`).join("")}
  </div>

  <div class="endpoints">
    <h3>API Endpoints</h3>
    <div class="endpoint"><span class="method">GET</span> /api/morning/:user</div>
    <div class="endpoint"><span class="method">GET</span> /api/evening/:user</div>
    <div class="endpoint"><span class="method">GET</span> /api/weekly/:user</div>
    <div class="endpoint"><span class="method">GET</span> /api/health</div>
  </div>
</body>
</html>`);
    return;
  }

  if (path === "/api/health") {
    json(res, { status: "ok", mode: DRY_RUN ? "dry-run" : "live", users: listUsers() });
    return;
  }

  const morningMatch = path.match(/^\/api\/morning\/(\w+)$/);
  if (morningMatch) {
    const userName = morningMatch[1];
    let profile;
    try { profile = loadProfile(userName); } catch { json(res, { error: "Unknown user" }, 404); return; }

    if (DRY_RUN) {
      profile.focus_biomarker = determineFocusBiomarker(profile);
      json(res, {
        mode: "dry-run",
        user: profile.user.name,
        focus_biomarker: profile.focus_biomarker,
        prompt_preview: buildMorningPrompt(profile).slice(0, 500) + "...",
        system_prompt_preview: MASTER_SYSTEM_PROMPT.slice(0, 200) + "...",
      });
      return;
    }

    // One NBA per user per day
    if (hasActionToday(userName)) {
      json(res, { error: "NBA already generated today. Check back tomorrow morning." }, 429);
      return;
    }

    const result = await generateMorningNBA(profile);

    // Record the action so history accumulates
    recordAction(userName, {
      date: today(),
      action: result.metadata.action_summary,
      category: result.metadata.action_category,
    });

    json(res, result);
    return;
  }

  const eveningMatch = path.match(/^\/api\/evening\/(\w+)$/);
  if (eveningMatch) {
    const userName = eveningMatch[1];
    let profile;
    try { profile = loadProfile(userName); } catch { json(res, { error: "Unknown user" }, 404); return; }

    const lastAction = profile.action_history[profile.action_history.length - 1];
    const actionSummary = lastAction?.action ?? "15 minute post-lunch walk";

    // Accept user response via POST body, or fall back to mock data for GET
    let userResponse: string;
    let energyLevel = 3;
    let sleepLastNight = profile.lifestyle.sleep_hours_avg;
    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as {
        response?: string;
        energy_level?: number;
        sleep_last_night?: number;
      };
      userResponse = body.response ?? "";
      if (!userResponse) { json(res, { error: "Missing 'response' in POST body" }, 400); return; }
      if (body.energy_level !== undefined) energyLevel = Math.min(5, Math.max(1, body.energy_level));
      if (body.sleep_last_night !== undefined) sleepLastNight = body.sleep_last_night;
    } else {
      // GET fallback with mock responses for testing
      const mockResponses: Record<string, string> = {
        rahul: "Yeah did it, walked for about 12 mins after lunch",
        priya: "Couldn't today, the house was too chaotic with guests",
        vikram: "No, had back to back calls and then crashed",
      };
      userResponse = mockResponses[userName] ?? "Did it";
    }

    if (DRY_RUN) {
      json(res, {
        mode: "dry-run",
        user: profile.user.name,
        action_summary: actionSummary,
        user_response: userResponse,
        prompt_preview: buildEveningPrompt(actionSummary, userResponse),
        system_prompt: EVENING_SYSTEM_PROMPT,
      });
      return;
    }

    const result = await generateEveningCheckIn(actionSummary, userResponse);

    // Record the check-in so history accumulates
    recordCheckIn(userName, {
      date: today(),
      action_taken: result.action_taken,
      notes: userResponse,
      energy_level: energyLevel,
      sleep_last_night: sleepLastNight,
    });

    json(res, result);
    return;
  }

  const weeklyMatch = path.match(/^\/api\/weekly\/(\w+)$/);
  if (weeklyMatch) {
    const userName = weeklyMatch[1];
    let profile;
    try { profile = loadProfile(userName); } catch { json(res, { error: "Unknown user" }, 404); return; }

    if (DRY_RUN) {
      profile.focus_biomarker = determineFocusBiomarker(profile);
      json(res, {
        mode: "dry-run",
        user: profile.user.name,
        focus_biomarker: profile.focus_biomarker,
        prompt_preview: buildWeeklyPrompt(profile).slice(0, 500) + "...",
      });
      return;
    }

    const result = await generateWeeklySummary(profile);
    json(res, result);
    return;
  }

  json(res, { error: "Not found" }, 404);

  } catch (err) {
    console.error("Request error:", err);
    json(res, { error: "Internal server error" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`Decade Engine server running at http://localhost:${PORT}`);
  console.log(`Mode: ${DRY_RUN ? "dry-run (no ANTHROPIC_API_KEY)" : "live"}`);
});
