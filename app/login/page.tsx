import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import ichigoLogo from "../../assets/logo/refined/ichigo-logo-transparent-v2.png";
import { SubmitButton } from "../../src/components/submit-button";
import { ThemeToggle } from "../../src/components/theme-toggle";
import { getCurrentUser } from "../../src/server/auth";
import { getSeedCredentials } from "../../src/server/repository";
import { loginAction } from "../../src/server/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/app/feed");
  }

  const { error } = await searchParams;
  const demo = getSeedCredentials();

  return (
    <main className="auth-shell">
      <div className="auth-header-row">
        <Link className="brand" href="/">
          <Image src={ichigoLogo} alt="Ichigo logo" priority width={44} height={44} />
          <span>Ichigo</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="auth-grid">
        <section className="panel auth-panel">
          <p className="eyebrow">Sign in</p>
          <h1>Enter the feedback system.</h1>
          <p className="hero-text">
            Sign in to post with explicit context, join rooms, rate responses, and review the
            moderation queue.
          </p>

          {error ? <p className="form-error">Sign in failed. Check your credentials.</p> : null}

          <form action={loginAction} className="inline-form-stack">
            <input className="text-input" name="email" placeholder="Email" type="email" required />
            <input className="text-input" name="password" placeholder="Password" type="password" required />
            <SubmitButton className="button button-primary" pendingLabel="Signing in...">
              Sign in
            </SubmitButton>
          </form>

          <p className="auth-footer">
            New here? <Link href="/register">Create an account</Link>
          </p>
        </section>

        <section className="panel auth-panel">
          <p className="eyebrow">Demo credentials</p>
          <h2>Seeded founder account</h2>
          <div className="seed-credentials">
            <strong>{demo.email}</strong>
            <span>{demo.password}</span>
          </div>
          <form action={loginAction} className="inline-form-stack">
            <input name="email" type="hidden" value={demo.email} />
            <input name="password" type="hidden" value={demo.password} />
            <SubmitButton className="button button-secondary" pendingLabel="Entering...">
              Use demo account
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
