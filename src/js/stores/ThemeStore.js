import { computed } from 'mobx'
import { createMuiTheme } from '@material-ui/core/styles'
import merge from 'lodash.merge'

const overrides = {
  MuiIconButton: {
    root: {
      height: '2.5rem',
      width: '2.5rem'
    }
  },
  MuiSwitch: {
    root: {
      width: '3.5rem'
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
  backgroundColor: 'white',
  test: {
    danger: 'white'
  }
}

const theme = { overrides, app }

const darkTheme = merge({}, theme, {
  app: {
    backgroundColor: '#202123'
  }
})

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
