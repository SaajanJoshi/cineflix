import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import { theme } from './theme.js';
import './styles.css';

const bootStatus = document.getElementById('boot-status');

try {
  createRoot(document.getElementById('root')).render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </ThemeProvider>,
  );
  bootStatus?.remove();
} catch (error) {
  console.error('CineFlix boot error:', error);
  if (bootStatus) {
    bootStatus.textContent = `CineFlix could not start: ${error?.message || error}`;
    bootStatus.style.color = '#ffb4b4';
  }
}
