import { useEffect } from "react";
import { applySeo, type SeoOptions } from "@/lib/seo";

/**
 * Sets title, meta description, Open Graph, Twitter, canonical, and robots for the current view.
 */
export function useSeo(options: SeoOptions) {
  useEffect(() => {
    applySeo(options);
  }, [
    options.title,
    options.description,
    options.path,
    options.noindex,
    options.ogType,
    options.ogImage,
  ]);
}
