import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function BrandMark() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .8 }}>
      <Box
        aria-hidden
        sx={{
          width: 7,
          height: { xs: 27, md: 33 },
          bgcolor: 'primary.main',
          transform: 'skew(-10deg)',
          boxShadow: '7px 0 0 rgba(229,9,20,.35)',
        }}
      />
      <Typography
        component="div"
        sx={{
          color: '#fff',
          fontWeight: 950,
          letterSpacing: '-0.065em',
          fontSize: { xs: '1.28rem', md: '1.62rem' },
          lineHeight: 1,
          textShadow: '0 2px 18px rgba(0,0,0,.5)',
        }}
      >
        CINE<span style={{ color: '#e50914' }}>FLIX</span>
      </Typography>
    </Box>
  );
}
