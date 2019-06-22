import React from 'react'
import { observer } from 'mobx-react-lite'
import Snackbar from '@material-ui/core/Snackbar'
import Typography from '@material-ui/core/Typography'
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
      message={<Typography variant='h6'>{combo}</Typography>}
    />
  )
})
