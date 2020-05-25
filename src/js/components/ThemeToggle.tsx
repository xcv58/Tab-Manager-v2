import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import LightbulbOutline from 'svgIcons/LightbulbOutline'
import LightbulbFull from 'svgIcons/LightbulbFull'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const { userStore } = useStore()
  const { darkTheme, toggleDarkTheme, useSystemTheme } = userStore
  if (useSystemTheme) {
    return null
  }
  return (
    <Tooltip title='Toggle light/dark theme' placement='left'>
      <IconButton onClick={toggleDarkTheme} className='focus:outline-none'>
        {darkTheme ? <LightbulbFull /> : <LightbulbOutline />}
      </IconButton>
    </Tooltip>
  )
})
