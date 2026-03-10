import type { UserProfile } from "./types.js";

const DEFAULT_ACTION_SUMMARY = "15 minute post-lunch walk";

/** Last assigned action text for evening context, or a sensible default. */
export function getLastActionSummary(profile: UserProfile): string {
  const last = profile.action_history[profile.action_history.length - 1];
  return last?.action ?? DEFAULT_ACTION_SUMMARY;
}

const DEFAULT_EVENING_RESPONSES: Record<string, string> = {
  rahul: "Yeah did it, walked for about 12 mins after lunch",
  priya: "Couldn't today, the house was too chaotic with guests",
  vikram: "No, had back to back calls and then crashed",
};

/** Default user response for evening check-in when not provided (e.g. GET or CLI mock). */
export function getDefaultEveningUserResponse(userName: string): string {
  return DEFAULT_EVENING_RESPONSES[userName] ?? "Did it";
}
