import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import LightbulbOutline from 'svgIcons/LightbulbOutline'
import LightbulbFull from 'svgIcons/LightbulbFull'

@inject('userStore')
@observer
class ThemeToggle extends React.Component {
  render () {
    const { darkTheme, toggleDarkTheme } = this.props.userStore
    return (
      <Tooltip title='Toggle light/dark theme' placement='left'>
        <IconButton onClick={toggleDarkTheme}>
          {darkTheme ? <LightbulbFull /> : <LightbulbOutline />}
        </IconButton>
      </Tooltip>
    )
  }
}

export default ThemeToggle
