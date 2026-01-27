import { blue, green, pink } from '@mui/material/colors'
import merge from 'lodash.merge'
import { grey700 } from 'libs/colors'

export const dropTargetColor = green[100]
export const droppedColor = green[300]
export const highlightBorderColor = pink.A400
export const focusedColor = blue[200]
export const backgroundColor = 'rgba(255, 255, 255, 0.64)'

const MuiSnackbarContent = {
  styleOverrides: {
    root: {
      fontSize: '1.5rem',
      padding: '0 2rem',
      justifyContent: 'center',
      textTransform: 'capitalize',
      backgroundColor: 'rgba(0, 0, 0, 0.618)',
    },
  },
}

const components = {
  MuiIconButton: {
    styleOverrides: {
      root: {
        padding: 9,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
      },
    },
  },
  MuiSnackbarContent,
  MuiAutocomplete: {
    styleOverrides: {
      root: {
        display: 'flex',
      },
      listbox: {
        maxHeight: 'calc(100vh - 81px)',
        option: {
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
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
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        display: 'inline-flex',
        backgroundColor: grey700,
        borderRadius: '.5rem',
        fontSize: '1rem',
        lineHeight: '1.5rem',
        maxWidth: '32rem',
      },
    },
  },
}

const app = {
  focusedColor: blue[200],
  highlightBorderColor: pink.A400,
  highlightColor: blue[50],
}

export const lightTheme = {
  components,
  app,
  typography: { useNextVariants: true },
}

export const darkTheme = merge(
  {
    palette: {
      mode: 'dark',
    },
  },
  {
    ...lightTheme,
    components: {
      ...components,
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            ...MuiSnackbarContent.root,
            backgroundColor,
          },
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
  },
)
