# decade-engine

> Decade Health — Prompt engine for personalized health coaching

An agentic AI engine that generates personalized daily health recommendations (Next Best Actions) based on a user's biomarkers, lifestyle, and context. Built with TypeScript and powered by the Anthropic Claude API.

## Overview

decade-engine runs a structured AI coaching loop with three modes:

- **Morning** — generates a personalized Next Best Action (NBA) for the day based on biomarkers, lifestyle factors, and current life context
- **Evening** — processes a user's check-in response and logs adherence
- **Weekly** — generates a reflective weekly summary with progress and recommendations

The engine uses an agentic tool-use loop with self-evaluation: after generating a recommendation, a second AI pass evaluates quality and can trigger a regeneration with critique feedback.

## Project Structure

```
src/
  engine.ts          # Core agentic loop and NBA generation
  evaluator.ts       # Self-evaluation pass for NBA quality
  tools.ts           # Tool definitions and handlers
  types.ts           # TypeScript interfaces (UserProfile, NBAOutput, etc.)
  store.ts           # Persistence layer
  server.ts          # Dev server
  index.ts           # Entry point
  config.ts          # Anthropic client and model config
  logic/             # Priority and biomarker logic
  prompts/           # System and user prompt builders
```

## Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

```bash
# Install dependencies
npm install

# Copy environment file and add your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for live mode) | Anthropic API key for Claude. If unset, the engine runs in dry-run/mock mode. |
| `DECADE_API_KEY` | No | When set, the HTTP server requires this value in `Authorization: Bearer <key>` or `X-API-Key: <key>` for `/api/morning`, `/api/evening`, and `/api/weekly`. Leave unset for local dev (no auth). |
| `DECADE_CORS_ORIGIN` | No | Allowed CORS origin for API responses (e.g. `https://yourfrontend.com`). If unset, the server sends `Access-Control-Allow-Origin: *`. |

## Usage

```bash
# Run morning NBA generation
npm run morning

# Run evening check-in
npm run evening

# Run weekly summary
npm run weekly

# Run all three modes in sequence
npm run all

# Start the dev server
npm run dev
```

## How It Works

1. A `UserProfile` is loaded containing biomarkers (HbA1c, glucose, cholesterol, etc.), lifestyle data, recent check-ins, and context for the current week.
2. The priority logic determines which biomarker to focus on.
3. The agentic loop sends a prompt to Claude with tool access, iterating until a final text response is produced (up to 10 tool rounds).
4. The NBA output is evaluated by a second Claude call. If it fails quality criteria, the engine regenerates with the critique injected.
5. Results are persisted via the store module.

## Tech Stack

- **TypeScript** — 100% type-safe codebase
- **Anthropic Claude** (`@anthropic-ai/sdk`) — LLM backbone
- **tsx** — TypeScript execution without a separate build step

## License

MIT
