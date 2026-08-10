import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CineFlix render error:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0b0b0e', color: '#fff', p: { xs: 2.5, md: 6 }, pt: { xs: 5, md: 9 } }}>
        <Typography sx={{ color: '#e50914', fontWeight: 950, letterSpacing: '.12em', fontSize: '.76rem' }}>CINEFLIX STARTUP ERROR</Typography>
        <Typography component="h1" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: '2rem', md: '3.2rem' }, letterSpacing: '-.05em' }}>
          The interface could not start
        </Typography>
        <Alert severity="error" sx={{ mt: 3, maxWidth: 920 }}>
          {error?.message || String(error)}
        </Alert>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 880, lineHeight: 1.7 }}>
          Open the browser developer console (F12 → Console) for the full stack trace. Also check that the API responds at /api/health and that Node.js meets the version required by this project.
        </Typography>
        <Button variant="contained" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
          Reload app
        </Button>
      </Box>
    );
  }
}
