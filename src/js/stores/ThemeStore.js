import { computed } from 'mobx'
import { createMuiTheme } from '@material-ui/core/styles'
import blue from '@material-ui/core/colors/blue'
import green from '@material-ui/core/colors/green'
import pink from '@material-ui/core/colors/pink'
import merge from 'lodash.merge'

export const dropTargetColor = green[100]
export const droppedColor = green[300]
export const highlightBorderColor = pink.A400
export const focusedColor = blue[200]
export const backgroundColor = 'rgba(255, 255, 255, 0.64)'

const overrides = {
  MuiIconButton: {
    root: {
      padding: 0,
      height: '2.5rem',
      width: '2.5rem'
    }
  },
  MuiSnackbarContent: {
    root: {
      fontSize: '1.5rem',
      padding: '0 2rem',
      justifyContent: 'center',
      textTransform: 'capitalize',
      backgroundColor: 'rgba(0, 0, 0, 0.618)'
    }
  },
  MuiTooltip: {
    tooltip: {
      display: 'inline-flex'
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
  theme,
  {
    app: {
      focusedColor: '#292B2E',
      highlightBorderColor: pink.A400,
      highlightColor: '#323639'
    }
  }
)

export default class ThemeStore {
  constructor (store) {
    this.store = store
  }

  @computed
  get theme () {
    return this.store.userStore.darkTheme ? darkTheme : theme
  }

  @computed
  get muiTheme () {
    return createMuiTheme(this.theme)
  }
}
