import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { getNoun } from 'libs'
import { useStore } from './hooks/useStore'
import { useTheme } from './hooks/useTheme'

const Title = ({ title }) => {
  useEffect(() => {
    document.title = `${title} - Tab Manager v2`
  }, [title])
  return title
}

export default observer(() => {
  const { searchStore, tabStore, windowStore } = useStore()
  const isDarkTheme = useTheme()
  const { windows, tabCount } = windowStore
  const { typing } = searchStore
  const selected = tabStore.selection.size
  const title = `${windows.length} ${getNoun(
    'window',
    windows.length,
  )}, ${tabCount} ${getNoun('tab', tabCount)}`
  return (
    <p
      className={classNames(
        'fixed top-0 left-0 flex items-center justify-center w-full p-0 text-sm border-none pointer-events-none',
        {
          'opacity-50': typing,
        },
      )}
      style={{
        color: isDarkTheme ? '#c3cad6' : undefined,
      }}
    >
      <Title {...{ title }} />, {selected} {getNoun('tab', selected)} selected
    </p>
  )
})
