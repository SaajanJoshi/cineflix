import { useRef } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { performanceProfile } from '../lib/performance.js';
import Icon from './Icon.jsx';
import MovieCard from './MovieCard.jsx';

export default function MovieRail({
  title,
  subtitle,
  movies,
  media: mediaProp,
  ratingsById = {},
  ranked = false,
  loading = false,
  onOpen,
  onPlay,
  onToggleSaved,
  onRemoveProgress,
  isSaved,
  progressByMedia = {},
  previewsEnabled = true,
  compact = false,
}) {
  const scrollerRef = useRef(null);
  const items = mediaProp || movies || [];

  const scroll = (direction) => {
    const element = scrollerRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(420, element.clientWidth * .82), behavior: performanceProfile().lowMemory ? 'auto' : 'smooth' });
  };

  if (!loading && !items.length) return null;

  return (
    <Box component="section" sx={{ position: 'relative', mb: compact ? 2.5 : { xs: 3.4, md: 4.7 }, overflow: 'visible', '&:hover .rail-arrow': { opacity: 1 } }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.15, px: { xs: 2, md: 5 }, mb: .2 }}>
        <Typography variant="h6" sx={{ fontSize: { xs: '1.02rem', md: '1.34rem' }, fontWeight: 880, letterSpacing: '-.02em' }}>
          {title}
        </Typography>
        {subtitle ? <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '.76rem' }}>{subtitle}</Typography> : null}
      </Box>

      <Box sx={{ position: 'relative' }}>
        <IconButton
          className="rail-arrow"
          data-tv-focus="true"
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${title} left`}
          sx={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-57%)', zIndex: 50,
            width: { xs: 34, md: 44 }, height: { xs: 70, md: 100 }, borderRadius: 0,
            bgcolor: 'rgba(8,8,10,.7)', opacity: { xs: .75, md: 0 }, transition: 'opacity 160ms ease',
            '&:hover': { bgcolor: 'rgba(8,8,10,.9)' },
          }}
        >
          <Icon name="left" size={28} />
        </IconButton>

        <Box
          ref={scrollerRef}
          sx={{
            display: 'flex',
            gap: { xs: 1.15, md: 1.35 },
            overflowX: 'auto',
            overflowY: 'hidden',
            px: { xs: 2, md: 5 },
            pt: 1.3,
            pb: 1.8,
            scrollSnapType: 'x proximity',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '& > *': { scrollSnapAlign: 'start' },
          }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} variant="rounded" sx={{ flex: '0 0 310px', aspectRatio: '16/9', bgcolor: 'rgba(255,255,255,.075)' }} />)
            : items.map((item, index) => {
              const media = item.media || item;
              const progress = item.media ? item : progressByMedia[media.key || `${media.mediaType}:${media.id}`];
              return (
                <MovieCard
                  key={item.playbackKey || media.key || `${media.mediaType}:${media.id}`}
                  movie={media}
                  ratings={ratingsById[media.key || `${media.mediaType}:${media.id}`] || media.ratings}
                  rank={ranked ? index + 1 : null}
                  posterMode={ranked}
                  onOpen={onOpen}
                  onPlay={progress?.media ? () => onPlay(media, progress) : onPlay}
                  onToggleSaved={onToggleSaved}
                  onRemoveProgress={onRemoveProgress}
                  saved={isSaved(media)}
                  progress={progress}
                  previewsEnabled={previewsEnabled}
                />
              );
            })}
        </Box>

        <IconButton
          className="rail-arrow"
          data-tv-focus="true"
          onClick={() => scroll(1)}
          aria-label={`Scroll ${title} right`}
          sx={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-57%)', zIndex: 50,
            width: { xs: 34, md: 44 }, height: { xs: 70, md: 100 }, borderRadius: 0,
            bgcolor: 'rgba(8,8,10,.7)', opacity: { xs: .75, md: 0 }, transition: 'opacity 160ms ease',
            '&:hover': { bgcolor: 'rgba(8,8,10,.9)' },
          }}
        >
          <Icon name="right" size={28} />
        </IconButton>
      </Box>
    </Box>
  );
}
