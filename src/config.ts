import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-20250514";

/** Shared Anthropic client — reused across engine, evaluator, etc. */
export const client = new Anthropic();

/** Maximum request body size in bytes (1 MB). */
export const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Optional API key for server auth. When set, requests must include
 * Authorization: Bearer <key> or X-API-Key: <key>. Leave unset for local dev.
 */
export const DECADE_API_KEY = process.env.DECADE_API_KEY ?? "";

/** In production, restrict CORS to this origin. In dev, "*" is used. */
export const DECADE_CORS_ORIGIN = process.env.DECADE_CORS_ORIGIN ?? "";
