import { grey700 } from 'libs/colors'
import { blue50, blue200, blue500, green100, green300 } from 'libs/appTheme'
import merge from 'lodash.merge'

export const dropTargetColor = green100
export const droppedColor = green300
export const highlightBorderColor = blue500
export const focusedColor = blue200
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
  focusedColor: blue200,
  highlightBorderColor: blue500,
  highlightColor: blue50,
}

export const lightTheme = {
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
  },
  components,
  app,
  typography: { useNextVariants: true },
}

export const darkTheme = merge({}, lightTheme, {
  palette: {
    mode: 'dark',
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
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: {
          '&:before': {
            borderBottomColor: 'rgba(238, 241, 245, 0.24)',
          },
          '&:hover:not(.Mui-disabled):before': {
            borderBottomColor: 'rgba(238, 241, 245, 0.44)',
          },
          '&:after': {
            borderBottomColor: '#b5c7e6',
          },
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          ...MuiSnackbarContent.styleOverrides.root,
          backgroundColor,
        },
      },
    },
  },
  app: {
    focusedColor: '#b5c7e6',
    highlightBorderColor: '#b5c7e6',
    highlightColor: '#39404a',
  },
})
