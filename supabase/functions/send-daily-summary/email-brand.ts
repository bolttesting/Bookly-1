// @ts-nocheck - Deno; bundled with this Edge Function (Supabase deploy does not include ../_shared)
/**
 * Bookly branding for HTML emails (Resend).
 * Logo URL uses SITE_URL so staging/local can point at the right origin.
 */

export function emailSiteOrigin(): string {
  return (Deno.env.get("SITE_URL") || "https://bookly.my").replace(/\/$/, "");
}

export function emailBrandLogoUrl(): string {
  return `${emailSiteOrigin()}/apple-touch-icon.png`;
}

export function emailBrandHeaderImgHtml(): string {
  const src = emailBrandLogoUrl();
  return `<div style="margin:0 auto 16px;text-align:center;">
<img src="${src}" alt="Bookly" width="52" height="52" style="width:52px;height:52px;border-radius:22%;display:inline-block;border:0;vertical-align:middle;" />
</div>`;
}

export function emailBrandFooterHtml(): string {
  const origin = emailSiteOrigin();
  return `<div style="padding:12px 20px 24px;text-align:center;font-size:11px;line-height:1.6;color:#a1a1aa;">
<a href="${origin}" style="color:#8b5cf6;text-decoration:none;font-weight:600;">Bookly</a>
 — scheduling &amp; online booking for service businesses
</div>`;
}
