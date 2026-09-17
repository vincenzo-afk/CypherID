import { createTheme } from '@mui/material/styles';

// Minimalist light theme — plain, calm, non-developer friendly.
// One accent color, lots of white space, rounded cards.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1a56db' },
    secondary: { main: '#0e9f6e' },
    error: { main: '#c81e1e' },
    warning: { main: '#c27803' },
    success: { main: '#0e9f6e' },
    background: { default: '#f7f8fc', paper: '#ffffff' },
    text: { primary: '#111928', secondary: '#4b5563' }
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }
      }
    },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8 } } }
  }
});

export default theme;
