"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "../server/actions";
import type { SessionUser } from "../server/types";
import { ThemeLogo } from "./theme-logo";
import { ThemeToggle } from "./theme-toggle";

type IconName =
  | "home"
  | "feed"
  | "write"
  | "rooms"
  | "activity"
  | "profile"
  | "settings"
  | "safety";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  matches: string[];
};

const onboardingItem: NavItem = {
  href: "/app/onboarding",
  label: "Onboarding",
  description: "Set your starting point",
  icon: "home",
  matches: ["/app/onboarding"],
};

const verificationItem: NavItem = {
  href: "/app/verify",
  label: "Verify email",
  description: "Unlock your account",
  icon: "settings",
  matches: ["/app/verify"],
};

const primaryItems: NavItem[] = [
  {
    href: "/app",
    label: "Home",
    description: "Overview",
    icon: "home",
    matches: ["/app"],
  },
  {
    href: "/app/feed",
    label: "Feed",
    description: "Current threads",
    icon: "feed",
    matches: ["/app/feed", "/app/posts/"],
  },
  {
    href: "/app/compose",
    label: "Write",
    description: "Start a post",
    icon: "write",
    matches: ["/app/compose"],
  },
  {
    href: "/app/rooms",
    label: "Rooms",
    description: "Shared context",
    icon: "rooms",
    matches: ["/app/rooms", "/app/rooms/"],
  },
  {
    href: "/app/notifications",
    label: "Activity",
    description: "What changed",
    icon: "activity",
    matches: ["/app/notifications"],
  },
];

function getAccountItems(currentUser: SessionUser): NavItem[] {
  const settingsHref =
    currentUser.emailVerifiedAt && currentUser.onboardingCompletedAt
      ? "/app/settings"
      : "/app/settings/account";
  const items: NavItem[] = [
    {
      href: "/app/profile",
      label: "Profile",
      description: "Your voice",
      icon: "profile",
      matches: ["/app/profile"],
    },
    {
      href: settingsHref,
      label: "Settings",
      description: "Account and sessions",
      icon: "settings",
      matches: ["/app/settings", "/app/settings/"],
    },
  ];

  if (currentUser.role !== "user") {
    items.push({
      href: "/app/moderation",
      label: "Safety",
      description: "Reports and review",
      icon: "safety",
      matches: ["/app/moderation"],
    });
  }

  return items;
}

function matchesItem(pathname: string, item: NavItem) {
  return item.matches.some((match) =>
    pathname === match || (match.endsWith("/") && pathname.startsWith(match)),
  );
}

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

function NavIcon({ name }: { name: IconName | "menu" | "close" }) {
  switch (name) {
    case "home":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M4.75 10.5 12 4.75l7.25 5.75v8.75H4.75Z" />
          <path d="M9.5 19.25V13h5v6.25" />
        </svg>
      );
    case "feed":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M7 6.75h10" />
          <path d="M7 12h10" />
          <path d="M7 17.25h10" />
          <path d="M4.75 6.75h.5" />
          <path d="M4.75 12h.5" />
          <path d="M4.75 17.25h.5" />
        </svg>
      );
    case "write":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="m6.75 17.25 1.1-3.85L15.8 5.45a1.6 1.6 0 0 1 2.25 0l.5.5a1.6 1.6 0 0 1 0 2.25L10.6 16.15l-3.85 1.1Z" />
          <path d="m14.75 6.5 2.75 2.75" />
        </svg>
      );
    case "rooms":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <rect x="4.75" y="6" width="14.5" height="12" rx="2.25" />
          <path d="M8.25 10h7.5" />
          <path d="M8.25 14h5.5" />
        </svg>
      );
    case "activity":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M4.75 12h3.5l2-3.25 3.25 6.5 2-3.25h3.75" />
        </svg>
      );
    case "profile":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="8.25" r="3.25" />
          <path d="M5.75 18.75a6.25 6.25 0 0 1 12.5 0" />
        </svg>
      );
    case "settings":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 4.5v2.25M12 17.25v2.25M19.5 12h-2.25M6.75 12H4.5M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6M17.3 17.3l-1.6-1.6M8.3 8.3 6.7 6.7" />
        </svg>
      );
    case "safety":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M12 4.5 18.75 7v4.75c0 4.1-2.7 6.8-6.75 7.75-4.05-.95-6.75-3.65-6.75-7.75V7Z" />
        </svg>
      );
    case "close":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="m6.75 6.75 10.5 10.5" />
          <path d="m17.25 6.75-10.5 10.5" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
        </svg>
      );
  }
}

export function AppNavigation({ currentUser }: { currentUser: SessionUser }) {
  const pathname = usePathname();
  const compact = useCompactMode("(max-width: 980px)");
  const hasVerifiedEmail = Boolean(currentUser.emailVerifiedAt);
  const hasCompletedOnboarding = Boolean(currentUser.onboardingCompletedAt);
  const accountItems = useMemo(() => getAccountItems(currentUser), [currentUser]);
  const visiblePrimaryItems = useMemo(
    () => (hasVerifiedEmail && hasCompletedOnboarding ? primaryItems : []),
    [hasVerifiedEmail, hasCompletedOnboarding],
  );
  const allItems = useMemo(
    () => [...visiblePrimaryItems, ...accountItems],
    [visiblePrimaryItems, accountItems],
  );
  const currentItem =
    allItems.find((item) => matchesItem(pathname, item)) ??
    (!hasVerifiedEmail
      ? verificationItem
      : matchesItem(pathname, onboardingItem)
        ? onboardingItem
        : hasCompletedOnboarding
        ? primaryItems[0]
        : onboardingItem);

  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAccountOpen(false);
    setMenuOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    if (compact || !accountOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, compact]);

  return (
    <>
      <nav aria-label="App" className="app-navbar">
        <div className="app-navbar-left">
          <Link className="brand app-navbar-brand" href="/app">
            <ThemeLogo alt="Ichigo logo" height={42} width={42} />
            <span>Ichigo</span>
          </Link>

          {compact ? (
            <div className="app-navbar-current">
              <span>Current</span>
              <strong>{currentItem.label}</strong>
            </div>
          ) : (
            visiblePrimaryItems.length ? (
              <div className="app-nav-tabs">
                {visiblePrimaryItems.map((item) => (
                  <Link
                    key={item.href}
                    className={`app-nav-tab${matchesItem(pathname, item) ? " active" : ""}`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null
          )}
        </div>

        <div className="app-navbar-tools">
          <ThemeToggle variant="icon" />

          {compact ? (
            <button
              aria-controls="app-nav-sheet"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="app-icon-button"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              <NavIcon name={menuOpen ? "close" : "menu"} />
            </button>
          ) : (
            <div className="app-account-menu" ref={accountRef}>
              <button
                aria-controls="app-account-panel"
                aria-expanded={accountOpen}
                aria-label="Open account menu"
                className={`app-icon-button${accountOpen ? " active" : ""}`}
                onClick={() => setAccountOpen((value) => !value)}
                type="button"
              >
                <NavIcon name="profile" />
              </button>

              {accountOpen ? (
                <div className="app-account-panel" id="app-account-panel">
                  <div className="app-account-summary">
                    <strong>@{currentUser.username}</strong>
                    <span>
                      {currentUser.role} · {currentUser.email}
                    </span>
                  </div>

                  <div className="app-account-links">
                    {accountItems.map((item) => (
                      <Link
                        key={item.href}
                        className={`app-account-link${matchesItem(pathname, item) ? " active" : ""}`}
                        href={item.href}
                      >
                        <NavIcon name={item.icon} />
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <form action={logoutAction}>
                    <button className="app-account-signout" type="submit">
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </nav>

      {compact && menuOpen ? (
        <>
          <button
            aria-label="Close navigation menu"
            className="nav-sheet-backdrop"
            onClick={() => setMenuOpen(false)}
            type="button"
          />

          <aside className="nav-sheet" id="app-nav-sheet">
            <div className="nav-sheet-header">
              <Link className="brand" href="/app" onClick={() => setMenuOpen(false)}>
                <ThemeLogo alt="Ichigo logo" height={42} width={42} />
                <span>Ichigo</span>
              </Link>

              <button
                aria-label="Close navigation menu"
                className="app-icon-button nav-sheet-close"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <NavIcon name="close" />
              </button>
            </div>

            <div className="nav-sheet-summary">
              <strong>@{currentUser.username}</strong>
              <span>
                {currentUser.role} · {currentUser.email}
              </span>
            </div>

            {visiblePrimaryItems.length ? (
              <section className="nav-sheet-group">
                <p className="nav-sheet-label">Navigate</p>
                <div className="nav-sheet-links">
                  {visiblePrimaryItems.map((item) => (
                    <Link
                      key={item.href}
                      className={`nav-sheet-link${matchesItem(pathname, item) ? " active" : ""}`}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      <NavIcon name={item.icon} />
                      <div className="nav-sheet-link-copy">
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="nav-sheet-group">
              <p className="nav-sheet-label">Account</p>
              <div className="nav-sheet-links">
                {accountItems.map((item) => (
                  <Link
                    key={item.href}
                    className={`nav-sheet-link${matchesItem(pathname, item) ? " active" : ""}`}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <NavIcon name={item.icon} />
                    <div className="nav-sheet-link-copy">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <div className="nav-sheet-footer">
              <form action={logoutAction}>
                <button className="app-account-signout nav-sheet-signout" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
