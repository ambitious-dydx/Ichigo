import { describe, expect, it } from "vitest";
import { getWorkspaceNotice } from "../src/workspace-notices";

describe("workspace notices", () => {
  it("returns success copy for relationship actions", () => {
    expect(getWorkspaceNotice("user-muted", undefined)).toEqual({
      tone: "success",
      text: "That person is muted. Their posts and replies will stop showing up for you.",
    });
    expect(getWorkspaceNotice("user-unblocked", undefined)).toEqual({
      tone: "success",
      text: "That person is no longer blocked.",
    });
  });

  it("returns success copy for room and profile actions", () => {
    expect(getWorkspaceNotice("room-created", undefined)).toEqual({
      tone: "success",
      text: "Your room is live. People can join it now.",
    });
    expect(getWorkspaceNotice("profile-saved", undefined)).toEqual({
      tone: "success",
      text: "Your profile was updated.",
    });
  });

  it("returns error copy for room and moderation rate limits", () => {
    expect(getWorkspaceNotice(undefined, "invalid-room")).toEqual({
      tone: "error",
      text: "Give the room a name, a purpose, and a valid visibility setting.",
    });
    expect(getWorkspaceNotice(undefined, "report-rate-limited")).toEqual({
      tone: "error",
      text: "You have filed too many reports in a short window. Pause, then try again.",
    });
  });
});
