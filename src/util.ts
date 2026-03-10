let mockDate: string | null = null;
export function setMockDate(date: string) { mockDate = date; }

/** Error thrown when LLM output cannot be parsed as valid JSON. */
export class LLMParseError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_json" | "empty" | "no_object",
    public readonly rawPreview: string
  ) {
    super(message);
    this.name = "LLMParseError";
  }
}

/**
 * Extract the first JSON value (object or array) from raw LLM text.
 * Handles markdown code fences, leading/trailing text, and common formatting issues.
 */
function extractJSONString(raw: string): string {
  let text = raw.trim();
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/m);
  if (fenceMatch) text = fenceMatch[1].trim();
  // Find first { or [ and matching closing bracket
  const startObj = text.indexOf("{");
  const startArr = text.indexOf("[");
  let start: number, endChar: string;
  if (startObj >= 0 && (startArr < 0 || startObj < startArr)) {
    start = startObj;
    endChar = "}";
  } else if (startArr >= 0) {
    start = startArr;
    endChar = "]";
  } else {
    throw new LLMParseError("No JSON object or array found in response", "no_object", raw.slice(0, 300));
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  let quoteChar = "";
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === quoteChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quoteChar = c;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        let slice = text.slice(start, i + 1);
        // Remove trailing commas before } or ]
        slice = slice.replace(/,(\s*[}\]])/g, "$1");
        return slice;
      }
    }
  }
  throw new LLMParseError("Unclosed JSON in response", "invalid_json", raw.slice(0, 300));
}

/**
 * Parse LLM output as JSON. Uses robust extraction and throws LLMParseError
 * with code and rawPreview for logging when parsing fails.
 */
export function parseLLMJSON<T>(raw: string): T {
  if (!raw || !raw.trim()) {
    throw new LLMParseError("Empty LLM response", "empty", raw);
  }
  const jsonString = extractJSONString(raw);
  try {
    return JSON.parse(jsonString) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new LLMParseError(`JSON parse error: ${msg}`, "invalid_json", raw.slice(0, 300));
  }
}

/**
 * Returns today's date as YYYY-MM-DD.
 */
export function today(): string {
  if (mockDate) return mockDate;
  return new Date().toISOString().slice(0, 10);
}

/**
 * Controls whether the agentic loop logs tool calls and eval results.
 * Enabled for CLI, disabled for server by default.
 */
let _verbose = false;

export function setVerbose(v: boolean): void {
  _verbose = v;
}

export function isVerbose(): boolean {
  return _verbose;
}

export function verboseLog(message: string): void {
  if (_verbose) console.log(message);
}
