import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import LightbulbOutline from 'svgIcons/LightbulbOutline'
import LightbulbFull from 'svgIcons/LightbulbFull'
import { useStore } from './StoreContext'

export default observer(() => {
  const { userStore } = useStore()
  const { darkTheme, toggleDarkTheme } = userStore
  return (
    <Tooltip title='Toggle light/dark theme' placement='left'>
      <IconButton onClick={toggleDarkTheme}>
        {darkTheme ? <LightbulbFull /> : <LightbulbOutline />}
      </IconButton>
    </Tooltip>
  )
})
