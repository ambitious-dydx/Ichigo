"use client";

import type { InputHTMLAttributes } from "react";
import { useState } from "react";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  revealLabel?: string;
  hideLabel?: string;
};

export function PasswordField({
  className = "text-input",
  revealLabel = "Show password",
  hideLabel = "Hide password",
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        {...props}
        className={`${className} password-field-input`.trim()}
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
  );
}
