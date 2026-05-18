import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction, requestEmailVerificationAction } from "../../../src/server/actions";
import { requireCurrentUser } from "../../../src/server/auth";

export const dynamic = "force-dynamic";

function getNotice(success?: string, error?: string, hasPreview = false) {
  switch (success) {
    case "verification-link-created":
      return {
        tone: "success" as const,
        text: hasPreview
          ? "A fresh verification link is ready below for this environment."
          : "A fresh verification email has been sent.",
      };
    default:
      break;
  }

  switch (error) {
    case "delivery-failed":
      return {
        tone: "error" as const,
        text: "Ichigo could not send the verification email with the current SMTP setup.",
      };
    default:
      return error ? { tone: "error" as const, text: "Ichigo still needs your email verified." } : null;
  }
}

export default async function VerifyGatePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; preview?: string }>;
}) {
  const currentUser = await requireCurrentUser();

  if (currentUser.emailVerifiedAt) {
    redirect(currentUser.onboardingCompletedAt ? "/app" : "/app/onboarding");
  }

  const { success, error, preview } = await searchParams;
  const notice = getNotice(success, error, Boolean(preview));

  return (
    <div className="workspace-grid verify-gate-layout">
      <section className="content-column">
        <div className="page-header">
          <div className="page-intro-copy">
            <p className="eyebrow">Verification</p>
            <h1>Verify your email before you continue.</h1>
            <p>
              Your session is active, but Ichigo keeps posting, rooms, onboarding, and reply actions
              locked until this address is confirmed.
            </p>
          </div>
        </div>

        {notice ? (
          <div className={notice.tone === "error" ? "status-banner status-banner-error" : "status-banner"}>
            {notice.text}
          </div>
        ) : null}

        <section className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Current email</p>
              <h3>{currentUser.email}</h3>
            </div>
          </div>

          <p className="section-text">
            Check your inbox, open the verification link, then come back here. If the message did not
            arrive, send another one.
          </p>

          <form action={requestEmailVerificationAction} className="form-actions">
            <input name="redirectTo" type="hidden" value="/app/verify" />
            <button className="button button-primary" type="submit">
              Send another verification email
            </button>
          </form>

          {preview ? (
            <Link className="button button-secondary" href={preview}>
              Open verification link
            </Link>
          ) : null}
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">What you can do here</p>
          <h3>Update the email if it is wrong, or sign out and return later.</h3>
          <p>
            Account settings stay available so you can correct the address you signed up with.
          </p>
          <Link className="button button-secondary" href="/app/settings/account">
            Open account settings
          </Link>
          <form action={logoutAction}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
