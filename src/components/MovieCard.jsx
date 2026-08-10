import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { api } from '../api/client.js';
import { imageUrl, mediaLabel } from '../lib/media.js';
import { performanceProfile, preferredImageSize } from '../lib/performance.js';
import Icon from './Icon.jsx';
import RatingBadges from './RatingBadges.jsx';
import SmartImage from './SmartImage.jsx';

const previewCache = new Map();

function loadPreview(media) {
  const key = media.key || `${media.mediaType}:${media.id}`;
  if (!previewCache.has(key)) {
    if (previewCache.size >= 32) previewCache.delete(previewCache.keys().next().value);
    previewCache.set(key, api.preview(media.mediaType, media.id)
      .then((data) => data.preview || null)
      .catch(() => null));
  }
  return previewCache.get(key);
}

function canAutoplayPreview() {
  if (performanceProfile().lowMemory) return false;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData;
  return !reduced && !saveData;
}

function youtubePreviewUrl(key) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    loop: '1',
    playlist: key,
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
  });
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}

export default function MovieCard({
  movie: media,
  ratings,
  rank,
  posterMode = false,
  onOpen,
  onPlay,
  onToggleSaved,
  onRemoveProgress,
  saved = false,
  progress,
  previewsEnabled = true,
}) {
  const rootRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const schedulePreview = () => {
    setActive(true);
    window.clearTimeout(timerRef.current);
    if (!previewsEnabled || !canAutoplayPreview() || preview !== undefined) return;
    timerRef.current = window.setTimeout(async () => {
      const nextPreview = await loadPreview(media);
      if (mountedRef.current) setPreview(nextPreview);
    }, 1050);
  };

  const cancelPreview = () => {
    window.clearTimeout(timerRef.current);
    setActive(false);
  };

  const imagePath = posterMode
    ? (media.posterPath || media.backdropPath)
    : (media.backdropPath || media.posterPath);
  const imageKind = posterMode || (!media.backdropPath && media.posterPath) ? 'poster' : 'card';
  const image = imageUrl(imagePath, preferredImageSize(imageKind));
  const percent = Math.max(0, Math.min(100, Number(progress?.percent || 0)));
  const cardWidth = posterMode
    ? { xs: 176, sm: 205, md: 230 }
    : { xs: 224, sm: 276, md: 318, xl: 344 };

  return (
    <Box
      ref={rootRef}
      onMouseEnter={schedulePreview}
      onMouseLeave={cancelPreview}
      onFocusCapture={schedulePreview}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) cancelPreview();
      }}
      sx={{
        position: 'relative',
        width: cardWidth,
        flex: '0 0 auto',
        pl: rank && posterMode ? { xs: 4.5, md: 5.5 } : 0,
        transform: active ? (posterMode ? 'scale(1.025)' : 'scale(1.055)') : 'scale(1)',
        transformOrigin: 'center center',
        transition: 'transform 150ms cubic-bezier(.2,.8,.2,1)',
        zIndex: active ? 30 : 1,
      }}
    >
      {rank && posterMode ? (
        <Typography
          aria-hidden
          sx={{
            position: 'absolute',
            left: { xs: -4, md: -8 },
            bottom: { xs: 24, md: 29 },
            zIndex: 0,
            fontSize: { xs: '7.4rem', md: '9.3rem' },
            fontWeight: 950,
            lineHeight: .72,
            letterSpacing: '-.09em',
            color: '#070709',
            WebkitTextStroke: '2px rgba(255,255,255,.78)',
            textShadow: '0 7px 22px rgba(0,0,0,.78)',
          }}
        >
          {rank}
        </Typography>
      ) : null}

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          borderRadius: .65,
          bgcolor: active && !posterMode ? '#18181b' : 'transparent',
          boxShadow: active ? '0 14px 32px rgba(0,0,0,.68)' : 'none',
          transition: 'background 140ms ease, box-shadow 140ms ease',
        }}
      >
        <ButtonBase
          data-tv-focus="true"
          onClick={() => onOpen(media)}
          aria-label={`More information about ${media.title}`}
          sx={{
            display: 'block',
            width: '100%',
            borderRadius: posterMode ? .7 : .65,
            overflow: 'hidden',
            textAlign: 'left',
            boxShadow: active
              ? '0 14px 32px rgba(0,0,0,.68), 0 0 0 1px rgba(255,255,255,.2)'
              : '0 6px 16px rgba(0,0,0,.26)',
            '&:focus-visible': { outline: '3px solid #fff', outlineOffset: '4px' },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: posterMode ? '2 / 3' : '16 / 9',
              bgcolor: '#202024',
              overflow: 'hidden',
            }}
          >
            {image ? (
              <SmartImage
                src={image}
                alt=""
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'opacity 150ms ease, transform 900ms ease',
                  opacity: active && preview?.key ? .2 : 1,
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                }}
              />
            ) : (
              <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#333,#111)' }} />
            )}

            {active && previewsEnabled && preview?.key ? (
              <Box
                component="iframe"
                src={youtubePreviewUrl(preview.key)}
                title={`${media.title} ${preview.type || 'preview'}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                tabIndex={-1}
                sx={posterMode
                  ? { position: 'absolute', top: 0, bottom: 0, left: '50%', width: '270%', height: '100%', transform: 'translateX(-50%)', border: 0, pointerEvents: 'none' }
                  : { position: 'absolute', inset: '-12%', width: '124%', height: '124%', border: 0, pointerEvents: 'none' }}
              />
            ) : null}

            <Box sx={{ position: 'absolute', inset: 0, background: active ? 'linear-gradient(180deg, rgba(0,0,0,.04) 26%, rgba(0,0,0,.88) 100%)' : 'linear-gradient(180deg, transparent 54%, rgba(0,0,0,.56) 100%)', transition: 'background 150ms ease' }} />

            <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: .6 }}>
              {media.mediaType === 'tv' ? (
                <Chip label="SERIES" size="small" sx={{ height: 21, borderRadius: .35, bgcolor: 'rgba(0,0,0,.76)', fontWeight: 950, fontSize: '.61rem', letterSpacing: '.07em' }} />
              ) : null}
              {media.year && Number(media.year) >= new Date().getFullYear() - 1 ? (
                <Chip label="NEW" size="small" color="primary" sx={{ height: 21, borderRadius: .35, fontWeight: 950, fontSize: '.61rem', letterSpacing: '.06em' }} />
              ) : null}
            </Box>

            <Typography noWrap sx={{ position: 'absolute', left: 10, right: 10, bottom: active && !posterMode ? 49 : (percent > 0 ? 12 : 8), fontWeight: 900, fontSize: posterMode ? '.83rem' : '.91rem', textShadow: '0 2px 8px #000', opacity: active || posterMode ? 1 : .94 }}>
              {media.title}
            </Typography>

            {percent > 0 ? (
              <Box sx={{ position: 'absolute', left: 10, right: 10, bottom: 6, height: 3, bgcolor: 'rgba(255,255,255,.3)', borderRadius: 99, overflow: 'hidden' }}>
                <Box sx={{ width: `${percent}%`, height: '100%', bgcolor: 'primary.main' }} />
              </Box>
            ) : null}
          </Box>
        </ButtonBase>

        {!posterMode && active ? (
          <Box
            sx={{
              position: 'absolute',
              left: 9,
              right: 9,
              bottom: 9,
              display: 'flex',
              alignItems: 'center',
              gap: .7,
              zIndex: 4,
            }}
          >
            <IconButton
              data-tv-focus="true"
              onClick={(event) => { event.stopPropagation(); onPlay(media); }}
              aria-label={`Play ${media.title}`}
              size="small"
              sx={{ width: 32, height: 32, bgcolor: '#fff', color: '#000', '&:hover': { bgcolor: '#ddd' } }}
            >
              <Icon name="play" size={18} />
            </IconButton>
            <IconButton
              data-tv-focus="true"
              onClick={(event) => { event.stopPropagation(); onToggleSaved(media); }}
              aria-label={saved ? `Remove ${media.title} from My List` : `Add ${media.title} to My List`}
              size="small"
              sx={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,.72)', bgcolor: 'rgba(24,24,26,.76)', '&:hover': { bgcolor: 'rgba(255,255,255,.18)', borderColor: '#fff' } }}
            >
              <Icon name={saved ? 'check' : 'plus'} size={18} />
            </IconButton>
            {progress?.media && onRemoveProgress ? (
              <IconButton
                data-tv-focus="true"
                onClick={(event) => { event.stopPropagation(); onRemoveProgress(progress); }}
                aria-label={`Remove ${media.title} from Continue Watching`}
                size="small"
                sx={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,.72)', bgcolor: 'rgba(24,24,26,.76)', '&:hover': { bgcolor: 'rgba(255,255,255,.18)', borderColor: '#fff' } }}
              >
                <Icon name="close" size={18} />
              </IconButton>
            ) : null}
            <Box sx={{ flex: 1 }} />
            <IconButton
              data-tv-focus="true"
              onClick={(event) => { event.stopPropagation(); onOpen(media); }}
              aria-label={`More information about ${media.title}`}
              size="small"
              sx={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,.65)', bgcolor: 'rgba(24,24,26,.76)', '&:hover': { bgcolor: 'rgba(255,255,255,.18)', borderColor: '#fff' } }}
            >
              <Icon name="chevronDown" size={18} />
            </IconButton>
          </Box>
        ) : null}

        <Box sx={{ pt: .9, px: active && !posterMode ? 1.1 : .15, pb: active && !posterMode ? 1.05 : 0, minHeight: 43, transition: 'padding 140ms ease' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .8, minWidth: 0 }}>
            <RatingBadges ratings={ratings || media.ratings} tmdbRating={media.tmdbRating} compact />
            <Typography sx={{ ml: 'auto', fontSize: '.68rem', color: 'text.secondary', fontWeight: 750, flex: '0 0 auto' }}>
              {progress?.season ? `S${progress.season}:E${progress.episode}` : (media.year || mediaLabel(media))}
            </Typography>
          </Box>
          {!posterMode && active ? (
            <Typography noWrap sx={{ mt: .7, color: 'rgba(255,255,255,.76)', fontSize: '.68rem' }}>
              {[(media.genres || []).slice(0, 3).join(' • '), media.mediaType === 'tv' ? 'Series' : 'Movie'].filter(Boolean).join('  ·  ')}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
