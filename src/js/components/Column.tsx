import React from 'react'
import { observer } from 'mobx-react'
import Window from 'components/Window'
import { useStore } from './StoreContext'

export default observer((props) => {
  const { userStore } = useStore()
  const {
    column: { windows },
    left,
    right,
    width
  } = props

  const style: any = {
    width,
    minWidth: `${userStore.tabWidth}rem`,
    height: 'fit-content',
    padding: 0,
    boxSizing: 'border-box',
    marginLeft: left && 'auto',
    marginRight: right && 'auto'
  }
  const windowList = windows.map((win) => (
    <Window key={win.id} win={win} width={width} />
  ))
  return <div style={style}>{windowList}</div>
})
