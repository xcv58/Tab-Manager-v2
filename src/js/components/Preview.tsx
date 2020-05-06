import React, { CSSProperties } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useStore } from './StoreContext'
import { useTheme } from './ThemeContext'
import TabOption from './Tab/TabOption'

export default observer((props: { style: CSSProperties }) => {
  const isDarkTheme = useTheme()
  const { tabStore } = useStore()
  const { sources } = tabStore
  const content = sources.map((tab) => <TabOption key={tab.id} tab={tab} />)
  return (
    <div
      className={classNames('opacity-50', {
        'bg-blue-300': !isDarkTheme,
        'bg-gray-900': isDarkTheme
      })}
      style={props.style}
    >
      {content}
    </div>
  )
})
