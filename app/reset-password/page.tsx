import Link from "next/link";
import { PasswordField } from "../../src/components/password-field";
import { SubmitButton } from "../../src/components/submit-button";
import { ThemeLogo } from "../../src/components/theme-logo";
import { ThemeToggle } from "../../src/components/theme-toggle";
import { resetPasswordAction } from "../../src/server/actions";

function getErrorMessage(error?: string) {
  switch (error) {
    case "missing-fields":
      return "Enter and confirm your new password.";
    case "password-mismatch":
      return "The password confirmation does not match.";
    case "weak-password":
      return "Use a password with at least 8 characters.";
    case "invalid-token":
      return "That reset link is missing, expired, or has already been used.";
    default:
      return error ? "We could not reset your password." : null;
  }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const errorMessage = getErrorMessage(error);

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
          <h1>Set a new password.</h1>
          <p className="hero-text">
            Choose a new password, then return to sign in.
          </p>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <form action={resetPasswordAction} className="inline-form-stack">
            <input name="token" type="hidden" value={token ?? ""} />
            <PasswordField
              className="text-input"
              minLength={8}
              name="nextPassword"
              placeholder="New password"
              required
            />
            <PasswordField
              className="text-input"
              minLength={8}
              name="confirmPassword"
              placeholder="Confirm new password"
              required
            />
            <SubmitButton className="button button-primary" pendingLabel="Resetting...">
              Reset password
            </SubmitButton>
          </form>

          <p className="auth-footer">
            Back to <Link href="/login">sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
