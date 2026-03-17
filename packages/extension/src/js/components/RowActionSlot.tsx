import React from 'react'
import classNames from 'classnames'
import { COMPACT_ACTION_SLOT_HEIGHT } from 'libs/layoutMetrics'

type Props = {
  visible?: boolean
  hoverVisible?: boolean
  children: React.ReactNode
}

export default ({ visible = true, hoverVisible = false, children }: Props) => (
  <div
    aria-hidden={!visible && !hoverVisible}
    style={{ width: 28, height: COMPACT_ACTION_SLOT_HEIGHT }}
    className={classNames(
      'flex h-10 w-7 shrink-0 items-center justify-center transition-opacity duration-150',
      {
        'visible pointer-events-auto opacity-100': visible,
        'invisible pointer-events-none opacity-0': !visible && !hoverVisible,
        'invisible pointer-events-none opacity-0 group-hover/tab-row:visible group-hover/tab-row:pointer-events-auto group-hover/tab-row:opacity-100':
          !visible && hoverVisible,
      },
    )}
  >
    {children}
  </div>
)
