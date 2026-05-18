import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleAuthButton } from "../../src/components/google-auth-button";
import { PasswordField } from "../../src/components/password-field";
import { SubmitButton } from "../../src/components/submit-button";
import { ThemeLogo } from "../../src/components/theme-logo";
import { ThemeToggle } from "../../src/components/theme-toggle";
import { getCurrentUser } from "../../src/server/auth";
import { isGoogleAuthConfigured } from "../../src/server/google-oauth";
import { registerAction } from "../../src/server/actions";

function getRegisterErrorMessage(error?: string) {
  switch (error) {
    case "invalid-input":
      return "Use a name, an email, and a password with at least 8 characters.";
    case "invalid-username":
      return "Use 3 to 24 letters, numbers, or underscores for your username.";
    case "invalid-email":
      return "Enter a valid email address.";
    case "weak-password":
      return "Use a password with at least 8 characters.";
    case "password-mismatch":
      return "Re-enter the same password in both fields.";
    case "email-exists":
      return "That email is already in use.";
    case "username-exists":
      return "That username is already taken.";
    default:
      return error ? "We could not create your account." : null;
  }
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    if (!currentUser.emailVerifiedAt) {
      redirect("/app/verify");
    }

    redirect(currentUser.onboardingCompletedAt ? "/app" : "/app/onboarding");
  }

  const { error } = await searchParams;
  const errorMessage = getRegisterErrorMessage(error);
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

      <div className="auth-grid auth-grid-single">
        <section className="panel auth-panel">
          <p className="eyebrow">Create account</p>
          <h1>Join with your own voice.</h1>
          <p className="hero-text">
            Create your account to post with a clearer ask and reply with more care.
          </p>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          {hasGoogleAuth ? (
            <div className="auth-provider-stack">
              <GoogleAuthButton label="Create account with Google" />
              <div className="auth-divider">
                <span>or register with email</span>
              </div>
            </div>
          ) : null}

          <form action={registerAction} className="inline-form-stack">
            <input className="text-input" name="username" placeholder="Username" type="text" required />
            <input className="text-input" name="email" placeholder="Email" type="email" required />
            <PasswordField
              className="text-input"
              minLength={8}
              name="password"
              placeholder="Password"
              required
            />
            <PasswordField
              className="text-input"
              minLength={8}
              name="confirmPassword"
              placeholder="Confirm password"
              required
            />
            <SubmitButton className="button button-primary" pendingLabel="Creating account...">
              Create account
            </SubmitButton>
          </form>

          <p className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
