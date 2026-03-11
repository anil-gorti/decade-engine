import type Anthropic from "@anthropic-ai/sdk";

type MessageCreateParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Messages.Message;
type ContentBlock = Anthropic.Messages.ContentBlock;

export type { MessageCreateParams, Message };

export interface LLMClient {
  createMessage(params: MessageCreateParams): Promise<Message>;
}

export class AnthropicLLMClient implements LLMClient {
  private client: Anthropic;

  constructor(client: Anthropic) {
    this.client = client;
  }

  async createMessage(params: MessageCreateParams): Promise<Message> {
    return this.client.messages.create(params);
  }
}

function buildMessage(content: ContentBlock[], stopReason: Message["stop_reason"]): Message {
  return {
    id: `mock_${Date.now()}`,
    type: "message",
    role: "assistant",
    content,
    model: "mock",
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as Message;
}

function extractSystemText(system: MessageCreateParams["system"]): string {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system.map((s) => ("text" in s ? s.text : "")).join("");
  }
  return "";
}

export class MockLLMClient implements LLMClient {
  private delay: number;

  constructor(delay = 1000) {
    this.delay = delay;
  }

  async createMessage(params: MessageCreateParams): Promise<Message> {
    await new Promise((r) => setTimeout(r, this.delay));

    const hasTools = params.tools && params.tools.length > 0;

    if (hasTools) {
      const hasToolResult = params.messages.some(
        (m) =>
          Array.isArray(m.content) &&
          (m.content as Array<{ type: string }>).some((c) => c.type === "tool_result")
      );

      if (!hasToolResult) {
        return buildMessage(
          [
            { type: "tool_use", id: "mock_1", name: "get_flagged_biomarkers", input: {} },
            { type: "tool_use", id: "mock_2", name: "get_coach_notes", input: { count: 3 } },
            { type: "tool_use", id: "mock_3", name: "get_weather_aqi", input: {} },
            { type: "tool_use", id: "mock_4", name: "get_streak", input: {} },
          ] as ContentBlock[],
          "tool_use"
        );
      }

      return buildMessage(
        [
          {
            type: "text" as const,
            text: JSON.stringify({
              message:
                "I see you're in a heavy sprint week. With your A1C borderline, let's keep it super easy today: Just stand up and stretch for 2 minutes after lunch. No prep needed.",
              metadata: {
                action_category: "movement",
                action_summary: "2 min stretch after lunch",
                biomarker_targeted: "hba1c",
                chaos_adjusted: true,
                identity_anchor_used: false,
                difficulty_level: "easy",
                estimated_minutes: 2,
              },
            }),
          },
        ] as ContentBlock[],
        "end_turn"
      );
    }

    const systemText = extractSystemText(params.system);

    if (systemText.includes("quality evaluator")) {
      return buildMessage(
        [{ type: "text" as const, text: JSON.stringify({ pass: true, critique: "" }) }] as ContentBlock[],
        "end_turn"
      );
    }

    if (systemText.includes("evening check-in")) {
      return buildMessage(
        [
          {
            type: "text" as const,
            text: JSON.stringify({
              message: "Solid effort today! Get some rest, tomorrow is a new day.",
              action_taken: true,
              coach_note: "User seemed responsive today despite the heavy week. Keep actions small.",
            }),
          },
        ] as ContentBlock[],
        "end_turn"
      );
    }

    return buildMessage(
      [
        {
          type: "text" as const,
          text: JSON.stringify({
            message:
              "Here is your mock weekly summary! You did a great job holding the line this week. Let's focus on recovery next.",
          }),
        },
      ] as ContentBlock[],
      "end_turn"
    );
  }
}
