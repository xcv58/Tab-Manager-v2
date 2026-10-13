import React from 'react'
import { WinProps } from 'components/types'
import HeaderEdgeDropTarget from 'components/HeaderEdgeDropTarget'
import type { WindowEdge } from 'stores/DragStore'

export default function HeaderDropTarget(
  props: WinProps & { position: WindowEdge },
) {
  return <HeaderEdgeDropTarget {...props} />
}
