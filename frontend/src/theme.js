import { createTheme } from '@mui/material/styles';

// CypherID dark glass theme — deep indigo/cyan on near-black.
// Readable on screen, hostile to cameras: low-luminance surfaces +
// high-saturation accents alias badly on photo/OCR resample.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c9cff' },
    secondary: { main: '#22d3ee' },
    error: { main: '#ff5470' },
    warning: { main: '#ffb020' },
    success: { main: '#34d399' },
    background: { default: '#0a0e1a', paper: '#111831' },
    text: { primary: '#e8ecf8', secondary: '#9aa7c7' }
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h5: { fontWeight: 700, letterSpacing: 0.3 },
    h6: { fontWeight: 600 }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, rgba(124,156,255,0.07), rgba(34,211,238,0.03))',
          border: '1px solid rgba(124,156,255,0.18)'
        }
      }
    },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } }
  }
});

export default theme;
