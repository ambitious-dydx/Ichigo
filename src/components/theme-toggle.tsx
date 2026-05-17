"use client";

import { useTheme } from "./theme-provider";

function SunIcon() {
  return (
    <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
      <path d="M15.5 3.75a8.75 8.75 0 1 0 4.75 15.86A9.4 9.4 0 0 1 18.5 20C13.25 20 9 15.75 9 10.5c0-2.47.94-4.73 2.48-6.42a8.7 8.7 0 0 0 4.02-.33Z" />
    </svg>
  );
}

export function ThemeToggle({ variant = "pill" }: { variant?: "pill" | "icon" }) {
  const { mounted, theme, toggleTheme } = useTheme();
  const activeTheme = mounted ? theme : "light";

  if (variant === "icon") {
    return (
      <button
        aria-label={`Switch to ${activeTheme === "light" ? "dark" : "light"} theme`}
        aria-pressed={activeTheme === "dark"}
        className="app-icon-button"
        onClick={toggleTheme}
        title={activeTheme === "light" ? "Light theme" : "Dark theme"}
        type="button"
      >
        {activeTheme === "light" ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <button
      aria-label={`Switch to ${activeTheme === "light" ? "dark" : "light"} theme`}
      aria-pressed={activeTheme === "dark"}
      className="theme-toggle"
      data-theme={activeTheme}
      onClick={toggleTheme}
      type="button"
    >
      <span className={`theme-toggle-option${activeTheme === "light" ? " active" : ""}`}>
        Light
      </span>
      <span className={`theme-toggle-option${activeTheme === "dark" ? " active" : ""}`}>
        Dark
      </span>
      <span className="theme-toggle-thumb" />
    </button>
  );
}
