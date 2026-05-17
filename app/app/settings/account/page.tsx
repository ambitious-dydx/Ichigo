import { AccountSettingsPage } from "../../../../src/components/product-app";
import { requireCurrentUser } from "../../../../src/server/auth";

export const dynamic = "force-dynamic";

function getNotice(success?: string, error?: string) {
  if (success === "account-saved") {
    return { tone: "success" as const, text: "Your account details were updated." };
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
    default:
      return error ? { tone: "error" as const, text: "We could not save your account." } : null;
  }
}

export default async function AccountSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { success, error } = await searchParams;

  return <AccountSettingsPage currentUser={currentUser} notice={getNotice(success, error)} />;
}
