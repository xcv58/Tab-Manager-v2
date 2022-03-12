import React from 'react'
import { observer } from 'mobx-react-lite'
import Snackbar from '@mui/material/Snackbar'
import Fade from '@mui/material/Fade'
import { useStore } from 'components/hooks/useStore'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'

export default observer(() => {
  const { shortcutStore } = useStore()
  const { combo, toastOpen } = shortcutStore
  const reduceMotion = useReduceMotion()
  return (
    <Snackbar
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      TransitionComponent={Fade}
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      open={toastOpen}
      message={<h6>{combo}</h6>}
    />
  )
})
