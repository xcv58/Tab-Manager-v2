import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react'
import { getNoun } from 'libs'
import { useStore } from './StoreContext'

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
    <button
      onFocus={(e) => e.target.blur()}
      className={classNames(
        'fixed top-0 w-full p-0 m-auto text-sm border-none flex',
        {
          'opacity-50': typing
        }
      )}
    >
      <Title {...{ title }} />, {selected} {getNoun('tab', selected)} selected
    </button>
  )
})
