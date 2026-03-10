import type { UserProfile } from "../types.js";

/**
 * Generates chaos context modifier text to inject into the prompt
 * when the user's week is disrupted.
 */
export function buildChaosModifier(chaos: UserProfile["chaos_context"]): string {
  const lines: string[] = [];

  if (chaos.travel) {
    lines.push(
      "This user is travelling this week. Do not recommend meal changes or cooking-based " +
      "actions. Focus on movement, sleep, or hydration actions that work in a hotel or " +
      "airport context."
    );
  }

  if (chaos.festival_or_event) {
    lines.push(
      `There is ${chaos.festival_or_event} this week. The user will face social eating pressure ` +
      "and disrupted routine. Do not fight the festival. Recommend a small protective action " +
      "that works around it, not against it. E.g. a walk before the family meal rather than " +
      "skipping the meal."
    );
  }

  if (chaos.work_intensity === "heavy") {
    lines.push(
      "The user has a heavy work week. Recommend the minimum viable health action " +
      "— something that takes less than 15 minutes and can be done without planning."
    );
  }

  if (chaos.family_demands === "high") {
    lines.push(
      "Family demands are high this week. Anchor the action to something the user can do " +
      "while still being present — a walk with family, a meal they can request rather than " +
      "cook, a sleep target that doesn't require isolation."
    );
  }

  if (lines.length === 0) return "";

  return "\nCHAOS CONTEXT MODIFIERS:\n" + lines.join("\n") + "\n";
}
