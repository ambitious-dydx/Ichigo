import { getMode, type ModeId } from "../modes";
import type { AlignmentResult } from "./types";

const harmfulPhrases = [
  "shut up",
  "kill yourself",
  "you're pathetic",
  "nobody cares",
  "stop being sensitive",
  "attention seeker",
];

const modeSignals: Record<
  ModeId,
  { positive: string[]; negative: string[]; rewrite: string }
> = {
  hype: {
    positive: ["amazing", "proud", "huge", "celebrate", "big step", "let's go", "love this"],
    negative: ["but", "however", "should have", "not enough"],
    rewrite: "This is a meaningful step. Let yourself take the win and keep the momentum going.",
  },
  comfort: {
    positive: ["that sounds hard", "i'm sorry", "with you", "rest", "gentle", "makes sense"],
    negative: ["move on", "stop", "get over", "too sensitive", "just"],
    rewrite: "That sounds painful. It makes sense that it affected you, and you do not have to rush past it.",
  },
  advise: {
    positive: ["try", "consider", "next step", "focus on", "option", "decision", "reduce"],
    negative: ["whatever", "just vibe", "no clue", "can't help"],
    rewrite: "Try narrowing the decision to one concrete next step and compare only the options that matter now.",
  },
  "soft-truth": {
    positive: ["i think", "gently", "honestly", "it may be", "hard truth", "with care"],
    negative: ["obviously", "stupid", "you always", "grow up"],
    rewrite: "I think the difficult part may be that you already know what needs to change, even if it is uncomfortable.",
  },
  challenge: {
    positive: ["do it", "deadline", "action", "stop waiting", "commit", "accountability"],
    negative: ["it's fine", "take your time forever", "no pressure", "someday"],
    rewrite: "If this matters, set a deadline and take the first visible action instead of waiting for the perfect mood.",
  },
  listen: {
    positive: ["heard", "with you", "no advice", "holding space", "listening"],
    negative: ["you need to", "here's what to do", "fix", "solution"],
    rewrite: "Heard. You do not need to clean this up for it to belong here.",
  },
};

export function classifyCommentAlignment(input: {
  postContent: string;
  responseMode: ModeId;
  commentContent: string;
  priorConversationContext?: string;
  roomRules?: string;
}): AlignmentResult {
  const normalizedComment = input.commentContent.trim().toLowerCase();
  const signals = modeSignals[input.responseMode];
  const mode = getMode(input.responseMode);

  if (!normalizedComment) {
    return {
      alignmentScore: 0,
      classification: "violation",
      reason: "Empty comments do not meet the response contract.",
      suggestedRewrite: signals.rewrite,
    };
  }

  let score = 58;

  for (const phrase of harmfulPhrases) {
    if (normalizedComment.includes(phrase)) {
      return {
        alignmentScore: 4,
        classification: "violation",
        reason: "The reply contains language that fails Ichigo's safety standards.",
        suggestedRewrite: signals.rewrite,
      };
    }
  }

  for (const phrase of signals.positive) {
    if (normalizedComment.includes(phrase)) {
      score += 10;
    }
  }

  for (const phrase of signals.negative) {
    if (normalizedComment.includes(phrase)) {
      score -= 16;
    }
  }

  if (input.roomRules && normalizedComment.includes("ignore the rules")) {
    score -= 20;
  }

  if (normalizedComment.length < 14) {
    score -= 8;
  }

  const classification =
    score >= 82 ? "match" : score >= 65 ? "acceptable" : score >= 42 ? "borderline" : "violation";

  const reasonByClass: Record<typeof classification, string> = {
    match: `This reply fits ${mode.name} well and respects the emotional context.`,
    acceptable: `This reply is broadly compatible with ${mode.name}, though it could be more tailored.`,
    borderline: `This reply partly misses ${mode.name} and risks feedback mismatch.`,
    violation: `This reply does not respect the ${mode.name} contract for this post.`,
  };

  return {
    alignmentScore: Math.max(0, Math.min(100, score)),
    classification,
    reason: reasonByClass[classification],
    suggestedRewrite: classification === "match" ? null : signals.rewrite,
  };
}

export function suggestModeFromContent(content: string): ModeId {
  const normalized = content.toLowerCase();

  if (/\b(tired|hurt|sad|grief|overwhelmed|heavy|drained)\b/.test(normalized)) {
    return "comfort";
  }

  if (/\b(should i|what do i do|help me decide|which option|advice)\b/.test(normalized)) {
    return "advise";
  }

  if (/\b(call me out|push me|challenge|accountability|deadline)\b/.test(normalized)) {
    return "challenge";
  }

  if (/\b(be honest|truth|tell me straight|am i wrong)\b/.test(normalized)) {
    return "soft-truth";
  }

  if (/\b(listen|vent|just need to say|no advice)\b/.test(normalized)) {
    return "listen";
  }

  if (/\b(launched|won|shipped|finally did it|celebrate)\b/.test(normalized)) {
    return "hype";
  }

  return "advise";
}
