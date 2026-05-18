import Link from "next/link";
import { getCurrentUser } from "../server/auth";
import { isGoogleAuthConfigured } from "../server/google-oauth";
import { loginAction } from "../server/actions";
import { getSeedCredentials } from "../server/repository";
import { GoogleAuthButton } from "./google-auth-button";
import { MarketingHeader } from "./marketing-header";
import { SubmitButton } from "./submit-button";
import { ThemeLogo } from "./theme-logo";
import { getMode, modes } from "../modes";

export async function MarketingPage() {
  const viewer = await getCurrentUser();
  const seedCredentials = getSeedCredentials();
  const hasGoogleAuth = isGoogleAuthConfigured();
  const hasVerifiedEmail = Boolean(viewer?.emailVerifiedAt);
  const hasCompletedOnboarding = Boolean(viewer?.onboardingCompletedAt);
  const exampleMode = getMode("soft-truth");
  const exampleReplies = [
    "You probably do not need more build time right now. You need a smaller test that puts this in front of real users.",
    "The safer move may feel like polishing, but the truth is that more building can become a way to delay feedback.",
  ];

  return (
    <div className="marketing-shell">
      <MarketingHeader viewer={viewer} />

      <main className="marketing-main">
        <section className="hero-grid" id="how-it-works">
          <div className="hero-copy">
            <p className="eyebrow">Feedback for builders</p>
            <p className="hero-kicker">Say what you need. Receive what helps.</p>
            <h1>Choose how people meet your work.</h1>
            <p className="hero-text">
              Ichigo is built first for founders, builders, and creators who need
              better feedback on decisions, drafts, launches, and hard calls before
              a thread runs off course.
            </p>

            <div className="hero-signal-row" aria-label="Ichigo brand principle">
              <span>CONTENT</span>
              <span className="hero-signal-plus">+</span>
              <span>CONTEXT</span>
            </div>

            <div className="hero-pills">
              {modes.map((mode) => (
                <span key={mode.id} className="pill" style={{ background: mode.accent }}>
                  {mode.name}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-preview panel contract-preview">
            <div className="preview-topline">
              <div className="mini-brand">
                <ThemeLogo alt="Ichigo icon" height={34} width={34} />
                <div>
                  <p>example post</p>
                  <span>how the tone gets set first</span>
                </div>
              </div>
              <span className="metric-badge">EXAMPLE 01</span>
            </div>

            <div className="contract-frame">
              <article className="post-card featured-post" data-mode="soft-truth">
                <div className="post-card-topline">
                  <strong>The post</strong>
                  <span>what someone wants to say</span>
                </div>
                <p>
                  I think I may be overbuilding before I have enough user signal.
                  Tell me the truth, but do not flatten me.
                </p>
              </article>

              <article className="contract-block contract-block-accent">
                <div className="post-card-topline">
                  <strong>The ask</strong>
                  <span>how this person wants to be met</span>
                </div>
                <div className="contract-mode-row">
                  <span className="mode-chip" style={{ background: exampleMode.accent }}>
                    Soft Truth
                  </span>
                  <p>{exampleMode.guidance}</p>
                </div>
              </article>

              <div className="reply-stack">
                {exampleReplies.map((reply) => (
                  <article key={reply} className="reply-card">
                    <span>A reply that fits</span>
                    <p>{reply}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {!viewer ? (
          <section className="marketing-section" id="demo">
            <div className="section-copy">
              <p className="eyebrow">Try it</p>
              <h2>Step into the app and pressure-test the idea properly.</h2>
              <p className="section-text">
                Try the demo account and feel how product questions, founder doubts,
                and work-in-progress posts change once the context is explicit.
              </p>
            </div>

            <div className="demo-access-grid">
              <article className="panel demo-panel demo-account-card">
                <div className="panel-title-row">
                  <span className="comparison-tag">Demo account</span>
                  <span className="sidebar-label">Ready now</span>
                </div>
                <div>
                  <h3>Try the demo account</h3>
                  <p className="section-text">
                    Walk straight into founder-style posts, rooms, and replies that already show the core loop.
                  </p>
                </div>
                <div className="demo-credential-list">
                  <div className="demo-credential-row">
                    <span>Email</span>
                    <strong>{seedCredentials.email}</strong>
                  </div>
                  <div className="demo-credential-row">
                    <span>Password</span>
                    <strong>{seedCredentials.password}</strong>
                  </div>
                </div>
              </article>

              <form action={loginAction} className="panel demo-panel demo-login-form">
                <input name="identifier" type="hidden" value={seedCredentials.email} />
                <input name="password" type="hidden" value={seedCredentials.password} />
                <div className="panel-title-row">
                  <p className="sidebar-label">Demo sign-in</p>
                  <span className="comparison-tag">Jump right in</span>
                </div>
                <div>
                  <h3>Open the product</h3>
                  <p className="section-text">
                    Sign in with one click and land inside the working product immediately.
                  </p>
                </div>
                <div className="demo-contract">
                  <strong>Inside</strong>
                  <p>A live feed, founder-style posts, structured reply modes, rooms, notifications, and safety tools.</p>
                </div>
                <SubmitButton className="button button-primary" pendingLabel="Signing in...">
                  Enter the demo app
                </SubmitButton>
                {hasGoogleAuth ? (
                  <>
                    <div className="marketing-auth-divider">
                      <span>or</span>
                    </div>
                    <GoogleAuthButton className="demo-google-button" label="Continue with Google" />
                  </>
                ) : null}
              </form>
            </div>
          </section>
        ) : null}

        <section className="marketing-section" id="principle">
          <div className="section-copy">
            <p className="eyebrow">Why it matters</p>
            <h2>Most product feedback spaces hear the post and miss the need behind it.</h2>
            <p className="section-text">
              Ichigo makes the need visible first, so the conversation starts from
              the right kind of feedback instead of guesswork.
            </p>
          </div>

          <div className="principle-grid">
            <article className="principle-panel panel">
              <span className="comparison-tag">Conventional social media</span>
              <h3>Product questions without response rules</h3>
              <ul className="comparison-list">
                <li>People guess whether you wanted strategy, comfort, honesty, or pressure.</li>
                <li>The fastest or loudest reply often sets the tone for everyone else.</li>
                <li>A founder post can drift from signal into noise very quickly.</li>
              </ul>
            </article>

            <article className="principle-panel panel principle-panel-accent">
              <span className="comparison-tag">Ichigo</span>
              <h3>The post plus the need behind it</h3>
              <ul className="comparison-list">
                <li>You set the tone before anyone answers.</li>
                <li>People know whether to advise, challenge, comfort, listen, or tell the soft truth.</li>
                <li>The thread stays closer to what the poster actually needed.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="marketing-section" id="modes">
          <div className="section-copy">
            <p className="eyebrow">Response modes</p>
            <h2>Different product moments call for different kinds of replies.</h2>
            <p className="section-text">
              Each mode tells people how to show up before the first comment lands.
            </p>
          </div>

          <div className="mode-card-grid">
            {modes.map((mode) => (
              <article key={mode.id} className="mode-card panel" data-mode={mode.id}>
                <span className="mode-chip" style={{ background: mode.accent }}>
                  {mode.name}
                </span>
                <h3>{mode.prompt}</h3>
                <p>{mode.guidance}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <p className="marketing-footer-legal">© 2026 Ichigo. Posts need context.</p>

        <div className="marketing-footer-links">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#principle">Why it matters</Link>
          <Link href="#modes">Modes</Link>
          {!viewer ? (
            <Link href="/login">Sign in</Link>
          ) : hasVerifiedEmail ? (
            hasCompletedOnboarding ? (
            <Link href="/app/feed">Open app</Link>
            ) : (
            <Link href="/app/onboarding">Finish setup</Link>
            )
          ) : (
            <Link href="/app/verify">Verify email</Link>
          )}
        </div>

        <div className="marketing-footer-actions">
          {!viewer ? (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Create account</Link>
            </>
          ) : hasVerifiedEmail ? (
            hasCompletedOnboarding ? (
            <>
              <Link href="/app/feed">Feed</Link>
              <Link href="/app/compose">Write</Link>
            </>
            ) : (
            <>
              <Link href="/app/onboarding">Continue setup</Link>
              <Link href="/app/settings/account">Settings</Link>
            </>
            )
          ) : (
            <>
              <Link href="/app/verify">Verify email</Link>
              <Link href="/app/settings/account">Account settings</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
