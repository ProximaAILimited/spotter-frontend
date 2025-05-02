import { createTheme, alpha } from '@mui/material/styles';

// Spotter.ai brand colors
export const spotterColors = {
  navy: '#0A1A28',      // Deep blue/navy - main background
  teal: '#1D9B8C',      // Teal/green - primary accent, buttons
  tealDark: '#17404C',  // Dark teal - gradient start
  tealLight: '#205F6B', // Light teal - gradient end
  coral: '#F05454',     // Coral/reddish - logo dot, accept button
  white: '#FFFFFF',     // White - text and UI elements
  lightGray: '#F5F5F5', // Light gray - UI elements and backgrounds
  lightBlue: '#E5F5F8', // Light blue - highlights
  black: '#000000',     // Black - text
};

// Create a custom theme with Spotter.ai colors
const theme = createTheme({
  palette: {
    primary: {
      main: spotterColors.teal,
      dark: spotterColors.tealDark,
      light: spotterColors.tealLight,
      contrastText: spotterColors.white,
    },
    secondary: {
      main: spotterColors.coral,
      contrastText: spotterColors.white,
    },
    error: {
      main: spotterColors.coral,
    },
    background: {
      default: spotterColors.lightGray,
      paper: spotterColors.white,
      dark: spotterColors.navy,
    },
    text: {
      primary: spotterColors.navy,
      secondary: alpha(spotterColors.navy, 0.7),
      disabled: alpha(spotterColors.navy, 0.5),
    },
    action: {
      active: spotterColors.teal,
      hover: alpha(spotterColors.teal, 0.1),
      selected: alpha(spotterColors.teal, 0.2),
    },
    // Custom colors accessed via theme.palette.spotter.*
    spotter: {
      navy: spotterColors.navy,
      teal: spotterColors.teal,
      tealDark: spotterColors.tealDark,
      tealLight: spotterColors.tealLight,
      coral: spotterColors.coral,
      lightGray: spotterColors.lightGray,
      lightBlue: spotterColors.lightBlue,
      navyAlpha10: alpha(spotterColors.navy, 0.1),
      navyAlpha20: alpha(spotterColors.navy, 0.2),
      navyAlpha50: alpha(spotterColors.navy, 0.5),
      tealAlpha10: alpha(spotterColors.teal, 0.1),
      tealAlpha20: alpha(spotterColors.teal, 0.2),
      tealAlpha50: alpha(spotterColors.teal, 0.5),
      coralAlpha10: alpha(spotterColors.coral, 0.1),
      coralAlpha20: alpha(spotterColors.coral, 0.2),
      coralAlpha50: alpha(spotterColors.coral, 0.5),
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      color: spotterColors.navy,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: spotterColors.navy,
    },
    h3: {
      color: spotterColors.navy,
    },
    h4: {
      color: spotterColors.navy,
    },
    h5: {
      color: spotterColors.navy,
    },
    h6: {
      color: spotterColors.navy,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
        containedPrimary: {
          backgroundColor: spotterColors.teal,
          '&:hover': {
            backgroundColor: spotterColors.tealDark,
          },
        },
        containedSecondary: {
          backgroundColor: spotterColors.coral,
          '&:hover': {
            backgroundColor: alpha(spotterColors.coral, 0.8),
          },
        },
        outlinedPrimary: {
          borderColor: spotterColors.teal,
          color: spotterColors.teal,
          '&:hover': {
            backgroundColor: alpha(spotterColors.teal, 0.1),
          },
        },
        outlinedSecondary: {
          borderColor: spotterColors.coral,
          color: spotterColors.coral,
          '&:hover': {
            backgroundColor: alpha(spotterColors.coral, 0.1),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: spotterColors.navy,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
        colorPrimary: {
          backgroundColor: spotterColors.teal,
        },
        colorSecondary: {
          backgroundColor: spotterColors.coral,
        },
        outlinedPrimary: {
          borderColor: spotterColors.teal,
          color: spotterColors.teal,
        },
        outlinedSecondary: {
          borderColor: spotterColors.coral,
          color: spotterColors.coral,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': {
            color: spotterColors.teal,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: alpha(spotterColors.teal, 0.2),
        },
        barColorPrimary: {
          backgroundColor: spotterColors.teal,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: alpha(spotterColors.teal, 0.1),
          color: spotterColors.tealDark,
        },
        standardWarning: {
          color: spotterColors.navy,
        },
        standardError: {
          backgroundColor: alpha(spotterColors.coral, 0.1),
          color: spotterColors.coral,
        },
        standardInfo: {
          backgroundColor: alpha(spotterColors.lightBlue, 0.5),
          color: spotterColors.tealDark,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(spotterColors.teal, 0.1),
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: spotterColors.tealDark,
          '&.Mui-focused': {
            color: spotterColors.teal,
          },
        },
      },
    },
  },
});

export default theme; 