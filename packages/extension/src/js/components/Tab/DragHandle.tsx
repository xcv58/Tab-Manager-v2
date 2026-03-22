import React from 'react'
import classNames from 'classnames'
import { DragHandleIcon } from 'icons/materialIcons'
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
      style={{ cursor: 'move' }}
      aria-label="Drag tab"
      title="Drag tab"
    >
      <DragHandleIcon fontSize={15} />
    </ControlIconButton>
  )
}
