/**
 * Builds the user prompt for the evening check-in.
 */
export function buildEveningPrompt(
  actionSummary: string,
  userResponse: string
): string {
  return `Today's action was: "${actionSummary}"
User's check-in response: "${userResponse}"

Generate the evening check-in reply (2 sentences max, ONE question only).
Return JSON with "message" (string) and "action_taken" (boolean based on their response).

Return ONLY valid JSON, no markdown fences.`;
}
