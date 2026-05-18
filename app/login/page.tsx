import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleAuthButton } from "../../src/components/google-auth-button";
import { PasswordField } from "../../src/components/password-field";
import { SubmitButton } from "../../src/components/submit-button";
import { ThemeLogo } from "../../src/components/theme-logo";
import { ThemeToggle } from "../../src/components/theme-toggle";
import { getCurrentUser } from "../../src/server/auth";
import { isGoogleAuthConfigured } from "../../src/server/google-oauth";
import { getSeedCredentials } from "../../src/server/repository";
import { loginAction } from "../../src/server/actions";

function getLoginErrorMessage(error?: string) {
  switch (error) {
    case "missing-fields":
      return "Enter your email or username, then your password.";
    case "invalid-credentials":
      return "That sign-in information does not match our records.";
    case "email-not-verified":
      return "Verify your email before signing in. Ichigo has sent you a fresh verification link.";
    case "email-not-verified-send-failed":
      return "Verify your email before signing in. Ichigo could not send the verification email yet.";
    case "verification-email-failed":
      return "Your account exists, but Ichigo could not send the verification email yet.";
    case "google-unavailable":
      return "Google sign-in is not configured yet.";
    case "google-cancelled":
      return "Google sign-in was cancelled before it completed.";
    case "google-invalid-state":
      return "That Google sign-in attempt expired. Try again.";
    case "google-exchange-failed":
      return "We could not complete the Google sign-in exchange.";
    case "google-profile-unavailable":
      return "We could not verify your Google account email.";
    case "google-account-link-failed":
      return "We could not connect that Google account to Ichigo.";
    default:
      return error ? "We could not sign you in." : null;
  }
}

function getLoginSuccessMessage(success?: string) {
  switch (success) {
    case "session-ended":
      return "That session was closed. Sign in again if you want to keep working.";
    case "password-reset":
      return "Your password was reset. Sign in with the new one.";
    case "verification-email-sent":
      return "Check your inbox for a verification link before signing in.";
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    if (!currentUser.emailVerifiedAt) {
      redirect("/app/verify");
    }

    redirect(currentUser.onboardingCompletedAt ? "/app" : "/app/onboarding");
  }

  const { error, success } = await searchParams;
  const demo = getSeedCredentials();
  const errorMessage = getLoginErrorMessage(error);
  const successMessage = getLoginSuccessMessage(success);
  const hasGoogleAuth = isGoogleAuthConfigured();

  return (
    <main className="auth-shell">
      <div className="auth-header-row">
        <Link className="brand" href="/">
          <ThemeLogo alt="Ichigo logo" height={44} width={44} />
          <span>Ichigo</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="auth-grid">
        <section className="panel auth-panel">
          <p className="eyebrow">Sign in</p>
          <h1>Pick up where you left off.</h1>
          <p className="hero-text">
            Sign in to write posts, join rooms, and reply with a little more care.
          </p>

          {successMessage ? <p className="status-banner">{successMessage}</p> : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          {hasGoogleAuth ? (
            <div className="auth-provider-stack">
              <GoogleAuthButton label="Continue with Google" />
              <div className="auth-divider">
                <span>or use email</span>
              </div>
            </div>
          ) : null}

          <form action={loginAction} className="inline-form-stack">
            <input
              className="text-input"
              name="identifier"
              placeholder="Email or username"
              type="text"
              required
            />
            <PasswordField
              className="text-input"
              name="password"
              placeholder="Password"
              required
            />
            <SubmitButton className="button button-primary" pendingLabel="Signing in...">
              Sign in
            </SubmitButton>
          </form>

          <p className="auth-footer">
            Forgot your password? <Link href="/forgot-password">Recover access</Link>
          </p>
          <p className="auth-footer">
            New here? <Link href="/register">Create an account</Link>
          </p>
        </section>

        <section className="panel auth-panel">
          <p className="eyebrow">Demo access</p>
          <h2>Try the demo account</h2>
          <div className="seed-credentials">
            <strong>{demo.email}</strong>
            <span>{demo.password}</span>
          </div>
          <form action={loginAction} className="inline-form-stack">
            <input name="email" type="hidden" value={demo.email} />
            <input name="password" type="hidden" value={demo.password} />
            <SubmitButton className="button button-secondary" pendingLabel="Entering...">
              Enter with demo account
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
