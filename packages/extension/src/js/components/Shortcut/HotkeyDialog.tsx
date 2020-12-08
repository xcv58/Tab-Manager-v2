import React, { useState } from 'react'
import TextField from '@material-ui/core/TextField'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import { observer } from 'mobx-react-lite'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Help from './Help'
import Fade from '@material-ui/core/Fade'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from '@material-ui/core'
import CloseButton from 'components/CloseButton'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'

export default observer(() => {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { shortcutStore } = useStore()
  const { dialogOpen, closeDialog } = shortcutStore
  const reduceMotion = useReduceMotion()
  return (
    <Dialog
      open={dialogOpen}
      TransitionComponent={Fade}
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
      fullWidth
      {...{ maxWidth: 'lg', fullScreen }}
    >
      <DialogTitle>
        <div className='flex items-end'>
          <h2>Keyboard Shortcuts</h2>
          <div className='flex-1 mx-6'>
            <TextField
              fullWidth
              label='Search'
              type='search'
              variant='standard'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className='absolute top-0 right-0 p-2'>
            <CloseButton onClick={closeDialog} />
          </div>
        </div>
      </DialogTitle>
      <DialogContent style={{ minHeight: 'calc(100vh - 142px)' }}>
        <Help search={search.toLowerCase()} />
      </DialogContent>
    </Dialog>
  )
})
