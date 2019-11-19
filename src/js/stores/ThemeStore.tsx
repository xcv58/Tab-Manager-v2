import { action, computed, observable } from 'mobx'
import { createMuiTheme } from '@material-ui/core/styles'
import blue from '@material-ui/core/colors/blue'
import green from '@material-ui/core/colors/green'
import pink from '@material-ui/core/colors/pink'
import merge from 'lodash.merge'
import Store from 'stores'
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
    backgroundColor: 'rgba(0, 0, 0, 0.618)'
  }
}

const overrides = {
  MuiIconButton: {
    root: {
      padding: 9
    }
  },
  MuiSnackbarContent,
  MuiTooltip: {
    tooltip: {
      display: 'inline-flex',
      backgroundColor: grey700,
      borderRadius: '.5rem',
      fontSize: '1rem',
      lineHeight: '1.5rem',
      maxWidth: '32rem'
    }
  }
}

const app = {
  focusedColor: blue[200],
  highlightBorderColor: pink.A400,
  highlightColor: blue[50]
}

const theme = { overrides, app, typography: { useNextVariants: true } }

const darkTheme = merge(
  {
    palette: {
      type: 'dark'
    }
  },
  {
    ...theme,
    overrides: {
      ...overrides,
      MuiSnackbarContent: {
        root: {
          ...MuiSnackbarContent.root,
          backgroundColor
        }
      }
    }
  },
  {
    app: {
      focusedColor: '#292B2E',
      highlightBorderColor: pink.A400,
      highlightColor: '#323639'
    }
  }
)

export default class ThemeStore {
  store: Store

  @observable
  isSystemThemeDark: boolean = false

  constructor (store) {
    this.store = store
    if (window && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', this.updateSystemTheme)
      this.updateSystemTheme(mediaQuery)
    }
  }

  @action
  updateSystemTheme = event => {
    this.isSystemThemeDark = event.matches
  }

  @computed
  get theme () {
    const { useSystemTheme } = this.store.userStore
    if (!useSystemTheme) {
      return this.store.userStore.darkTheme ? darkTheme : theme
    }
    return this.isSystemThemeDark ? darkTheme : theme
  }

  @computed
  get muiTheme () {
    return createMuiTheme(this.theme)
  }
}
