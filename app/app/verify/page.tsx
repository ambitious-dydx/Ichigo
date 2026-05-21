import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissibleStatusBanner } from "../../../src/components/dismissible-status-banner";
import {
  logoutAction,
  requestEmailVerificationAction,
  verifyEmailAction,
} from "../../../src/server/actions";
import { requireCurrentUser } from "../../../src/server/auth";
import { SubmitButton } from "../../../src/components/submit-button";

export const dynamic = "force-dynamic";

function getNotice(success?: string, error?: string, hasPreviewCode = false) {
  switch (success) {
    case "verification-code-sent":
      return {
        tone: "success" as const,
        text: hasPreviewCode
          ? "A fresh verification code is ready below for this environment."
          : "A fresh verification code has been sent to your email.",
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
    case "invalid-code":
      return {
        tone: "error" as const,
        text: "That verification code is missing, expired, or incorrect.",
      };
    default:
      return error ? { tone: "error" as const, text: "Ichigo still needs your email verified." } : null;
  }
}

export default async function VerifyGatePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; code?: string }>;
}) {
  const currentUser = await requireCurrentUser();

  if (currentUser.emailVerifiedAt) {
    redirect(currentUser.onboardingCompletedAt ? "/app" : "/app/onboarding");
  }

  const { success, error, code } = await searchParams;
  const notice = getNotice(success, error, Boolean(code));

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
          <DismissibleStatusBanner
            clearKeys={["success", "error", "code"]}
            text={notice.text}
            tone={notice.tone}
          />
        ) : null}

        <section className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Current email</p>
              <h3>{currentUser.email}</h3>
            </div>
          </div>

          <p className="section-text">
            Check your inbox, enter the verification code here, and continue. If the message did not
            arrive, send another code.
          </p>

          <form action={verifyEmailAction} className="inline-form-stack">
            <input
              autoComplete="one-time-code"
              className="text-input"
              defaultValue={code ?? ""}
              inputMode="numeric"
              maxLength={6}
              name="code"
              placeholder="6-digit verification code"
              required
              type="text"
            />
            <SubmitButton className="button button-primary" pendingLabel="Verifying...">
              Verify email
            </SubmitButton>
          </form>

          <form action={requestEmailVerificationAction} className="form-actions">
            <input name="redirectTo" type="hidden" value="/app/verify" />
            <button className="button button-primary" type="submit">
              Send another verification code
            </button>
          </form>

          {code ? (
            <div className="seed-credentials verification-code-preview">
              <span>Local preview code</span>
              <strong>{code}</strong>
            </div>
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
