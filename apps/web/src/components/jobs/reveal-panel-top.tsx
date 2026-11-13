'use client';

import { useEffect, useRef } from 'react';

/**
 * Near the end of a long list the sticky job panel is pushed up with the list and its title hides
 * under the fixed header. Rendered inside the panel, which is keyed by the selected job, so it runs
 * once per selection after the new job is on screen; scrolling at click time instead gets cancelled
 * when the new job renders mid-scroll.
 */
export function RevealPanelTop() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const panel = marker.current?.closest('[data-job-panel]');
    // Hidden below `lg` (no layout boxes): phones never show the panel.
    if (!panel || panel.getClientRects().length === 0) return;
    const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    if (panel.getBoundingClientRect().top >= headerBottom) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, []);

  return <span ref={marker} hidden />;
}
