import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicLLMClient, MockLLMClient } from "./llm-client.js";
import type { LLMClient } from "./llm-client.js";

export const MODEL = "claude-sonnet-4-20250514";

export const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

export const llm: LLMClient = IS_MOCK
  ? new MockLLMClient()
  : new AnthropicLLMClient(new Anthropic());

/** Maximum request body size in bytes (1 MB). */
export const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Optional API key for server auth. When set, requests must include
 * Authorization: Bearer <key> or X-API-Key: <key>. Leave unset for local dev.
 */
export const DECADE_API_KEY = process.env.DECADE_API_KEY ?? "";

/** In production, restrict CORS to this origin. In dev, "*" is used. */
export const DECADE_CORS_ORIGIN = process.env.DECADE_CORS_ORIGIN ?? "";
