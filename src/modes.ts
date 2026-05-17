export type ModeId =
  | "hype"
  | "comfort"
  | "advise"
  | "soft-truth"
  | "challenge"
  | "listen";

export type Mode = {
  id: ModeId;
  name: string;
  shortLabel: string;
  prompt: string;
  guidance: string;
  tone: string;
  audienceLabel: string;
  replies: string[];
  accent: string;
};

export const modes: Mode[] = [
  {
    id: "hype",
    name: "Hype Me",
    shortLabel: "Celebrate with me",
    prompt: "I want encouragement, not critique.",
    guidance: "Cheer me on. Let this feel like a win.",
    tone: "Warm celebration",
    audienceLabel: "Best for wins, launches, brave first steps, and moments you want people to celebrate with you.",
    replies: [
      "This is worth celebrating. Let it be as big as it feels.",
      "You did something real here. Do not rush past it.",
      "This is momentum. Keep going.",
    ],
    accent: "var(--mode-hype)",
  },
  {
    id: "comfort",
    name: "Comfort Me",
    shortLabel: "Hold space for me",
    prompt: "I need care before advice.",
    guidance: "Be gentle. Help me feel less alone.",
    tone: "Steady comfort",
    audienceLabel: "Best for grief, uncertainty, burnout, heartbreak, and low-energy days.",
    replies: [
      "You do not have to solve this right now.",
      "That sounds heavy. I am glad you said it out loud.",
      "Nothing about this makes you too much.",
    ],
    accent: "var(--mode-comfort)",
  },
  {
    id: "advise",
    name: "Advise Me",
    shortLabel: "Help me think",
    prompt: "Help me think this through.",
    guidance: "Be useful, specific, and kind.",
    tone: "Clear guidance",
    audienceLabel: "Best for decisions, blockers, strategy, and next-step planning.",
    replies: [
      "Shrink this to one clear next step and test that first.",
      "You may not need more motivation. You may need less scope.",
      "Name the exact decision, then compare only a few real options.",
    ],
    accent: "var(--mode-advise)",
  },
  {
    id: "soft-truth",
    name: "Soft Truth",
    shortLabel: "Be honest, gently",
    prompt: "Tell me the truth, but hold it with care.",
    guidance: "Be honest without being harsh.",
    tone: "Compassionate honesty",
    audienceLabel: "Best for patterns, self-awareness, and difficult perspective shifts.",
    replies: [
      "You may already know what you need to do, even if it still feels hard.",
      "Part of the pain may be coming from staying somewhere you have outgrown.",
      "This does not look like failure. It looks like carrying too much for too long.",
    ],
    accent: "var(--mode-soft-truth)",
  },
  {
    id: "challenge",
    name: "Challenge Me",
    shortLabel: "Push me forward",
    prompt: "Push me. Do not let me hide.",
    guidance: "Be direct. Ask more of me.",
    tone: "Direct accountability",
    audienceLabel: "Best for procrastination, fear, discipline, and performance slumps.",
    replies: [
      "If this matters, take the first visible step today.",
      "You do not need another perfect plan. You need movement.",
      "The thing you keep avoiding is probably the thing to do next.",
    ],
    accent: "var(--mode-challenge)",
  },
  {
    id: "listen",
    name: "Just Listen",
    shortLabel: "No fixing right now",
    prompt: "I do not need fixing right now.",
    guidance: "Stay with me. Do not rush to solve it.",
    tone: "Quiet presence",
    audienceLabel: "Best for venting, processing, and saying the thing before it hardens.",
    replies: [
      "Heard. You do not need to clean this up for it to matter.",
      "I am with you in it. No fixing.",
      "You can leave this here exactly as it is.",
    ],
    accent: "var(--mode-listen)",
  },
];

export function getMode(modeId: ModeId) {
  return modes.find((mode) => mode.id === modeId)!;
}
