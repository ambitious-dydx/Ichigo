import { SecurityPage } from "../../../../src/components/product-app";
import { getCurrentSessionId, requireCurrentUser } from "../../../../src/server/auth";
import { getSecurityView } from "../../../../src/server/repository";

export const dynamic = "force-dynamic";

function getNotice(success?: string, error?: string) {
  switch (success) {
    case "password-changed":
      return { tone: "success" as const, text: "Your password was updated." };
    case "other-sessions-signed-out":
      return { tone: "success" as const, text: "Other active sessions were signed out." };
    case "session-revoked":
      return { tone: "success" as const, text: "That session was closed." };
    default:
      break;
  }

  switch (error) {
    case "missing-fields":
      return { tone: "error" as const, text: "Fill in all password fields." };
    case "password-mismatch":
      return { tone: "error" as const, text: "The new password confirmation does not match." };
    case "incorrect-password":
      return { tone: "error" as const, text: "Your current password is incorrect." };
    case "weak-password":
      return { tone: "error" as const, text: "Use a password with at least 8 characters." };
    case "same-password":
      return { tone: "error" as const, text: "Choose a password you are not already using." };
    case "invalid-session":
      return { tone: "error" as const, text: "That session could not be found." };
    default:
      return error ? { tone: "error" as const, text: "We could not update your security settings." } : null;
  }
}

export default async function SecuritySettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { success, error } = await searchParams;
  const security = getSecurityView({
    userId: currentUser.id,
    currentSessionId: await getCurrentSessionId(),
  });

  return <SecurityPage notice={getNotice(success, error)} security={security} />;
}
