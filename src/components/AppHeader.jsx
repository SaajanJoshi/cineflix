import { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import BrandMark from './BrandMark.jsx';
import Icon from './Icon.jsx';

const NAV = [
  ['home', 'Home'],
  ['series', 'TV Shows'],
  ['movies', 'Movies'],
  ['new', 'New & Popular'],
  ['my-list', 'My List'],
];

export default function AppHeader({ view, onView, searchText, onSearchText, previewsEnabled, onPreviewsEnabled, myListCount = 0, performanceMode = 'full' }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 26);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: solid || ['search', 'my-list'].includes(view)
          ? 'rgba(10,10,12,.96)'
          : 'linear-gradient(180deg, rgba(0,0,0,.9), rgba(0,0,0,.45) 62%, transparent)',
        backdropFilter: solid && performanceMode !== 'tv' ? 'blur(10px)' : 'none',
        transition: performanceMode === 'tv' ? 'none' : 'background 180ms ease, backdrop-filter 180ms ease',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, px: { xs: 2, md: 5 }, gap: { xs: 1.2, md: 2.6 } }}>
        <Button data-tv-focus="true" onClick={() => onView('home')} aria-label="CineFlix home" sx={{ minWidth: 0, p: 0, mr: { xs: .5, md: 1.2 } }}>
          <BrandMark />
        </Button>

        <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: .15 }}>
          {NAV.map(([key, label]) => (
            <Button
              key={key}
              data-tv-focus="true"
              onClick={() => onView(key)}
              color="inherit"
              sx={{
                px: 1.15,
                minWidth: 0,
                opacity: view === key ? 1 : .72,
                fontWeight: view === key ? 850 : 560,
                fontSize: '.88rem',
                '&:hover': { opacity: 1 },
              }}
            >
              {label}{key === 'my-list' && myListCount ? ` (${myListCount})` : ''}
            </Button>
          ))}
        </Box>

        <Box sx={{ flex: 1 }} />

        <TextField
          value={searchText}
          onChange={(event) => {
            onSearchText(event.target.value);
            if (view !== 'search') onView('search');
          }}
          onFocus={() => onView('search')}
          placeholder="Titles, genres, countries..."
          size="small"
          inputProps={{ 'aria-label': 'Search movies and TV shows', 'data-tv-focus': 'true' }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Icon name="search" size={20} /></InputAdornment>,
          }}
          sx={{
            width: { xs: 172, sm: 250, md: 310 },
            '& .MuiOutlinedInput-root': {
              height: 40,
              bgcolor: 'rgba(0,0,0,.65)',
              borderRadius: .6,
              transition: 'width 180ms ease, background 180ms ease',
              '& fieldset': { borderColor: 'rgba(255,255,255,.5)' },
              '&:hover fieldset': { borderColor: '#fff' },
              '&.Mui-focused': { bgcolor: '#090909' },
              '&.Mui-focused fieldset': { borderColor: '#fff' },
            },
          }}
        />

        <Tooltip title={performanceMode === 'tv' ? 'Autoplay previews are disabled in TV memory mode. Use ?performance=full to force them on.' : (previewsEnabled ? 'Autoplay previews is on' : 'Autoplay previews is off')}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', ml: .5 }}>
            <Typography sx={{ fontSize: '.72rem', color: 'text.secondary', mr: .3 }}>Previews</Typography>
            <Switch
              size="small"
              checked={performanceMode === 'tv' ? false : previewsEnabled}
              disabled={performanceMode === 'tv'}
              onChange={(event) => onPreviewsEnabled(event.target.checked)}
              inputProps={{ 'aria-label': 'Autoplay previews', 'data-tv-focus': 'true' }}
            />
          </Box>
        </Tooltip>

        {performanceMode === 'tv' ? (
          <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '.68rem', fontWeight: 900, letterSpacing: '.08em', color: 'rgba(255,255,255,.68)' }}>
            TV MODE
          </Typography>
        ) : null}

        <Box
          data-tv-focus="true"
          tabIndex={0}
          aria-label="Local profile"
          sx={{
            width: 34,
            height: 34,
            borderRadius: .7,
            display: { xs: 'none', sm: 'grid' },
            placeItems: 'center',
            bgcolor: '#246bce',
            fontWeight: 950,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)',
            '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 2 },
          }}
        >
          C
        </Box>
      </Toolbar>

      <Box sx={{ display: { xs: 'flex', lg: 'none' }, px: 1.5, pb: 1, gap: .3, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {NAV.map(([key, label]) => (
          <Button key={key} data-tv-focus="true" onClick={() => onView(key)} color="inherit" size="small" sx={{ flex: '0 0 auto', opacity: view === key ? 1 : .68, fontWeight: view === key ? 850 : 550 }}>
            {label}
          </Button>
        ))}
      </Box>
    </AppBar>
  );
}
