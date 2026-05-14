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
    prompt: "Good news deserves witnesses.",
    guidance: "Bring momentum, joy, and loud support.",
    tone: "High-energy validation",
    audienceLabel: "Best for wins, launches, tiny breakthroughs, and confidence boosts.",
    replies: [
      "This is a real milestone. Keep going and let people see it.",
      "You did the hard part already. Own the win instead of shrinking it.",
      "Post the update, ship the idea, and let the moment be big.",
    ],
    accent: "var(--mode-hype)",
  },
  {
    id: "comfort",
    name: "Comfort Me",
    shortLabel: "Hold space for me",
    prompt: "Not every post needs advice first.",
    guidance: "Lead with empathy, calm, and softness.",
    tone: "Gentle reassurance",
    audienceLabel: "Best for grief, uncertainty, burnout, and low-energy days.",
    replies: [
      "You do not have to solve everything tonight. Rest still counts.",
      "That sounds heavy. I am glad you said it out loud instead of carrying it alone.",
      "Nothing about this makes you weak. It makes you human.",
    ],
    accent: "var(--mode-comfort)",
  },
  {
    id: "advise",
    name: "Advise Me",
    shortLabel: "Help me think",
    prompt: "Useful feedback, not vague cheering.",
    guidance: "Be practical, clear, and kind.",
    tone: "Constructive problem solving",
    audienceLabel: "Best for decisions, blockers, strategy, and next-step planning.",
    replies: [
      "Reduce the scope to one testable slice and learn from that first.",
      "Your problem sounds less like motivation and more like overload. Cut two variables.",
      "Write down the exact decision you are stuck on, then compare only three options.",
    ],
    accent: "var(--mode-advise)",
  },
  {
    id: "soft-truth",
    name: "Soft Truth",
    shortLabel: "Be honest, gently",
    prompt: "Candor without blunt-force damage.",
    guidance: "Say the hard thing with care and context.",
    tone: "Compassionate honesty",
    audienceLabel: "Best for patterns, self-awareness, and difficult perspective shifts.",
    replies: [
      "I think you already know the answer, but you keep waiting for it to feel easier.",
      "Part of the pain here may be coming from staying in a situation you have outgrown.",
      "You are not failing. You may just be trying to carry something that is not yours now.",
    ],
    accent: "var(--mode-soft-truth)",
  },
  {
    id: "challenge",
    name: "Challenge Me",
    shortLabel: "Push me forward",
    prompt: "Pressure with purpose.",
    guidance: "Demand clarity, accountability, and action.",
    tone: "Sharp accountability",
    audienceLabel: "Best for procrastination, fear, discipline, and performance slumps.",
    replies: [
      "If this matters, stop polishing your plan and take the first visible action today.",
      "You do not need more inspiration. You need a deadline and a consequence.",
      "Name the thing you are avoiding. That is probably the task that matters most.",
    ],
    accent: "var(--mode-challenge)",
  },
  {
    id: "listen",
    name: "Just Listen",
    shortLabel: "No fixing right now",
    prompt: "Sometimes presence is enough.",
    guidance: "Respond lightly or simply witness.",
    tone: "Quiet presence",
    audienceLabel: "Best for venting, processing, and saying the thing before it hardens.",
    replies: [
      "Heard. You do not need to package this neatly for it to matter.",
      "Staying with you in it. No solution pressure.",
      "You can leave this here exactly as it is.",
    ],
    accent: "var(--mode-listen)",
  },
];

export function getMode(modeId: ModeId) {
  return modes.find((mode) => mode.id === modeId)!;
}
