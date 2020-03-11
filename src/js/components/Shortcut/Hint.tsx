import React from 'react'
import { observer } from 'mobx-react'
import Snackbar from '@material-ui/core/Snackbar'
import Fade from '@material-ui/core/Fade'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { shortcutStore } = useStore()
  const { combo, toastOpen } = shortcutStore
  return (
    <Snackbar
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center'
      }}
      TransitionComponent={Fade}
      open={toastOpen}
      message={<h6>{combo}</h6>}
    />
  )
})
