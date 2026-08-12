import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { clearProgress, getResumePosition, saveProgress } from '../lib/library.js';
import Icon from './Icon.jsx';

export default function PlayerDialog({ playback, playerConfig, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retry, setRetry] = useState(0);
  const lastSavedRef = useRef({ at: 0, currentTime: 0 });
  const media = playback?.media || playback;
  const season = Number(playback?.season || 1);
  const episode = Number(playback?.episode || 1);
  const episodeName = playback?.episodeName || '';
  const baseUrl = playerConfig?.baseUrl || 'https://www.vidking.net';
  const color = playerConfig?.color || 'e50914';
  // By default don't set a sandbox for playback providers; allow overriding via `playerConfig.sandbox`
  const sandbox = playerConfig?.sandbox;

  const src = useMemo(() => {
    if (!media?.id) return '';
    const params = new URLSearchParams({ color, autoPlay: 'true' });
    if (media.mediaType === 'tv') {
      params.set('nextEpisode', 'true');
      params.set('episodeSelector', 'true');
    }
    const progress = getResumePosition(media, season, episode);
    if (progress) params.set('progress', String(progress));
    const cleanBase = baseUrl.replace(/\/$/, '');
    const path = media.mediaType === 'tv'
      ? `/embed/tv/${media.id}/${season}/${episode}`
      : `/embed/movie/${media.id}`;
    return `${cleanBase}${path}?${params.toString()}`;
  }, [media?.id, media?.mediaType, season, episode, baseUrl, color]);

  useEffect(() => {
    if (!media?.id) return undefined;
    setLoaded(false);
    setTimedOut(false);
    lastSavedRef.current = { at: 0, currentTime: 0 };
    const timer = window.setTimeout(() => setTimedOut(true), 16000);
    return () => window.clearTimeout(timer);
  }, [media?.id, season, episode, retry]);

  useEffect(() => {
    if (!media?.id) return undefined;
    const expectedOrigin = new URL(baseUrl).origin;
    const onMessage = (event) => {
      if (event.origin !== expectedOrigin) return;
      let payload = event.data;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (payload?.type !== 'PLAYER_EVENT') return;
      const data = payload.data || {};
      if (data.id != null && String(data.id) !== String(media.id)) return;
      const eventName = data.event || payload.event || '';
      const currentTime = Number(data.currentTime ?? data.position ?? data.current_time ?? 0);
      const duration = Number(data.duration ?? data.totalDuration ?? 0);
      const percent = Number(data.percent ?? data.progress ?? (duration > 0 ? (currentTime / duration) * 100 : 0));

      if (eventName === 'ended' || percent >= 95) {
        clearProgress(media, season, episode);
        return;
      }
      if (Number.isFinite(currentTime) && currentTime >= 0) {
        const now = Date.now();
        const last = lastSavedRef.current;
        const importantEvent = eventName === 'pause' || eventName === 'seeked';
        const enoughTimePassed = now - last.at >= 5000;
        const jumped = Math.abs(currentTime - last.currentTime) >= 20;
        if (importantEvent || enoughTimePassed || jumped) {
          saveProgress({ media, season, episode, episodeName, currentTime, duration, percent });
          lastSavedRef.current = { at: now, currentTime };
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [media, season, episode, episodeName, baseUrl]);

  return (
    <Dialog open={Boolean(media)} onClose={onClose} fullScreen PaperProps={{ sx: { bgcolor: '#000', backgroundImage: 'none' } }}>
      <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000' }}>
        <Box sx={{ position: 'absolute', zIndex: 5, left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1.4, background: 'linear-gradient(180deg, rgba(0,0,0,.86), transparent)', pointerEvents: 'none' }}>
          <IconButton data-tv-focus="true" onClick={onClose} aria-label="Exit player" sx={{ pointerEvents: 'auto', bgcolor: 'rgba(0,0,0,.62)', border: '1px solid rgba(255,255,255,.36)', '&:hover': { bgcolor: '#000' } }}>
            <Icon name="left" size={25} />
          </IconButton>
          <Box sx={{ minWidth: 0, textShadow: '0 2px 10px #000' }}>
            <Typography noWrap sx={{ fontWeight: 900, fontSize: { xs: '.95rem', md: '1.08rem' } }}>{media?.title}</Typography>
            {media?.mediaType === 'tv' ? <Typography sx={{ color: 'rgba(255,255,255,.72)', fontSize: '.76rem' }}>Season {season}, Episode {episode}{episodeName ? ` · ${episodeName}` : ''}</Typography> : null}
          </Box>
        </Box>

        {!loaded ? (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>Opening VidKing player…</Typography>
            </Box>
          </Box>
        ) : null}

        {timedOut && !loaded ? (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 4, bgcolor: 'rgba(0,0,0,.88)', px: 2 }}>
            <Box sx={{ textAlign: 'center', maxWidth: 520 }}>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 900 }}>The player is taking longer than expected</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Check your connection or retry the embed. Some titles may not be available from the playback provider.</Typography>
              <Button data-tv-focus="true" variant="contained" onClick={() => setRetry((value) => value + 1)} startIcon={<Icon name="refresh" size={19} />} sx={{ mt: 2.5 }}>Retry</Button>
            </Box>
          </Box>
        ) : null}

        {src ? (
          <Box
            key={`${src}:${retry}`}
            component="iframe"
            title={media?.title ? `Playing ${media.title}` : 'VidKing player'}
            data-tv-focus="true"
            tabIndex={0}
            src={src}
            onLoad={() => { setLoaded(true); setTimedOut(false); }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            sandbox={sandbox}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sx={{ width: '100%', height: '100%', border: 0, display: 'block', bgcolor: '#000' }}
          />
        ) : null}
      </Box>
    </Dialog>
  );
}
