import { describe, expect, it } from "vitest";
import {
  classifyCommentAlignment,
  suggestModeFromContent,
} from "../src/server/mode-alignment";

describe("mode alignment", () => {
  it("flags harmful comments as violations", () => {
    const result = classifyCommentAlignment({
      postContent: "I am struggling and need support.",
      responseMode: "comfort",
      commentContent: "Nobody cares. Shut up.",
    });

    expect(result.classification).toBe("violation");
    expect(result.alignmentScore).toBeLessThan(10);
    expect(result.suggestedRewrite).toBeTruthy();
  });

  it("rewards comments that match the requested mode", () => {
    const result = classifyCommentAlignment({
      postContent: "I need help deciding what to do next.",
      responseMode: "advise",
      commentContent: "Try comparing the next step for each option and focus on the one that reduces the decision.",
    });

    expect(["match", "acceptable"]).toContain(result.classification);
    expect(result.alignmentScore).toBeGreaterThanOrEqual(65);
  });

  it("penalizes replies that fit the mode loosely but miss the actual ask", () => {
    const result = classifyCommentAlignment({
      postContent: "I have three directions for my side project and need help narrowing the decision.",
      responseMode: "advise",
      commentContent: "Try getting more sleep and drink more water this week.",
    });

    expect(["borderline", "violation"]).toContain(result.classification);
    expect(result.alignmentScore).toBeLessThan(65);
  });

  it("suggests the expected response mode from content", () => {
    expect(suggestModeFromContent("Today feels heavy and I am overwhelmed.")).toBe("comfort");
    expect(suggestModeFromContent("Should I choose option A or B? Help me decide.")).toBe("advise");
    expect(suggestModeFromContent("Call me out and hold me accountable.")).toBe("challenge");
    expect(suggestModeFromContent("I just need to say this out loud.")).toBe("listen");
    expect(suggestModeFromContent("I finally shipped it. Celebrate with me.")).toBe("hype");
  });
});
