import React from 'react'
import { observer } from 'mobx-react-lite'
import Title from './Title'
import { WinProps } from 'components/types'
import WindowDropZone from './WindowDropZone'

export default observer((props: WinProps) => {
  const { win } = props
  return (
    <div className="relative">
      <WindowDropZone win={win} position="top" />
      <Title {...props} className="" />
    </div>
  )
})
