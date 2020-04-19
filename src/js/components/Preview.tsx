import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import Tab from 'components/Tab/Tab'
import { useStore } from './StoreContext'
import { useTheme } from './ThemeContext'

export default observer((props) => {
  const isDarkTheme = useTheme()
  const { tabStore } = useStore()
  const { sources } = tabStore
  const content = sources.map((tab) => <Tab key={tab.id} tab={tab} faked />)
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
