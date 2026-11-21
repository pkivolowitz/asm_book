import { useEffect } from 'react';

export const SITE_NAME = 'Low-Level Lab';

// Sets the browser tab title; `null` keeps the site name alone.
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: ARM64 assembly and C, in your browser`;
  }, [title]);
}
