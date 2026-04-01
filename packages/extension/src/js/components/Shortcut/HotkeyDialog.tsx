import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Dialog, { DialogTitle, DialogContent } from 'components/ui/Dialog'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import CloseButton from 'components/CloseButton'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'
import Help from './Help'

export default observer(() => {
  const theme = useAppTheme()
  const [search, setSearch] = useState('')
  const [fullScreen, setFullScreen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 600,
  )
  const { shortcutStore } = useStore()
  const { dialogOpen, closeDialog } = shortcutStore
  const reduceMotion = useReduceMotion()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateFullScreen = () => {
      setFullScreen(window.innerWidth < 600)
    }

    updateFullScreen()
    window.addEventListener('resize', updateFullScreen)

    return () => {
      window.removeEventListener('resize', updateFullScreen)
    }
  }, [])

  return (
    <Dialog
      open={dialogOpen}
      disableRestoreFocus
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      style={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <DialogTitle>
        <div className="flex items-end">
          <h2>Keyboard Shortcuts</h2>
          <div className="flex-1 mx-6">
            <input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid',
                borderColor: theme.palette.divider,
                background: 'transparent',
                color: 'inherit',
                fontSize: '1rem',
                padding: '4px 0',
                outline: 'none',
              }}
            />
          </div>
          <div className="absolute top-0 right-0 p-2">
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
