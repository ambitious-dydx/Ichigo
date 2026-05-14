"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { mounted, theme, toggleTheme } = useTheme();
  const activeTheme = mounted ? theme : "light";

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
