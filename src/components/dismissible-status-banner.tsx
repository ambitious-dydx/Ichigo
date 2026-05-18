"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type BannerTone = "success" | "error";

export function DismissibleStatusBanner({
  clearKeys = [],
  text,
  tone,
}: {
  clearKeys?: string[];
  text: string;
  tone: BannerTone;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className={`status-banner ${tone === "error" ? "status-banner-error" : ""}`}>
      <span>{text}</span>
      <button
        aria-label="Dismiss message"
        className="status-banner-dismiss"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());

          for (const key of clearKeys) {
            params.delete(key);
          }

          const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
          setDismissed(true);
          router.replace(nextUrl, { scroll: false });
        }}
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
