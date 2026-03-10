import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-20250514";

/** Shared Anthropic client — reused across engine, evaluator, etc. */
export const client = new Anthropic();

/** Maximum request body size in bytes (1 MB). */
export const MAX_BODY_BYTES = 1024 * 1024;
