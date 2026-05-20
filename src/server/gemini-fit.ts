import { getMode, type ModeId } from "../modes";
import type { AlignmentResult } from "./types";

type CommentFitContext = {
  postContent: string;
  responseMode: ModeId;
  roomRules?: string;
};

type GeminiFitResult = {
  result: AlignmentResult;
  provider: "heuristic" | "gemini";
  model: string | null;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_TIMEOUT_MS = 8000;

function getGeminiModel() {
  return process.env.GEMINI_FIT_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

export function isGeminiFitAvailable() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return false;
  }

  return Boolean(getGeminiApiKey());
}

function normalizeClassification(value: unknown): AlignmentResult["classification"] {
  switch (value) {
    case "match":
    case "acceptable":
    case "borderline":
    case "violation":
      return value;
    default:
      return "acceptable";
  }
}

function normalizeGeminiPayload(
  payload: unknown,
  heuristic: AlignmentResult,
): AlignmentResult | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const classification = normalizeClassification(record.classification);
  const alignmentScoreRaw =
    typeof record.alignmentScore === "number"
      ? record.alignmentScore
      : Number(record.alignmentScore);

  if (!Number.isFinite(alignmentScoreRaw)) {
    return null;
  }

  const reason =
    typeof record.reason === "string" && record.reason.trim()
      ? record.reason.trim()
      : heuristic.reason;

  const suggestedRewrite =
    typeof record.suggestedRewrite === "string" && record.suggestedRewrite.trim()
      ? record.suggestedRewrite.trim()
      : classification === "match"
        ? null
        : heuristic.suggestedRewrite;

  return {
    alignmentScore: Math.max(0, Math.min(100, Math.round(alignmentScoreRaw))),
    classification,
    reason,
    suggestedRewrite,
  };
}

export async function analyzeCommentFitWithGemini(input: {
  context: CommentFitContext;
  commentContent: string;
  heuristic: AlignmentResult;
}): Promise<GeminiFitResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey || process.env.NODE_ENV === "test" || process.env.VITEST) {
    return {
      result: input.heuristic,
      provider: "heuristic",
      model: null,
    };
  }

  const model = getGeminiModel();
  const mode = getMode(input.context.responseMode);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = [
    "You evaluate whether a reply fits the emotional and practical ask of a post.",
    "Return strict JSON only.",
    'Use one classification: "match", "acceptable", "borderline", or "violation".',
    "Score from 0 to 100.",
    "The reply must fit both the selected response mode and the actual substance of the post.",
    "If the reply ignores the post's real problem, mark it down even if the tone seems superficially correct.",
    "If the reply is harsh, unsafe, dismissive, or directly breaks the ask, classify it as violation.",
    "Only include a suggestedRewrite when the reply is not a strong fit.",
  ].join(" ");

  const prompt = [
    `Mode: ${mode.name}`,
    `Mode prompt: ${mode.prompt}`,
    `Mode guidance: ${mode.guidance}`,
    `Original post: ${input.context.postContent}`,
    input.context.roomRules ? `Room rules: ${input.context.roomRules}` : null,
    `Reply to evaluate: ${input.commentContent}`,
    `Current heuristic assessment: ${input.heuristic.classification} (${input.heuristic.alignmentScore}/100)`,
    `Current heuristic reason: ${input.heuristic.reason}`,
    'Return JSON with keys: alignmentScore, classification, reason, suggestedRewrite.',
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.15,
            topP: 0.8,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        return {
          result: input.heuristic,
          provider: "heuristic",
          model,
        };
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const text =
        payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("")
          .trim() ?? "";

      if (!text) {
        return {
          result: input.heuristic,
          provider: "heuristic",
          model,
        };
      }

      const parsed = normalizeGeminiPayload(JSON.parse(text), input.heuristic);

      if (!parsed) {
        return {
          result: input.heuristic,
          provider: "heuristic",
          model,
        };
      }

      return {
        result: parsed,
        provider: "gemini",
        model,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return {
      result: input.heuristic,
      provider: "heuristic",
      model,
    };
  }
}
