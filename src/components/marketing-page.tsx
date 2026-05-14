import Image from "next/image";
import Link from "next/link";
import ichigoLogo from "../../assets/logo/refined/ichigo-logo-transparent-v2.png";
import { getCurrentUser } from "../server/auth";
import { loginAction } from "../server/actions";
import { getSeedCredentials } from "../server/repository";
import { SubmitButton } from "./submit-button";
import { ThemeToggle } from "./theme-toggle";
import { getMode, modes } from "../modes";

export async function MarketingPage() {
  const viewer = await getCurrentUser();
  const seedCredentials = getSeedCredentials();

  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <Link className="brand" href="/">
          <Image src={ichigoLogo} alt="Ichigo logo" priority width={44} height={44} />
          <span>Ichigo</span>
        </Link>

        <div className="cta-row">
          <ThemeToggle />
          {viewer ? (
            <>
              <Link className="button button-secondary" href="/app/feed">
                Open app
              </Link>
              <Link className="button button-primary" href="/app/compose">
                Start with a post
              </Link>
            </>
          ) : (
            <>
              <Link className="button button-secondary" href="/login">
                Sign in
              </Link>
              <Link className="button button-primary" href="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="marketing-main">
        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Intentional feedback platform</p>
            <h1>A post is not just content. It is content plus context.</h1>
            <p className="hero-text">
              Conventional social media throws content into public space and leaves
              people to guess the emotional context. Ichigo makes that context
              explicit. You choose the response mode first, and the room adjusts
              around the kind of feedback you actually want.
            </p>

            <div className="hero-pills">
              {modes.map((mode) => (
                <span key={mode.id} className="pill" style={{ background: mode.accent }}>
                  {mode.name}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-preview panel">
            <div className="preview-topline">
              <div className="mini-brand">
                <Image src={ichigoLogo} alt="" aria-hidden="true" width={34} height={34} />
                <div>
                  <p>founder preview</p>
                  <span>core contract in action</span>
                </div>
              </div>
              <span className="metric-badge">MVP</span>
            </div>

            <article className="post-card featured-post">
              <div className="post-card-topline">
                <strong>Soft Truth</strong>
                <span>compassionate honesty</span>
              </div>
              <p>
                I do not need hype for this. I need honest perspective on whether
                I am overbuilding before I have users.
              </p>
            </article>

            <div className="reply-stack">
              {getMode("soft-truth").replies.slice(0, 2).map((reply) => (
                <article key={reply} className="reply-card">
                  <span>Aligned reply</span>
                  <p>{reply}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {!viewer ? (
          <section className="marketing-section">
            <div className="section-copy">
              <p className="eyebrow">Fast way in</p>
              <h2>Use the seeded demo account and inspect the full product flow immediately.</h2>
              <p className="section-text">
                The repository now includes a persistent local backend with seeded rooms,
                posts, comments, reports, and notifications, all mapped to the product
                document.
              </p>
            </div>

            <div className="demo-access-grid">
              <article className="panel principle-panel">
                <span className="comparison-tag">Demo account</span>
                <h3>{seedCredentials.email}</h3>
                <p className="section-text">Password: {seedCredentials.password}</p>
              </article>

              <form action={loginAction} className="panel demo-login-form">
                <input name="email" type="hidden" value={seedCredentials.email} />
                <input name="password" type="hidden" value={seedCredentials.password} />
                <p className="sidebar-label">Instant access</p>
                <h3>Sign in as the seeded founder account</h3>
                <p className="section-text">
                  This takes you straight into the feed, rooms, moderation queue, and
                  profile flows with real persisted sample data.
                </p>
                <SubmitButton className="button button-primary" pendingLabel="Signing in...">
                  Enter the demo app
                </SubmitButton>
              </form>
            </div>
          </section>
        ) : null}

        <section className="marketing-section">
          <div className="section-copy">
            <p className="eyebrow">Core principle</p>
            <h2>Ichigo closes the gap between what is posted and how it should be received.</h2>
            <p className="section-text">
              Every post carries an explicit social contract. The content says what
              happened. The context says how people should meet it.
            </p>
          </div>

          <div className="principle-grid">
            <article className="principle-panel panel">
              <span className="comparison-tag">Conventional social media</span>
              <h3>Content without context</h3>
              <ul className="comparison-list">
                <li>The post is visible, but the emotional ask is hidden.</li>
                <li>Replies compete to be loud, clever, or fast.</li>
                <li>The poster carries the cost of feedback mismatch.</li>
              </ul>
            </article>

            <article className="principle-panel panel principle-panel-accent">
              <span className="comparison-tag">Ichigo</span>
              <h3>Content plus explicit context</h3>
              <ul className="comparison-list">
                <li>The post includes a visible response mode from the start.</li>
                <li>Context becomes a rule, not a guess.</li>
                <li>Feedback is shaped around emotional fit, not comment chaos.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="marketing-section">
          <div className="section-copy">
            <p className="eyebrow">Mode system</p>
            <h2>Different asks. Different reply behavior.</h2>
            <p className="section-text">
              Response modes are the mechanism that makes context explicit. They turn
              emotional intent into visible structure before the first reply appears.
            </p>
          </div>

          <div className="mode-card-grid">
            {modes.map((mode) => (
              <article key={mode.id} className="mode-card panel">
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
    </div>
  );
}
