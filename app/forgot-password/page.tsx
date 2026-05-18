import Link from "next/link";
import { DismissibleStatusBanner } from "../../src/components/dismissible-status-banner";
import { requestPasswordResetAction } from "../../src/server/actions";
import { ThemeLogo } from "../../src/components/theme-logo";
import { ThemeToggle } from "../../src/components/theme-toggle";

function getNotice(success?: string, preview?: string) {
  if (success === "reset-sent") {
    return {
      tone: "success" as const,
      text: preview
        ? "Reset link generated. Use the button below to continue."
        : "If that account exists, a reset email has been sent.",
    };
  }

  return null;
}

function getError(error?: string) {
  switch (error) {
    case "missing-fields":
      return "Enter your email or username.";
    case "delivery-failed":
      return "Ichigo could not send the reset email with the current SMTP setup.";
    default:
      return error ? "We could not start password recovery." : null;
  }
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; preview?: string }>;
}) {
  const { success, error, preview } = await searchParams;
  const notice = getNotice(success, preview);
  const errorMessage = getError(error);

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
          <p className="eyebrow">Recovery</p>
          <h1>Recover access.</h1>
          <p className="hero-text">
            Enter your email or username and Ichigo will send a password reset email if the account exists.
          </p>

          {notice ? (
            <DismissibleStatusBanner clearKeys={["success", "preview"]} text={notice.text} tone={notice.tone} />
          ) : null}
          {errorMessage ? (
            <DismissibleStatusBanner clearKeys={["error"]} text={errorMessage} tone="error" />
          ) : null}

          <form action={requestPasswordResetAction} className="inline-form-stack">
            <input
              className="text-input"
              name="identifier"
              placeholder="Email or username"
              type="text"
              required
            />
            <button className="button button-primary" type="submit">
              Generate reset link
            </button>
          </form>

          {preview ? (
            <Link className="button button-secondary" href={preview}>
              Open reset form
            </Link>
          ) : null}

          <p className="auth-footer">
            Back to <Link href="/login">sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
