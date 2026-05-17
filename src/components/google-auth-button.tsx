import { isGoogleAuthConfigured } from "../server/google-oauth";

export function GoogleAuthButton({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  if (!isGoogleAuthConfigured()) {
    return null;
  }

  return (
    <a className={`button button-provider ${className}`.trim()} href="/api/auth/google">
      <svg aria-hidden="true" className="button-provider-icon" viewBox="0 0 24 24">
        <path
          d="M21.81 12.23c0-.72-.06-1.25-.2-1.81H12.2v3.44h5.52c-.11.85-.71 2.14-2.05 3l-.02.12 2.97 2.3.21.02c1.94-1.79 3.07-4.42 3.07-7.07Z"
          fill="#4285F4"
        />
        <path
          d="M12.2 22c2.71 0 4.98-.89 6.64-2.42l-3.16-2.45c-.84.59-1.97 1-3.48 1-2.66 0-4.91-1.79-5.72-4.25l-.12.01-3.08 2.39-.04.12A10.03 10.03 0 0 0 12.2 22Z"
          fill="#34A853"
        />
        <path
          d="M6.48 13.88A6.13 6.13 0 0 1 6.16 12c0-.66.12-1.29.31-1.88l-.01-.13-3.12-2.43-.1.05A10.14 10.14 0 0 0 2.16 12c0 1.62.39 3.15 1.08 4.39l3.24-2.51Z"
          fill="#FBBC05"
        />
        <path
          d="M12.2 5.87c1.9 0 3.18.82 3.91 1.5l2.85-2.78C17.17 2.97 14.9 2 12.2 2a10.03 10.03 0 0 0-8.96 5.61l3.24 2.51c.82-2.46 3.07-4.25 5.72-4.25Z"
          fill="#EA4335"
        />
      </svg>
      <span>{label}</span>
    </a>
  );
}
