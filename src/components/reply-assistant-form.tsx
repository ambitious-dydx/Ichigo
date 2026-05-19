"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { createCommentAction } from "../server/actions";
import { SubmitButton } from "./submit-button";

type AlignmentClassification = "match" | "acceptable" | "borderline" | "violation";

type ReplyAssistantFormProps = {
  postId: string;
  responsePrompt: string;
  responseGuidance: string;
  cooldownEndsAt?: string | null;
};

type AnalysisState = {
  alignmentScore: number;
  classification: AlignmentClassification;
  reason: string;
  suggestedRewrite: string | null;
};

function describeVerdict(classification: AlignmentClassification) {
  switch (classification) {
    case "match":
      return "Strong fit";
    case "acceptable":
      return "Good fit";
    case "borderline":
      return "Needs adjustment";
    case "violation":
      return "Does not fit";
    default:
      return classification;
  }
}

export function ReplyAssistantForm({
  postId,
  responsePrompt,
  responseGuidance,
  cooldownEndsAt = null,
}: ReplyAssistantFormProps) {
  const [draft, setDraft] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [analysisText, setAnalysisText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const deferredDraft = useDeferredValue(draft);
  const isCoolingDown = Boolean(cooldownEndsAt);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function runAnalysis(input: string) {
    const trimmed = input.trim();

    if (trimmed.length < 18) {
      setAnalysis(null);
      setAnalysisText("");
      return;
    }

    setIsAnalyzing(true);
    setGuardMessage("");

    try {
      const response = await fetch("/api/ai/classify-comment", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          postId,
          commentContent: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to analyze reply");
      }

      const payload = (await response.json()) as AnalysisState;
      setAnalysis(payload);
      setAnalysisText(trimmed);
    } catch {
      setAnalysis(null);
      setAnalysisText("");
      setGuardMessage("Ichigo could not check this reply right now.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    const trimmed = deferredDraft.trim();

    if (trimmed.length < 18) {
      setAnalysis(null);
      setAnalysisText("");
      return;
    }

    const timeout = window.setTimeout(() => {
      void runAnalysis(trimmed);
    }, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [deferredDraft, postId]);

  function applySuggestedRewrite() {
    if (!analysis?.suggestedRewrite) {
      return;
    }

    setDraft(analysis.suggestedRewrite);
    setAnalysisText("");
    setGuardMessage("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isCoolingDown) {
      event.preventDefault();
      setGuardMessage(
        "Replying is paused for now. Let the cooldown finish before adding another response.",
      );
      return;
    }

    if (
      analysis &&
      analysisText === draft.trim() &&
      analysis.classification === "violation"
    ) {
      event.preventDefault();
      setGuardMessage(
        "This draft currently breaks the reply contract for this post. Rewrite it or use Ichigo's suggestion before sending.",
      );
    }
  }

  return (
    <form action={createCommentAction} className="inline-form-stack" onSubmit={handleSubmit}>
      <input name="postId" type="hidden" value={postId} />
      <div className="assistant-intro">
        <strong>{responsePrompt}</strong>
        <span>{responseGuidance}</span>
      </div>
      <textarea
        className="composer-textarea"
        disabled={isCoolingDown}
        name="content"
        onChange={(event) => setDraft(event.target.value)}
        placeholder={
          isCoolingDown
            ? "Replying is paused while Ichigo resets your reply health."
            : "Reply in the tone this post asked for."
        }
        rows={5}
        value={draft}
        required
      />

      <div className="assistant-toolbar">
        <button
          className="button button-secondary subtle-button"
          disabled={isCoolingDown}
          onClick={() => void runAnalysis(draft)}
          type="button"
        >
          {isAnalyzing ? "Checking fit..." : "Check fit"}
        </button>

        {analysis?.suggestedRewrite ? (
          <button
            className="button button-secondary subtle-button"
            disabled={isCoolingDown}
            onClick={applySuggestedRewrite}
            type="button"
          >
            Use suggested rewrite
          </button>
        ) : null}
      </div>

      {analysis ? (
        <div className={`assistant-status assistant-status-${analysis.classification}`}>
          <div className="assistant-status-head">
            <strong>{describeVerdict(analysis.classification)}</strong>
            <span>{analysis.alignmentScore}/100</span>
          </div>
          <p>{analysis.reason}</p>
          {analysis.suggestedRewrite ? (
            <div className="assistant-rewrite">
              <span className="card-footer-note">Suggested rewrite</span>
              <p>{analysis.suggestedRewrite}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="assistant-note">
          {isCoolingDown
            ? mounted && cooldownEndsAt
              ? `Replying is paused until ${new Date(cooldownEndsAt).toLocaleString()}.`
              : "Replying is paused for now."
            : "Ichigo will check whether your reply matches the ask as you write."}
        </div>
      )}

      {guardMessage ? <p className="form-error">{guardMessage}</p> : null}

      <SubmitButton
        className="button button-primary"
        disabled={isCoolingDown}
        pendingLabel="Posting reply..."
      >
        {isCoolingDown ? "Replying paused" : "Send reply"}
      </SubmitButton>
    </form>
  );
}
