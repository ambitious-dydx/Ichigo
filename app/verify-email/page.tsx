import Link from "next/link";
import { ThemeLogo } from "../../src/components/theme-logo";
import { ThemeToggle } from "../../src/components/theme-toggle";
import { getCurrentUser, verifyEmailToken } from "../../src/server/auth";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const currentUser = await getCurrentUser();

  let notice: { tone: "success" | "error"; text: string } | null = null;

  if (!token?.trim()) {
    notice = {
      tone: "error",
      text: "That verification link is missing or invalid.",
    };
  } else {
    const result = await verifyEmailToken(token.trim());
    notice =
      "error" in result
        ? {
            tone: "error",
            text: "That verification link is expired or has already been used.",
          }
        : {
            tone: "success",
            text: "Your email is now verified. You can return to Ichigo.",
          };
  }

  const returnHref = currentUser
    ? currentUser.emailVerifiedAt
      ? currentUser.onboardingCompletedAt
        ? "/app"
        : "/app/onboarding"
      : "/app/verify"
    : "/login";
  const returnLabel = currentUser ? "Return to Ichigo" : "Go to sign in";

  return (
    <main className="auth-shell">
      <div className="auth-header-row">
        <Link className="brand" href="/">
          <ThemeLogo alt="Ichigo logo" height={44} width={44} />
          <span>Ichigo</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="auth-grid auth-grid-single">
        <section className="panel auth-panel">
          <p className="eyebrow">Verification</p>
          <h1>Confirm your email.</h1>
          <p className="hero-text">
            Ichigo uses verified email for account recovery and trust.
          </p>

          {notice ? (
            <p className={notice.tone === "error" ? "form-error" : "status-banner"}>
              {notice.text}
            </p>
          ) : null}

          <div className="form-actions">
            <Link className="button button-primary" href={returnHref}>
              {returnLabel}
            </Link>
            <Link className="button button-secondary" href="/">
              Back home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
