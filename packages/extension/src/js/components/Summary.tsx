import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { getNoun } from 'libs'
import { useStore } from './hooks/useStore'

const Title = ({ title }) => {
  useEffect(() => {
    document.title = `${title} - Tab Manager v2`
  }, [title])
  return title
}

export default observer(() => {
  const { searchStore, tabStore, windowStore } = useStore()
  const { windows, tabCount } = windowStore
  const { typing } = searchStore
  const selected = tabStore.selection.size
  const title = `${windows.length} ${getNoun(
    'window',
    windows.length
  )}, ${tabCount} ${getNoun('tab', tabCount)}`
  return (
    <p
      className={classNames(
        'fixed top-0 left-0 flex justify-center w-full p-0 text-sm border-none',
        {
          'opacity-50': typing,
        }
      )}
    >
      <Title {...{ title }} />, {selected} {getNoun('tab', selected)} selected
    </p>
  )
})
