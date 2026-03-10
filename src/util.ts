let mockDate: string | null = null;
export function setMockDate(date: string) { mockDate = date; }

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
