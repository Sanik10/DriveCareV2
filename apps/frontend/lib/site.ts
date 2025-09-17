// path: apps/frontend/lib/site.ts

/**
 * URL главной (маркетинговой) страницы.
 * Можно указать полный внешний URL (например, http://localhost:5173) или оставить '/'.
 */
export function getMarketingHomeUrl(): string {
  const url =
    (process.env.NEXT_PUBLIC_MARKETING_HOME_URL as string | undefined)?.trim() || '/';
  return url.replace(/\/+$/, '') || '/';
}
