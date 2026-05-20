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

const lowValuePhrases = [
  "whatever",
  "who cares",
  "just deal with it",
  "not my problem",
  "figure it out",
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "before",
  "but",
  "by",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "up",
  "was",
  "we",
  "what",
  "when",
  "with",
  "you",
  "your",
]);

const empathySignals = [
  "that sounds hard",
  "that sounds painful",
  "i'm sorry",
  "i am sorry",
  "makes sense",
  "with you",
  "that sounds heavy",
];

const actionSignals = [
  "try",
  "consider",
  "start",
  "pick",
  "choose",
  "commit",
  "set a deadline",
  "next step",
  "focus on",
  "reduce",
  "test",
  "ship",
];

const listeningSignals = [
  "i hear you",
  "heard",
  "holding space",
  "you do not need to fix this right now",
  "no advice",
  "i'm listening",
];

const hedgingSignals = [
  "i think",
  "it may be",
  "it might be",
  "honestly",
  "gently",
  "with care",
  "hard truth",
];

const accountabilitySignals = [
  "do it",
  "stop waiting",
  "commit",
  "deadline",
  "today",
  "now",
  "hold yourself",
  "accountability",
];

const celebrationSignals = [
  "amazing",
  "huge",
  "proud",
  "love this",
  "well done",
  "let's go",
  "congrats",
];

const softenSignals = [
  "no pressure",
  "whenever you're ready",
  "take your time forever",
  "someday",
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

function countMatches(text: string, phrases: string[]) {
  return phrases.reduce(
    (total, phrase) => total + (text.includes(phrase) ? 1 : 0),
    0,
  );
}

function extractMeaningfulTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function getKeywordOverlap(postContent: string, commentContent: string) {
  const postTokens = Array.from(new Set(extractMeaningfulTokens(postContent)));
  const commentTokens = new Set(extractMeaningfulTokens(commentContent));

  const overlapCount = postTokens.filter((token) => commentTokens.has(token)).length;
  return {
    overlapCount,
    postTokenCount: postTokens.length,
  };
}

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

  let score = 52;
  const positiveNotes: string[] = [];
  const negativeNotes: string[] = [];

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

  for (const phrase of lowValuePhrases) {
    if (normalizedComment.includes(phrase)) {
      score -= 18;
      negativeNotes.push("It reads as dismissive instead of helpful.");
      break;
    }
  }

  for (const phrase of signals.positive) {
    if (normalizedComment.includes(phrase)) {
      score += 8;
    }
  }

  for (const phrase of signals.negative) {
    if (normalizedComment.includes(phrase)) {
      score -= 14;
    }
  }

  const overlap = getKeywordOverlap(input.postContent, normalizedComment);

  if (overlap.postTokenCount > 0) {
    if (overlap.overlapCount >= 3) {
      score += 12;
      positiveNotes.push("It clearly engages with the substance of the post.");
    } else if (overlap.overlapCount === 2) {
      score += 8;
      positiveNotes.push("It stays connected to the actual problem in the post.");
    } else if (overlap.overlapCount === 1) {
      score += 3;
    } else {
      score -= 12;
      negativeNotes.push("It barely addresses what the post is actually about.");
    }
  }

  if (input.roomRules && normalizedComment.includes("ignore the rules")) {
    score -= 20;
    negativeNotes.push("It explicitly pushes against the room rules.");
  }

  const wordCount = normalizedComment.split(/\s+/).filter(Boolean).length;

  if (wordCount < 8) {
    score -= 12;
    negativeNotes.push("It is too thin to feel considered.");
  } else if (wordCount >= 16) {
    score += 4;
  }

  const empathyCount = countMatches(normalizedComment, empathySignals);
  const actionCount = countMatches(normalizedComment, actionSignals);
  const listeningCount = countMatches(normalizedComment, listeningSignals);
  const hedgingCount = countMatches(normalizedComment, hedgingSignals);
  const accountabilityCount = countMatches(normalizedComment, accountabilitySignals);
  const celebrationCount = countMatches(normalizedComment, celebrationSignals);
  const softenCount = countMatches(normalizedComment, softenSignals);

  switch (input.responseMode) {
    case "comfort":
      if (empathyCount > 0) {
        score += 12;
        positiveNotes.push("It offers care before trying to fix the situation.");
      } else if (actionCount > 0) {
        score -= 12;
        negativeNotes.push("It jumps to fixing the problem without enough care.");
      }
      break;
    case "advise":
      if (actionCount > 0) {
        score += 12;
        positiveNotes.push("It gives a concrete next step instead of staying vague.");
      } else {
        score -= 10;
        negativeNotes.push("It does not give a clear next move.");
      }
      break;
    case "soft-truth":
      if (hedgingCount > 0) {
        score += 10;
        positiveNotes.push("It stays honest without losing care.");
      } else {
        score -= 10;
        negativeNotes.push("It lacks the careful honesty this mode asks for.");
      }
      break;
    case "challenge":
      if (accountabilityCount > 0) {
        score += 12;
        positiveNotes.push("It applies real pressure toward action.");
      }
      if (softenCount > 0) {
        score -= 14;
        negativeNotes.push("It softens the pressure instead of challenging the poster.");
      }
      break;
    case "listen":
      if (listeningCount > 0) {
        score += 12;
        positiveNotes.push("It stays present without hijacking the moment.");
      }
      if (actionCount > 0) {
        score -= 16;
        negativeNotes.push("It starts giving instructions when the ask was to listen.");
      }
      break;
    case "hype":
      if (celebrationCount > 0) {
        score += 12;
        positiveNotes.push("It adds momentum and celebrates the moment.");
      }
      break;
    default:
      break;
  }

  const classification =
    score >= 82 ? "match" : score >= 65 ? "acceptable" : score >= 42 ? "borderline" : "violation";

  const defaultReasonByClass: Record<typeof classification, string> = {
    match: `This reply fits ${mode.name} well and respects the ask behind the post.`,
    acceptable: `This reply is broadly compatible with ${mode.name}, though it could be more tailored to the actual ask.`,
    borderline: `This reply partly misses ${mode.name} and risks feedback mismatch.`,
    violation: `This reply does not respect the ${mode.name} contract for this post.`,
  };

  let reason = defaultReasonByClass[classification];

  if (classification === "match" && positiveNotes.length) {
    reason = positiveNotes[0];
  } else if (classification === "acceptable" && positiveNotes.length) {
    reason = negativeNotes.length
      ? `${positiveNotes[0]} ${negativeNotes[0]}`
      : positiveNotes[0];
  } else if ((classification === "borderline" || classification === "violation") && negativeNotes.length) {
    reason = negativeNotes[0];
  }

  return {
    alignmentScore: Math.max(0, Math.min(100, score)),
    classification,
    reason,
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
