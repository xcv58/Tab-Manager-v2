import React from 'react'
import { inject, observer } from 'mobx-react'
import Fade from '@material-ui/core/Fade'
import Loading from 'components/Loading'
import Columns from 'components/Columns'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import Tools from 'components/Tools'
import DragPreview from 'components/DragPreview'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { MuiThemeProvider, withStyles } from '@material-ui/core/styles'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'

const styles = theme => {
  return {
    root: {
      backgroundColor: theme.app.test.danger
    }
  }
}

let CustomCheckbox = props => {
  console.log(props)
  return <div className={props.classes.root}>123</div>
}
CustomCheckbox = withStyles(styles)(CustomCheckbox)

@DragDropContext(HTML5Backend)
@inject('windowStore')
@inject('shortcutStore')
@inject('themeStore')
@observer
export default class App extends React.Component {
  componentDidMount () {
    this.props.windowStore.didMount(this)
    this.props.shortcutStore.didMount(this)
  }

  componentWillUnmount () {
    this.props.shortcutStore.willUnmount()
  }

  render () {
    if (this.props.windowStore.initialLoading) {
      return <Loading />
    }
    const { muiTheme, theme } = this.props.themeStore
    return (
      <React.StrictMode>
        <MuiThemeProvider theme={muiTheme}>
          <div
            style={{
              backgroundColor: theme.app.backgroundColor,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100vh'
            }}
          >
            <Tools
              inputRef={input => {
                this.search = input
              }}
            />
            <Fade in>
              <Columns />
            </Fade>
            <CustomCheckbox />
            <Toolbar />
            <Shortcut />
            <DragPreview />
            <SettingsDialog />
          </div>
        </MuiThemeProvider>
      </React.StrictMode>
    )
  }
}
