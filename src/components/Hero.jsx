import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { imageUrl, mediaLabel } from '../lib/media.js';
import { preferredImageSize } from '../lib/performance.js';
import Icon from './Icon.jsx';
import RatingBadges from './RatingBadges.jsx';
import SmartImage from './SmartImage.jsx';

export default function Hero({ media, ratings, activeIndex = 0, count = 1, onSelect, onPlay, onInfo, onToggleSaved, saved }) {
  if (!media) return <Box sx={{ minHeight: '72vh', bgcolor: '#0c0c0f' }} />;
  const background = imageUrl(media.backdropPath || media.posterPath, preferredImageSize('hero'));
  const logo = imageUrl(media.logoPath, preferredImageSize('logo'));

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: { xs: '78vh', md: '84vh' },
        display: 'flex',
        alignItems: 'flex-end',
        bgcolor: '#0c0c0f',
        isolation: 'isolate',
        overflow: 'hidden',
      }}
    >
      {background ? (
        <SmartImage
          key={background}
          src={background}
          alt=""
          priority
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: -3,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 18%',
          }}
        />
      ) : null}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: -2, background: 'linear-gradient(90deg, rgba(0,0,0,.96) 0%, rgba(0,0,0,.78) 30%, rgba(0,0,0,.3) 58%, rgba(0,0,0,.06) 76%), linear-gradient(0deg, #0b0b0e 0%, rgba(11,11,14,.78) 8%, rgba(11,11,14,.08) 48%, rgba(0,0,0,.12) 100%)' }} />
      <Box sx={{ position: 'absolute', inset: 0, zIndex: -1, background: 'radial-gradient(circle at 76% 28%, transparent 0%, rgba(0,0,0,.1) 45%, rgba(0,0,0,.55) 100%)' }} />

      <Box sx={{ position: 'relative', width: '100%', px: { xs: 2, md: 5 }, pb: { xs: 9, md: 11 }, pt: { xs: 17, md: 18 } }}>
        <Box sx={{ maxWidth: { xs: 650, md: 760 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.6 }}>
            <Typography sx={{ color: 'primary.main', fontWeight: 950, letterSpacing: '.18em', fontSize: '.7rem' }}>
              CINEFLIX FEATURE
            </Typography>
            <Box sx={{ width: 28, height: 1, bgcolor: 'rgba(255,255,255,.5)' }} />
            <Typography sx={{ color: '#fff', opacity: .84, fontWeight: 800, letterSpacing: '.08em', fontSize: '.68rem', textTransform: 'uppercase' }}>
              {mediaLabel(media)}
            </Typography>
          </Box>

          {logo ? (
            <SmartImage
              src={logo}
              alt={media.title}
              priority
              unloadWhenFar={false}
              sx={{
                display: 'block',
                width: 'auto',
                maxWidth: { xs: '76vw', sm: 520, md: 620 },
                maxHeight: { xs: 150, md: 230 },
                objectFit: 'contain',
                objectPosition: 'left center',
              }}
            />
          ) : (
            <Typography
              component="h1"
              sx={{
                maxWidth: 780,
                fontSize: { xs: '3rem', sm: '4.6rem', md: '6.1rem' },
                lineHeight: .91,
                letterSpacing: '-.065em',
                fontWeight: 950,
                textWrap: 'balance',
                textShadow: '0 4px 32px rgba(0,0,0,.7)',
              }}
            >
              {media.title}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.15, flexWrap: 'wrap', mt: 2.2 }}>
            <RatingBadges ratings={ratings} tmdbRating={media.tmdbRating} />
            {media.year ? <Typography sx={{ fontWeight: 800, fontSize: '.88rem' }}>{media.year}</Typography> : null}
            {media.mediaType === 'tv' ? <Chip label="SERIES" size="small" sx={{ height: 22, borderRadius: .5, bgcolor: 'rgba(255,255,255,.15)', fontWeight: 900, letterSpacing: '.06em', fontSize: '.65rem' }} /> : null}
            {(media.genres || []).slice(0, 3).map((genre) => (
              <Typography key={genre} sx={{ color: 'rgba(255,255,255,.78)', fontSize: '.84rem', '&:not(:last-of-type)::after': { content: '" •"', color: 'rgba(255,255,255,.35)' } }}>
                {genre}
              </Typography>
            ))}
          </Box>

          <Typography sx={{ mt: 2.1, maxWidth: 650, fontSize: { xs: '.98rem', md: '1.12rem' }, lineHeight: 1.55, color: 'rgba(255,255,255,.9)', textShadow: '0 2px 14px rgba(0,0,0,.85)', display: '-webkit-box', WebkitLineClamp: { xs: 4, md: 3 }, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {media.overview || 'Discover one of the most popular titles streaming right now.'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.15, mt: 3.2, flexWrap: 'wrap' }}>
            <Button data-tv-focus="true" variant="contained" color="inherit" onClick={() => onPlay(media)} startIcon={<Icon name="play" size={22} />} sx={{ bgcolor: '#fff', color: '#000', px: { xs: 2.4, md: 3.1 }, fontSize: { xs: '.95rem', md: '1.05rem' }, '&:hover': { bgcolor: '#dcdcdc' } }}>
              {media.mediaType === 'tv' ? 'Watch S1 E1' : 'Play'}
            </Button>
            <Button data-tv-focus="true" variant="contained" onClick={() => onInfo(media)} startIcon={<Icon name="info" size={22} />} sx={{ bgcolor: 'rgba(109,109,110,.72)', color: '#fff', px: { xs: 2.2, md: 2.8 }, fontSize: { xs: '.95rem', md: '1.05rem' }, '&:hover': { bgcolor: 'rgba(109,109,110,.52)' } }}>
              More Info
            </Button>
            <IconButton data-tv-focus="true" onClick={() => onToggleSaved(media)} aria-label={saved ? 'Remove from My List' : 'Add to My List'} sx={{ width: 46, height: 46, border: '2px solid rgba(255,255,255,.72)', bgcolor: 'rgba(22,22,24,.54)', '&:hover': { bgcolor: 'rgba(255,255,255,.17)', borderColor: '#fff' } }}>
              <Icon name={saved ? 'check' : 'plus'} size={25} />
            </IconButton>
          </Box>
        </Box>

        {count > 1 ? (
          <Box sx={{ position: 'absolute', right: { xs: 18, md: 52 }, bottom: { xs: 64, md: 86 }, display: 'flex', alignItems: 'center', gap: .65 }}>
            {Array.from({ length: count }).map((_, index) => (
              <Box
                key={index}
                component="button"
                data-tv-focus="true"
                aria-label={`Show featured title ${index + 1}`}
                onClick={() => onSelect(index)}
                sx={{
                  width: index === activeIndex ? 28 : 8,
                  height: 5,
                  p: 0,
                  border: 0,
                  borderRadius: 999,
                  bgcolor: index === activeIndex ? '#fff' : 'rgba(255,255,255,.35)',
                  cursor: 'pointer',
                  transition: 'width 140ms ease, background 140ms ease',
                  '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 3 },
                }}
              />
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
