import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissibleStatusBanner } from "../../../src/components/dismissible-status-banner";
import { completeOnboardingAction } from "../../../src/server/actions";
import { requireCurrentUser } from "../../../src/server/auth";
import { modes } from "../../../src/modes";

export const dynamic = "force-dynamic";

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid-input":
      return "Choose a focus, describe the kind of feedback you need, and pick a default mode.";
    default:
      return error ? "We could not save your onboarding choices." : null;
  }
}

function getSuccessMessage(success?: string) {
  switch (success) {
    case "email-verified":
      return "Your email is verified. Finish this last setup step to enter Ichigo.";
    default:
      return null;
  }
}

const focusOptions = [
  {
    id: "founder",
    label: "Founder feedback",
    description: "Use Ichigo for product, launch, hiring, and strategy decisions.",
  },
  {
    id: "creator",
    label: "Creator work",
    description: "Use Ichigo to share work in progress and shape the tone of critique.",
  },
  {
    id: "reflection",
    label: "Personal reflection",
    description: "Use Ichigo when you need context before people answer a vulnerable post.",
  },
  {
    id: "support",
    label: "Support seeking",
    description: "Use Ichigo when the wrong tone would make the moment worse.",
  },
] as const;

export default async function OnboardingRoute({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const currentUser = await requireCurrentUser();

  if (!currentUser.emailVerifiedAt) {
    redirect("/app/verify");
  }

  if (currentUser.onboardingCompletedAt) {
    redirect("/app");
  }

  const { error, success } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const successMessage = getSuccessMessage(success);

  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div className="page-intro-copy">
            <p className="eyebrow">Onboarding</p>
            <h1>Set the kind of feedback you came here for.</h1>
            <p>
              Ichigo works best when the first thing we know is what kind of response
              would actually help. This takes less than a minute.
            </p>
          </div>
        </div>

        {successMessage ? (
          <DismissibleStatusBanner clearKeys={["success"]} text={successMessage} tone="success" />
        ) : null}

        {errorMessage ? (
          <DismissibleStatusBanner clearKeys={["error"]} text={errorMessage} tone="error" />
        ) : null}

        <form action={completeOnboardingAction} className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Starting wedge</p>
              <h3>Who are you mainly using Ichigo as?</h3>
            </div>
          </div>

          <div className="mode-choice-grid">
            {focusOptions.map((option) => (
              <label key={option.id} className="mode-option radio-option">
                <input
                  defaultChecked={option.id === "founder"}
                  name="focus"
                  type="radio"
                  value={option.id}
                />
                <span className="legend-dot" />
                <div>
                  <strong>{option.label}</strong>
                  <p>{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="input-label" htmlFor="goal">
              What kind of post do you most need help with first?
            </label>
            <textarea
              className="composer-textarea"
              defaultValue="I need stronger feedback on product, launch, and hard decisions."
              id="goal"
              name="goal"
              rows={5}
              required
            />
          </div>

          <div>
            <label className="input-label" htmlFor="preferredMode">
              Which mode do you expect to use most often?
            </label>
            <select className="text-input" defaultValue="advise" id="preferredMode" name="preferredMode">
              {modes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button className="button button-primary" type="submit">
              Enter Ichigo
            </button>
            <Link className="button button-secondary" href="/login">
              Back
            </Link>
          </div>
        </form>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">What happens next</p>
          <h3>We will shape your home, copy, and examples around the kind of feedback you came for.</h3>
          <p>
            You can still use every mode later. This just gives your first session a
            clearer starting point.
          </p>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">The product promise</p>
          <h3>Say what you need first. Get replies that fit the moment.</h3>
          <p>
            The goal is not more replies. It is fewer mismatched ones.
          </p>
        </section>
      </aside>
    </div>
  );
}
