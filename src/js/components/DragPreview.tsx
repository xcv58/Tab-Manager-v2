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
      id='dragPreview'
      style={{
        width: '10rem',
        position: 'fixed',
        background: focusedColor,
        textAlign: 'center',
        top: -512,
        left: 4096
      }}
    >
      {head}
    </div>
  )
})
