import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e50914', contrastText: '#fff' },
    background: { default: '#0b0b0e', paper: '#18181b' },
    text: { primary: '#ffffff', secondary: '#a7a7ad' },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: { textTransform: 'none', fontWeight: 850, letterSpacing: '-.01em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#0b0b0e' },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          minHeight: 42,
          '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 3 },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 3 } },
      },
    },
    MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          backgroundColor: 'rgba(255,255,255,.035)',
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 750 } } },
  },
});
