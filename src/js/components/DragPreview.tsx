import React from 'react'
import { observer } from 'mobx-react'
import { focusedColor } from 'libs/colors'
import { useStore } from './StoreContext'

export default observer(() => {
  const { tabStore } = useStore()
  const { sources } = tabStore
  const head = (
    <h3>
      {sources.length} tab
      {sources.length > 1 && 's'}
    </h3>
  )
  return (
    <div
      style={{
        opacity: 0.6,
        width: '8rem',
        background: focusedColor,
        textAlign: 'center'
      }}
    >
      {head}
    </div>
  )
})
