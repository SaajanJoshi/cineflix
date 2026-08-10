const TV_UA = /(smart[- ]?tv|smarttv|tizen|web0s|webos|netcast|hbbtv|bravia|viera|roku|aft[a-z0-9]*|firetv|crkey|googletv|appletv|dtv)/i;

function readModeOverride() {
  try {
    const value = new URLSearchParams(window.location.search).get('performance');
    if (value === 'tv' || value === 'full') return value;
  } catch {
    // Ignore malformed or restricted location access.
  }
  return '';
}

export function getPerformanceProfile() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { mode: 'full', lowMemory: false, isTv: false, imageMargin: '600px 420px' };
  }

  const override = readModeOverride();
  const userAgent = navigator.userAgent || '';
  const isTv = TV_UA.test(userAgent);
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches === true;
  const noHover = window.matchMedia?.('(hover: none)')?.matches === true;

  const constrainedHardware = (deviceMemory > 0 && deviceMemory <= 4) || (cores > 0 && cores <= 4);
  const lowMemory = override === 'tv' || (override !== 'full' && (isTv || constrainedHardware || (coarsePointer && noHover)));
  const profile = {
    mode: lowMemory ? 'tv' : 'full',
    lowMemory,
    isTv,
    deviceMemory: deviceMemory || null,
    cores: cores || null,
    imageMargin: lowMemory ? '240px 220px' : '700px 520px',
  };

  try {
    document.documentElement.dataset.performance = profile.mode;
  } catch {
    // Non-critical; some embedded browsers restrict document mutation early.
  }

  return profile;
}

let cachedProfile;
export function performanceProfile() {
  if (!cachedProfile) cachedProfile = getPerformanceProfile();
  return cachedProfile;
}

export function preferredImageSize(kind = 'card') {
  const lowMemory = performanceProfile().lowMemory;
  if (kind === 'poster') return lowMemory ? 'w342' : 'w500';
  if (kind === 'card') return lowMemory ? 'w300' : 'w780';
  if (kind === 'episode') return lowMemory ? 'w300' : 'w500';
  if (kind === 'logo') return lowMemory ? 'w300' : 'w500';
  if (kind === 'hero' || kind === 'details') return 'w1280';
  return lowMemory ? 'w300' : 'w780';
}
