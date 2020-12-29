import blue from '@material-ui/core/colors/blue'
import green from '@material-ui/core/colors/green'
import pink from '@material-ui/core/colors/pink'
import merge from 'lodash.merge'
import { grey700 } from 'libs/colors'

export const dropTargetColor = green[100]
export const droppedColor = green[300]
export const highlightBorderColor = pink.A400
export const focusedColor = blue[200]
export const backgroundColor = 'rgba(255, 255, 255, 0.64)'

const MuiSnackbarContent = {
  root: {
    fontSize: '1.5rem',
    padding: '0 2rem',
    justifyContent: 'center',
    textTransform: 'capitalize',
    backgroundColor: 'rgba(0, 0, 0, 0.618)',
  },
}

const overrides = {
  MuiIconButton: {
    root: {
      padding: 9,
    },
  },
  MuiButton: {
    root: {
      textTransform: 'none',
    },
  },
  MuiSnackbarContent,
  MuiAutocomplete: {
    root: {
      display: 'flex',
    },
    listbox: {
      maxHeight: '64vh',
    },
    option: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    popper: {
      marginLeft: -6,
    },
  },
  MuiTooltip: {
    tooltip: {
      display: 'inline-flex',
      backgroundColor: grey700,
      borderRadius: '.5rem',
      fontSize: '1rem',
      lineHeight: '1.5rem',
      maxWidth: '32rem',
    },
  },
}

const app = {
  focusedColor: blue[200],
  highlightBorderColor: pink.A400,
  highlightColor: blue[50],
}

export const lightTheme = {
  overrides,
  app,
  typography: { useNextVariants: true },
}

export const darkTheme = merge(
  {
    palette: {
      type: 'dark',
    },
  },
  {
    ...lightTheme,
    overrides: {
      ...overrides,
      MuiSnackbarContent: {
        root: {
          ...MuiSnackbarContent.root,
          backgroundColor,
        },
      },
    },
  },
  {
    app: {
      focusedColor: '#292B2E',
      highlightBorderColor: pink.A400,
      highlightColor: '#323639',
    },
  }
)
