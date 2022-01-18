import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'
import CloseButton from 'components/CloseButton'

export default observer(() => {
  const { tabStore, hasFocusedOrSelectedTab, remove } = useStore()
  const { tabDescription } = tabStore
  const title = `Close ${tabDescription}`
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <CloseButton
          {...{
            onClick: remove,
            disabled: !hasFocusedOrSelectedTab,
          }}
        />
      </div>
    </Tooltip>
  )
})
