import Anthropic from "@anthropic-ai/sdk";

// LiteLLM proxy exposes an Anthropic-compatible /v1/messages endpoint;
// when LITE_LLM_HOST is set we route through it, otherwise use Anthropic directly.
const liteLlmHost = process.env.LITE_LLM_HOST;

export const client = new Anthropic(
  liteLlmHost ? { baseURL: liteLlmHost, apiKey: process.env.LITE_LLM_KEY } : {},
);

export const MODEL = liteLlmHost
  ? "anthropic/claude-haiku-4-5-20251001"
  : "claude-haiku-4-5-20251001";
