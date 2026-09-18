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

// Dark command-center theme — same design language as the vault login and
// identity-genesis register pages. Used only by the authenticated dashboard.
export const commandTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#38a6ff' },
    secondary: { main: '#8b7cf6' },
    error: { main: '#f87171' },
    warning: { main: '#fbbf24' },
    success: { main: '#34d399' },
    background: { default: '#05070D', paper: 'rgba(10,16,30,0.72)' },
    text: { primary: '#e8eefb', secondary: '#8b9cc0' },
    divider: 'rgba(90,120,180,0.16)'
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 }
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(90,120,180,0.16)',
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
        }
      }
    },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6 } } }
  }
});

export default theme;
