import React from 'react'
import classNames from 'classnames'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import ControlIconButton from 'components/ControlIconButton'

type Props = {
  className?: string
}

export default ({ className }: Props) => {
  return (
    <ControlIconButton
      tabIndex={-1}
      className={classNames(className)}
      controlSize="compact"
      sx={{
        cursor: 'move',
        '&:hover': {
          cursor: 'move',
        },
      }}
      aria-label="Drag tab"
      title="Drag tab"
    >
      <DragHandleIcon sx={{ fontSize: 15 }} />
    </ControlIconButton>
  )
}
