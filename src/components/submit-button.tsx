"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className,
  disabled = false,
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending || disabled} type="submit">
      {pending ? pendingLabel ?? "Working..." : children}
    </button>
  );
}
