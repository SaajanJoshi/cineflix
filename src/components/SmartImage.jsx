import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { performanceProfile } from '../lib/performance.js';

let observer;
const callbacks = new Map();
const legacyCallbacks = new Map();
let legacyScheduled = false;
let legacyListening = false;

function sharedObserver() {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) callbacks.get(entry.target)?.(entry.isIntersecting);
  }, {
    root: null,
    rootMargin: performanceProfile().imageMargin,
    threshold: 0.01,
  });
  return observer;
}

function runLegacyCheck() {
  legacyScheduled = false;
  const profile = performanceProfile();
  const marginX = profile.lowMemory ? 240 : 700;
  const marginY = profile.lowMemory ? 260 : 720;
  const width = window.innerWidth || 1920;
  const height = window.innerHeight || 1080;
  for (const [node, callback] of legacyCallbacks) {
    const rect = node.getBoundingClientRect();
    callback(
      rect.right >= -marginX
      && rect.left <= width + marginX
      && rect.bottom >= -marginY
      && rect.top <= height + marginY,
    );
  }
}

function scheduleLegacyCheck() {
  if (legacyScheduled) return;
  legacyScheduled = true;
  const raf = window.requestAnimationFrame || ((fn) => window.setTimeout(fn, 32));
  raf(runLegacyCheck);
}

function ensureLegacyListeners() {
  if (legacyListening) return;
  legacyListening = true;
  window.addEventListener('scroll', scheduleLegacyCheck, { passive: true });
  window.addEventListener('resize', scheduleLegacyCheck, { passive: true });
}

export default function SmartImage({
  src,
  alt = '',
  sx,
  priority = false,
  unloadWhenFar = true,
  ...props
}) {
  const ref = useRef(null);
  const [near, setNear] = useState(priority);

  useEffect(() => {
    const node = ref.current;
    if (!node || !src) return undefined;
    const update = (visible) => {
      if (visible) setNear(true);
      else if (unloadWhenFar) setNear(false);
    };

    const io = sharedObserver();
    if (io) {
      callbacks.set(node, update);
      io.observe(node);
      return () => {
        io.unobserve(node);
        callbacks.delete(node);
      };
    }

    ensureLegacyListeners();
    legacyCallbacks.set(node, update);
    scheduleLegacyCheck();
    return () => legacyCallbacks.delete(node);
  }, [src, unloadWhenFar]);

  return (
    <Box
      ref={ref}
      component="img"
      src={near && src ? src : undefined}
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      sx={sx}
      {...props}
    />
  );
}
