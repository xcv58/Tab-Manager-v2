import { createContext, useContext } from 'react'

/**
 * Local app theme runtime replacing MUI ThemeProvider + createTheme.
 *
 * All palette, transition, and app-token values are copied verbatim from the
 * existing `themes.tsx` light/dark definitions that were previously fed to
 * `createTheme()`.
 */

/* -------------------------------------------------------------------------- */
/*  Type contract                                                             */
/* -------------------------------------------------------------------------- */

export type AppTheme = {
  mode: 'light' | 'dark'
  palette: {
    background: { default: string; paper: string }
    text: { primary: string; secondary: string }
    divider: string
    primary: { main: string; light: string }
    warning: { main: string }
    action: { hover: string; selected: string; disabled: string }
    grey: Record<number, string>
  }
  transitions: {
    enteringScreen: number
    leavingScreen: number
    shorter: number
  }
  zIndex: { tooltip: number; popover: number; modal: number }
  app: {
    focusedColor: string
    highlightBorderColor: string
    highlightColor: string
  }
}

/* -------------------------------------------------------------------------- */
/*  Hardcoded MUI color values (previously from @mui/material/colors)         */
/* -------------------------------------------------------------------------- */

// blue
export const blue50 = '#e3f2fd'
export const blue200 = '#90caf9'
export const blue500 = '#2196f3'

// green
export const green100 = '#c8e6c9'
export const green300 = '#81c784'

// pink
export const pinkA400 = '#f50057'

// grey
export const grey700 = '#616161'

/* -------------------------------------------------------------------------- */
/*  Theme definitions                                                         */
/* -------------------------------------------------------------------------- */

const sharedTransitions = {
  enteringScreen: 225, // MUI duration.enteringScreen
  leavingScreen: 195, // MUI duration.leavingScreen
  shorter: 200, // MUI duration.shorter
}

const sharedZIndex = {
  tooltip: 1500,
  popover: 1300,
  modal: 1300,
}

export const lightAppTheme: AppTheme = {
  mode: 'light',
  palette: {
    background: {
      default: '#e7edf5',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    divider: 'rgba(15, 23, 42, 0.16)',
    primary: {
      main: '#1a73e8',
      light: '#5b9cf0',
    },
    warning: {
      main: '#d97706',
    },
    action: {
      hover: 'rgba(26, 115, 232, 0.06)',
      selected: 'rgba(26, 115, 232, 0.1)',
      disabled: 'rgba(100, 116, 139, 0.42)',
    },
    grey: { 700: grey700 },
  },
  transitions: sharedTransitions,
  zIndex: sharedZIndex,
  app: {
    focusedColor: blue200, // #90caf9
    highlightBorderColor: blue500, // #2196f3
    highlightColor: blue50, // #e3f2fd
  },
}

export const darkAppTheme: AppTheme = {
  mode: 'dark',
  palette: {
    background: {
      default: '#1f242b',
      paper: '#2e343c',
    },
    text: {
      primary: '#eef1f5',
      secondary: '#aeb5c0',
    },
    divider: 'rgba(238, 241, 245, 0.18)',
    primary: {
      main: '#b5c7e6',
      light: '#d8e4f7',
    },
    warning: {
      main: '#f59e0b',
    },
    action: {
      hover: 'rgba(181, 199, 230, 0.08)',
      selected: 'rgba(181, 199, 230, 0.14)',
      disabled: 'rgba(174, 181, 192, 0.42)',
    },
    grey: { 700: grey700 },
  },
  transitions: sharedTransitions,
  zIndex: sharedZIndex,
  app: {
    focusedColor: '#b5c7e6',
    highlightBorderColor: '#b5c7e6',
    highlightColor: '#39404a',
  },
}

/* -------------------------------------------------------------------------- */
/*  React context                                                             */
/* -------------------------------------------------------------------------- */

export const AppThemeContext = createContext<AppTheme>(lightAppTheme)

export const useAppTheme = (): AppTheme => useContext(AppThemeContext)
