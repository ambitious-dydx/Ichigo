import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "../src/components/theme-provider";
import "../src/styles.css";

export const metadata: Metadata = {
  title: {
    default: "Ichigo",
    template: "%s | Ichigo",
  },
  description:
    "Ichigo is an intentional feedback platform where every post sets the kind of response it wants.",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
