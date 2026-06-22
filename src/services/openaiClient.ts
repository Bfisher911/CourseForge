// Browser-side helper for talking to OpenAI *through* our Netlify Function proxy
// (netlify/functions/openai.ts). The secret OPENAI_API_KEY lives only on the server,
// so this file never sees or sends it — it just POSTs chat messages to our own endpoint.

export type ChatRole = "system" | "developer" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  /** Overrides the server default (OPENAI_MODEL env, else gpt-4o-mini). */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Passed through to OpenAI, e.g. { type: "json_object" } for JSON-mode output. */
  responseFormat?: Record<string, unknown>;
  /** Allows the caller to cancel the request (e.g. on unmount). */
  signal?: AbortSignal;
}

export interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  finishReason: string | null;
  usage: ChatCompletionUsage | null;
}

export const OPENAI_PROXY_ENDPOINT = "/.netlify/functions/openai";

/**
 * Send chat messages to OpenAI via the server proxy.
 * Throws an Error (with the server's message) on any non-2xx response.
 */
export const requestChatCompletion = async (request: ChatCompletionRequest): Promise<ChatCompletionResult> => {
  const { signal, ...payload } = request;

  let response: Response;
  try {
    response = await fetch(OPENAI_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(
      "Could not reach the OpenAI proxy. If you're running locally, start the app with `netlify dev` (plain `vite` does not serve Netlify Functions)."
    );
  }

  const data = (await response.json().catch(() => null)) as
    | (ChatCompletionResult & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `OpenAI proxy returned ${response.status}.`);
  }

  return data as ChatCompletionResult;
};

/**
 * Convenience: turn a prompt template's instruction fields plus a filled-in user
 * prompt into a `messages` array. Developer instructions are sent as a second system
 * message for broad model compatibility (not every model accepts the `developer` role).
 */
export const buildChatMessages = (
  userPrompt: string,
  instructions: { systemInstructions?: string; developerInstructions?: string } = {}
): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  if (instructions.systemInstructions?.trim()) {
    messages.push({ role: "system", content: instructions.systemInstructions.trim() });
  }
  if (instructions.developerInstructions?.trim()) {
    messages.push({ role: "system", content: instructions.developerInstructions.trim() });
  }
  messages.push({ role: "user", content: userPrompt });
  return messages;
};
