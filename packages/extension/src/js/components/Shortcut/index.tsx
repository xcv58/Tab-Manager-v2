import React, { lazy } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import DeferredContent from 'components/DeferredContent'
import Hint from './Hint'

const HotkeyDialog = lazy(() => import('./HotkeyDialog'))

export default observer(() => {
  const { shortcutStore } = useStore()
  return (
    <>
      <DeferredContent open={shortcutStore.dialogOpen}>
        <HotkeyDialog key="dialog" />
      </DeferredContent>
      <Hint key="hint" />
    </>
  )
})
