import { useEffect } from 'react';
import { performanceProfile } from '../lib/performance.js';

function visibleCandidates() {
  const width = window.innerWidth || 1920;
  const height = window.innerHeight || 1080;
  const marginX = width * 0.9;
  const marginY = height * 0.9;

  return [...document.querySelectorAll('[data-tv-focus="true"]')]
    .filter((el) => !el.disabled && el.getAttribute('aria-hidden') !== 'true')
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .filter(({ rect }) => (
      rect.right >= -marginX
      && rect.left <= width + marginX
      && rect.bottom >= -marginY
      && rect.top <= height + marginY
    ));
}

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function useTvNavigation() {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      const items = visibleCandidates();
      if (!items.length) return;
      const active = document.activeElement;
      const activeItem = items.find((item) => item.el === active);
      if (!activeItem) {
        items[0].el.focus();
        event.preventDefault();
        return;
      }

      const from = center(activeItem.rect);
      const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      const dir = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const next = items
        .filter(({ el }) => el !== active)
        .map(({ el, rect }) => ({ el, p: center(rect) }))
        .filter(({ p }) => (horizontal ? (p.x - from.x) * dir > 10 : (p.y - from.y) * dir > 10))
        .map(({ el, p }) => {
          const primary = horizontal ? Math.abs(p.x - from.x) : Math.abs(p.y - from.y);
          const cross = horizontal ? Math.abs(p.y - from.y) : Math.abs(p.x - from.x);
          return { el, score: primary + cross * 2.5 };
        })
        .sort((a, b) => a.score - b.score)[0]?.el;

      if (next) {
        next.focus({ preventScroll: true });
        next.scrollIntoView({
          behavior: performanceProfile().lowMemory ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center',
        });
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
