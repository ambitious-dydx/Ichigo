import { AccountSettingsPage } from "../../../../src/components/product-app";
import {
  getCurrentSessionId,
  requireCurrentUser,
} from "../../../../src/server/auth";
import { getSecurityView, listBlockedUsers } from "../../../../src/server/repository";

export const dynamic = "force-dynamic";

function getNotice(success?: string, error?: string, hasPreview = false) {
  switch (success) {
    case "account-saved":
      return { tone: "success" as const, text: "Your account details were updated." };
    case "account-saved-verification-failed":
      return {
        tone: "success" as const,
        text: "Your account details were updated, but Ichigo could not send the verification email yet.",
      };
    case "verification-link-created":
      return {
        tone: "success" as const,
        text: hasPreview
          ? "A verification link is ready below for this local environment."
          : "A verification email has been sent.",
      };
    case "email-verified":
      return { tone: "success" as const, text: "Your email address is now verified." };
    default:
      break;
  }

  switch (error) {
    case "invalid-input":
      return { tone: "error" as const, text: "Enter both a username and an email." };
    case "invalid-username":
      return {
        tone: "error" as const,
        text: "Use 3 to 24 letters, numbers, or underscores for your username.",
      };
    case "invalid-email":
      return { tone: "error" as const, text: "Enter a valid email address." };
    case "email-exists":
      return { tone: "error" as const, text: "That email is already in use." };
    case "username-exists":
      return { tone: "error" as const, text: "That username is already taken." };
    case "invalid-token":
      return {
        tone: "error" as const,
        text: "That verification link is missing, expired, or has already been used.",
      };
    case "delivery-failed":
      return {
        tone: "error" as const,
        text: "Ichigo could not send the verification email with the current SMTP setup.",
      };
    default:
      return error ? { tone: "error" as const, text: "We could not save your account." } : null;
  }
}

export default async function AccountSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; preview?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { success, error, preview } = await searchParams;
  const security = getSecurityView({
    userId: currentUser.id,
    currentSessionId: await getCurrentSessionId(),
  });
  const blockedUsers = listBlockedUsers(currentUser.id);

  return (
    <AccountSettingsPage
      blockedUsers={blockedUsers}
      currentUser={currentUser}
      notice={getNotice(success, error, Boolean(preview))}
      security={security}
      verificationPreviewUrl={preview ?? null}
    />
  );
}
