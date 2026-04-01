/** Public production site (no trailing slash). Override with VITE_SITE_URL for previews or staging. */
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || "https://bookly.my"
) as string;

/** Default contact when Super Admin has not set one */
export const DEFAULT_SUPPORT_EMAIL = "support@bookly.my";
