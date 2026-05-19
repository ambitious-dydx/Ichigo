export type WorkspaceNotice = {
  tone: "success" | "error";
  text: string;
} | null;

export function getWorkspaceNotice(success?: string, error?: string): WorkspaceNotice {
  switch (success) {
    case "user-muted":
      return {
        tone: "success",
        text: "That person is muted. Their posts and replies will stop showing up for you.",
      };
    case "user-blocked":
      return {
        tone: "success",
        text: "That person is blocked. Their posts and replies are hidden from your experience now.",
      };
    case "user-unmuted":
      return {
        tone: "success",
        text: "That person is no longer muted.",
      };
    case "user-unblocked":
      return {
        tone: "success",
        text: "That person is no longer blocked.",
      };
    case "room-created":
      return {
        tone: "success",
        text: "Your room is live. People can join it now.",
      };
    case "room-joined":
      return {
        tone: "success",
        text: "You joined the room.",
      };
    case "room-left":
      return {
        tone: "success",
        text: "You left the room.",
      };
    case "profile-saved":
      return {
        tone: "success",
        text: "Your profile was updated.",
      };
    case "notifications-read":
      return {
        tone: "success",
        text: "Everything here is marked as seen.",
      };
    default:
      break;
  }

  switch (error) {
    case "invalid-room":
      return {
        tone: "error",
        text: "Give the room a name, a purpose, and a valid visibility setting.",
      };
    case "rate-limited":
      return {
        tone: "error",
        text: "You are doing that too quickly right now. Give it a moment, then try again.",
      };
    case "report-rate-limited":
      return {
        tone: "error",
        text: "You have filed too many reports in a short window. Pause, then try again.",
      };
    default:
      return error
        ? {
            tone: "error",
            text: "Ichigo could not complete that action.",
          }
        : null;
  }
}
