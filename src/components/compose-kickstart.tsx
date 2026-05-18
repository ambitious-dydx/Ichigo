"use client";

import { startTransition, useState } from "react";
import type { ModeId } from "../modes";
import type { FeedbackFocus } from "../server/types";

type ComposeKickstartProps = {
  focus: FeedbackFocus | null;
  preferredMode: ModeId | null;
};

type StarterTemplate = {
  label: string;
  content: string;
  mode: ModeId;
};

function getTemplates(focus: FeedbackFocus | null): StarterTemplate[] {
  switch (focus) {
    case "creator":
      return [
        {
          label: "Work in progress",
          mode: "advise",
          content:
            "I am deciding whether this piece is strong enough to share publicly. Tell me what feels unfinished and what is already working.",
        },
        {
          label: "Soft critique",
          mode: "soft-truth",
          content:
            "I want honesty on this draft, but I do not want performative critique. Tell me what the real weak point is with care.",
        },
        {
          label: "Momentum",
          mode: "challenge",
          content:
            "I keep revising instead of publishing. Push me toward the next visible move.",
        },
      ];
    case "reflection":
      return [
        {
          label: "Pattern check",
          mode: "soft-truth",
          content:
            "I think I may be repeating a pattern that is making this harder. Help me see what I may be avoiding, but hold it gently.",
        },
        {
          label: "Just listen",
          mode: "listen",
          content:
            "I need to say this clearly before I know what to do about it. Please stay with what I am saying before you try to fix it.",
        },
        {
          label: "What now?",
          mode: "advise",
          content:
            "I am trying to understand what the next right move is here. Help me sort signal from noise.",
        },
      ];
    case "support":
      return [
        {
          label: "Need care first",
          mode: "comfort",
          content:
            "This is heavier than I want to admit. I do not need solutions first. I need people to meet this with care.",
        },
        {
          label: "Hold space",
          mode: "listen",
          content:
            "I need somewhere to put this before it hardens. Please do not fix it yet. Just hear it with me.",
        },
        {
          label: "Gentle truth",
          mode: "soft-truth",
          content:
            "I think I need honesty here, but not the kind that turns this into a performance. Tell me the truth carefully.",
        },
      ];
    default:
      return [
        {
          label: "Product decision",
          mode: "advise",
          content:
            "I have two product directions and not enough time to build both. Help me decide which one is more likely to teach me something real in the next week.",
        },
        {
          label: "Pressure-test this",
          mode: "soft-truth",
          content:
            "I think I may be overbuilding before I have enough user signal. Tell me the real weak point in my thinking, but do it with care.",
        },
        {
          label: "Call me forward",
          mode: "challenge",
          content:
            "I keep postponing the next visible launch step. Push me toward action instead of letting me hide in planning.",
        },
      ];
  }
}

export function ComposeKickstart({ focus, preferredMode }: ComposeKickstartProps) {
  const templates = getTemplates(focus);
  const [suggestion, setSuggestion] = useState<string>("");
  const [isSuggesting, setIsSuggesting] = useState(false);

  function applyTemplate(template: StarterTemplate) {
    const textarea = document.getElementById("content") as HTMLTextAreaElement | null;

    if (textarea) {
      textarea.value = template.content;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }

    const radio = document.querySelector<HTMLInputElement>(
      `input[name="responseMode"][value="${template.mode}"]`,
    );
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }

    startTransition(() => {
      setSuggestion(`Loaded "${template.label}" and set ${template.mode} as the mode.`);
    });
  }

  async function suggestModeFromDraft() {
    const textarea = document.getElementById("content") as HTMLTextAreaElement | null;
    const content = textarea?.value.trim() ?? "";

    if (!content) {
      setSuggestion("Write a few lines first, then ask Ichigo to suggest a mode.");
      return;
    }

    setIsSuggesting(true);
    setSuggestion("");

    try {
      const response = await fetch("/api/ai/suggest-mode", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Unable to suggest mode");
      }

      const payload = (await response.json()) as { mode: ModeId };
      const radio = document.querySelector<HTMLInputElement>(
        `input[name="responseMode"][value="${payload.mode}"]`,
      );

      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }

      setSuggestion(
        `Ichigo thinks "${payload.mode}" fits this draft best${preferredMode && payload.mode === preferredMode ? " and it matches your default mode." : "."}`,
      );
    } catch {
      setSuggestion("Ichigo could not suggest a mode right now.");
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <section className="panel support-card">
      <div className="panel-title-row">
        <div>
          <p className="sidebar-label">Founder-first starters</p>
          <h3>Start from a sharper ask.</h3>
        </div>
        <button
          className="button button-secondary subtle-button"
          onClick={suggestModeFromDraft}
          type="button"
        >
          {isSuggesting ? "Reading draft..." : "Suggest a mode"}
        </button>
      </div>

      <div className="template-grid">
        {templates.map((template) => (
          <button
            key={template.label}
            className="template-card"
            onClick={() => applyTemplate(template)}
            type="button"
          >
            <span className="card-footer-note">{template.label}</span>
            <strong>{template.content}</strong>
          </button>
        ))}
      </div>

      {suggestion ? <p className="assistant-note">{suggestion}</p> : null}
    </section>
  );
}
