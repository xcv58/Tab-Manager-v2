import React from 'react'
import { observer } from 'mobx-react-lite'
import Snackbar from 'components/ui/Snackbar'
import { useStore } from 'components/hooks/useStore'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'

export default observer(() => {
  const { shortcutStore, actionStore, userStore } = useStore()
  const { combo, toastOpen } = shortcutStore
  const reduceMotion = useReduceMotion()
  // Opening a dialog is already visible feedback. Remove any toast immediately
  // rather than fading it over the dialog's controls.
  if (
    shortcutStore.dialogOpen ||
    actionStore.paletteOpen ||
    userStore.dialogOpen
  )
    return null
  return (
    <Snackbar
      open={toastOpen}
      message={<h6>{combo}</h6>}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
    />
  )
})
