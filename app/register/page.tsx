import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import ichigoLogo from "../../assets/logo/refined/ichigo-logo-transparent-v2.png";
import { SubmitButton } from "../../src/components/submit-button";
import { ThemeToggle } from "../../src/components/theme-toggle";
import { getCurrentUser } from "../../src/server/auth";
import { registerAction } from "../../src/server/actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/app/feed");
  }

  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <div className="auth-header-row">
        <Link className="brand" href="/">
          <Image src={ichigoLogo} alt="Ichigo logo" priority width={44} height={44} />
          <span>Ichigo</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="auth-grid auth-grid-single">
        <section className="panel auth-panel">
          <p className="eyebrow">Create account</p>
          <h1>Join the context-first social layer.</h1>
          <p className="hero-text">
            Create your Ichigo account to post with response modes, join rooms, build
            reputation, and receive feedback that actually fits.
          </p>

          {error ? <p className="form-error">Registration failed. Use a different email.</p> : null}

          <form action={registerAction} className="inline-form-stack">
            <input className="text-input" name="username" placeholder="Username" type="text" required />
            <input className="text-input" name="email" placeholder="Email" type="email" required />
            <input
              className="text-input"
              minLength={8}
              name="password"
              placeholder="Password"
              type="password"
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
