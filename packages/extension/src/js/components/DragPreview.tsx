import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useStore } from './hooks/useStore'
import { useTheme } from './hooks/useTheme'

export default observer(() => {
  const isDarkTheme = useTheme()
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
      className={classNames('w-32 text-center opacity-75', {
        'bg-blue-300': !isDarkTheme,
        'bg-gray-900': isDarkTheme,
      })}
    >
      {head}
    </div>
  )
})
