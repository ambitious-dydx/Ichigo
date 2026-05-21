"use client";

import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../password-policy";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  revealLabel?: string;
  hideLabel?: string;
  showPolicy?: boolean;
};

function getPasswordChecks(value: string) {
  return [
    {
      id: "length",
      label: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
      met: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    },
    {
      id: "upper",
      label: "At least one uppercase letter",
      met: /[A-Z]/.test(value),
    },
    {
      id: "lower",
      label: "At least one lowercase letter",
      met: /[a-z]/.test(value),
    },
    {
      id: "number",
      label: "At least one number",
      met: /\d/.test(value),
    },
    {
      id: "symbol",
      label: "At least one symbol",
      met: /[^A-Za-z0-9\s]/.test(value),
    },
    {
      id: "spaces",
      label: "No spaces",
      met: !/\s/.test(value),
    },
  ];
}

export function PasswordField({
  className = "text-input",
  revealLabel = "Show password",
  hideLabel = "Hide password",
  showPolicy = false,
  onChange,
  value,
  defaultValue,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(typeof defaultValue === "string" ? defaultValue : "");
  const currentValue = typeof value === "string" ? value : draft;
  const passwordChecks = getPasswordChecks(currentValue);
  const inputValueProps =
    typeof value === "string"
      ? { value }
      : { defaultValue };

  return (
    <div className="password-field-stack">
      <div className="password-field">
      <input
        {...props}
        className={`${className} password-field-input`.trim()}
        {...inputValueProps}
        maxLength={props.maxLength ?? PASSWORD_MAX_LENGTH}
        onChange={(event) => {
          if (typeof value !== "string") {
            setDraft(event.currentTarget.value);
          }

          onChange?.(event);
        }}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? hideLabel : revealLabel}
        className="password-toggle"
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="password-toggle-icon"
          viewBox="0 0 24 24"
        >
          <path d="M2.75 12s3.25-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.25 5.5-9.25 5.5S2.75 12 2.75 12Z" />
          <circle cx="12" cy="12" r="2.75" />
          {visible ? (
            <path d="m4.5 4.5 15 15" />
          ) : null}
        </svg>
      </button>
      </div>

      {showPolicy ? (
        <div className="password-policy-card" aria-live="polite">
          <p className="password-policy-title">Password should include</p>
          <div className="password-policy-grid">
            {passwordChecks.map((check) => (
              <div
                key={check.id}
                className={`password-policy-row ${check.met ? "is-met" : ""}`}
              >
                <span className="password-policy-dot" aria-hidden="true" />
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
