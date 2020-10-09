import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import LightbulbOutline from 'svgIcons/LightbulbOutline'
import LightbulbFull from 'svgIcons/LightbulbFull'
import { useStore } from './hooks/useStore'
import { useTheme } from './hooks/useTheme'

export default observer(() => {
  const {
    userStore: { toggleDarkTheme }
  } = useStore()
  const isDarkTheme = useTheme()
  return (
    <Tooltip title='Toggle light/dark theme' placement='left'>
      <IconButton
        onClick={() => toggleDarkTheme(isDarkTheme)}
        className='focus:outline-none'
      >
        {isDarkTheme ? <LightbulbFull /> : <LightbulbOutline />}
      </IconButton>
    </Tooltip>
  )
})
