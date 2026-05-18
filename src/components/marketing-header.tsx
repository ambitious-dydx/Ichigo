"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SessionUser } from "../server/types";
import { ThemeLogo } from "./theme-logo";
import { ThemeToggle } from "./theme-toggle";

function useCompactMode(query: string) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return compact;
}

function MenuIcon({ close = false }: { close?: boolean }) {
  return close ? (
    <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
      <path d="m6.75 6.75 10.5 10.5" />
      <path d="m17.25 6.75-10.5 10.5" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </svg>
  );
}

export function MarketingHeader({ viewer }: { viewer: SessionUser | null }) {
  const compact = useCompactMode("(max-width: 1180px)");
  const [menuOpen, setMenuOpen] = useState(false);
  const isSignedIn = Boolean(viewer);
  const hasVerifiedEmail = Boolean(viewer?.emailVerifiedAt);
  const hasCompletedOnboarding = Boolean(viewer?.onboardingCompletedAt);

  const navItems = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#principle", label: "Why it matters" },
    { href: "#modes", label: "Modes" },
    {
      href: isSignedIn
        ? hasVerifiedEmail
          ? hasCompletedOnboarding
            ? "/app/feed"
            : "/app/onboarding"
          : "/app/verify"
        : "#demo",
      label: isSignedIn
        ? hasVerifiedEmail
          ? hasCompletedOnboarding
            ? "Open app"
            : "Finish setup"
          : "Verify email"
        : "Try it",
    },
  ];

  useEffect(() => {
    if (!compact) {
      setMenuOpen(false);
    }
  }, [compact]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.classList.remove("nav-sheet-open");
      return;
    }

    document.body.classList.add("nav-sheet-open");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("nav-sheet-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="marketing-header">
        <div className="marketing-header-main">
          <Link className="brand" href="/">
            <ThemeLogo alt="Ichigo logo" height={44} width={44} />
            <span>Ichigo</span>
          </Link>

          {!compact ? (
            <nav aria-label="Marketing" className="marketing-header-nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="marketing-header-tools">
          {compact ? (
            <>
              <ThemeToggle variant="icon" />
              <button
                aria-controls="marketing-nav-sheet"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="app-icon-button"
                onClick={() => setMenuOpen((value) => !value)}
                type="button"
              >
                <MenuIcon close={menuOpen} />
              </button>
            </>
          ) : (
            <div className="cta-row">
              <ThemeToggle />
              {isSignedIn ? (
                <>
                  {hasVerifiedEmail ? (
                    hasCompletedOnboarding ? (
                      <>
                        <Link className="button button-secondary" href="/app/feed">
                          Open the app
                        </Link>
                        <Link className="button button-primary" href="/app/compose">
                          Write a post
                        </Link>
                      </>
                    ) : (
                      <Link className="button button-primary" href="/app/onboarding">
                        Continue setup
                      </Link>
                    )
                  ) : (
                    <>
                      <Link className="button button-secondary" href="/app/verify">
                        Verify email
                      </Link>
                      <Link className="button button-primary" href="/app/settings/account">
                        Account settings
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link className="button button-secondary" href="/login">
                    Sign in
                  </Link>
                  <Link className="button button-primary" href="/register">
                    Create account
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {compact && menuOpen ? (
        <>
          <button
            aria-label="Close menu"
            className="nav-sheet-backdrop"
            onClick={closeMenu}
            type="button"
          />

          <aside className="nav-sheet" id="marketing-nav-sheet">
            <div className="nav-sheet-header">
              <Link className="brand" href="/" onClick={closeMenu}>
                <ThemeLogo alt="Ichigo logo" height={42} width={42} />
                <span>Ichigo</span>
              </Link>

              <button
                aria-label="Close menu"
                className="app-icon-button nav-sheet-close"
                onClick={closeMenu}
                type="button"
              >
                <MenuIcon close />
              </button>
            </div>

            <section className="nav-sheet-group">
              <p className="nav-sheet-label">Explore</p>
              <div className="nav-sheet-links">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    className="nav-sheet-link"
                    href={item.href}
                    onClick={closeMenu}
                  >
                    <div className="nav-sheet-link-copy">
                      <strong>{item.label}</strong>
                      <span>
                        {item.label === "How it works"
                          ? "See the product flow"
                          : item.label === "Why it matters"
                            ? "Read the thesis"
                            : item.label === "Modes"
                              ? "Browse response styles"
                              : isSignedIn
                                ? hasVerifiedEmail
                                  ? hasCompletedOnboarding
                                    ? "Go inside Ichigo"
                                    : "Finish onboarding"
                                  : "Confirm your address"
                                : "Try the product"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="nav-sheet-group">
              <p className="nav-sheet-label">{isSignedIn ? "Inside Ichigo" : "Get started"}</p>
              <div className="nav-sheet-actions">
                {isSignedIn ? (
                  <>
                    {hasVerifiedEmail ? (
                      hasCompletedOnboarding ? (
                        <>
                          <Link className="button button-secondary" href="/app/feed" onClick={closeMenu}>
                            Open the app
                          </Link>
                          <Link className="button button-primary" href="/app/compose" onClick={closeMenu}>
                            Write a post
                          </Link>
                        </>
                      ) : (
                        <Link className="button button-primary" href="/app/onboarding" onClick={closeMenu}>
                          Continue setup
                        </Link>
                      )
                    ) : (
                      <>
                        <Link className="button button-secondary" href="/app/verify" onClick={closeMenu}>
                          Verify email
                        </Link>
                        <Link className="button button-primary" href="/app/settings/account" onClick={closeMenu}>
                          Account settings
                        </Link>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link className="button button-secondary" href="/login" onClick={closeMenu}>
                      Sign in
                    </Link>
                    <Link className="button button-primary" href="/register" onClick={closeMenu}>
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </section>
          </aside>
        </>
      ) : null}
    </>
  );
}
