import type { ReactNode } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "../src/components/theme-provider";
import "../src/styles.css";

export const metadata: Metadata = {
  title: {
    default: "Ichigo",
    template: "%s | Ichigo",
  },
  description:
    "Ichigo is an intentional feedback platform where every post sets the kind of response it wants.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.png"],
  },
};

const themeScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("ichigo-theme");
    const theme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html data-theme="light" lang="en" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body>
        <Script id="ichigo-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
