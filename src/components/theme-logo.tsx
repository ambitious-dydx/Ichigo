type ThemeLogoVariant = "mark" | "lockup";

const THEME_LOGO_SOURCES: Record<
  ThemeLogoVariant,
  { light: string; dark: string; width: number; height: number }
> = {
  mark: {
    light: "/brand/ichigo-mark-light.svg",
    dark: "/brand/ichigo-mark-dark.svg",
    width: 512,
    height: 512,
  },
  lockup: {
    light: "/brand/ichigo-lockup-light.svg",
    dark: "/brand/ichigo-lockup-dark.svg",
    width: 1200,
    height: 420,
  },
};

export function ThemeLogo({
  alt,
  className,
  variant = "mark",
  width,
  height,
}: {
  alt: string;
  className?: string;
  variant?: ThemeLogoVariant;
  width: number;
  height: number;
}) {
  const source = THEME_LOGO_SOURCES[variant];

  return (
    <span
      aria-label={alt}
      className={`theme-logo${className ? ` ${className}` : ""}`}
      role="img"
      style={{ width, height }}
    >
      <img
        alt=""
        aria-hidden="true"
        className="theme-logo-image theme-logo-image-light"
        height={source.height}
        src={source.light}
        width={source.width}
      />
      <img
        alt=""
        aria-hidden="true"
        className="theme-logo-image theme-logo-image-dark"
        height={source.height}
        src={source.dark}
        width={source.width}
      />
    </span>
  );
}
