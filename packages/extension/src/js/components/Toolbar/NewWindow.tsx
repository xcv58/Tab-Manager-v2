import React from 'react'
import { observer } from 'mobx-react-lite'
import { Tooltip } from '@material-tailwind/react'
import OpenInNew from '@mui/icons-material/OpenInNew'
import IconButton from '@mui/material/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(() => {
  const { dragStore, tabStore } = useStore()
  const { dropToNewWindow } = dragStore
  const { selection, tabDescription } = tabStore
  const title = `Open ${tabDescription} in new window`
  return (
    <Tooltip content={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => dropToNewWindow()}
          disabled={selection.size === 0}
          className="focus:outline-none"
          aria-label={title}
        >
          <OpenInNew />
        </IconButton>
      </div>
    </Tooltip>
  )
})
