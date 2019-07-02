import React from 'react'
import { observer } from 'mobx-react'
import Tab from 'components/Tab/Tab'
import { focusedColor } from 'libs/colors'
import { useStore } from './StoreContext'

const style = {
  opacity: 0.5,
  background: focusedColor
}

export default observer(props => {
  const { tabStore } = useStore()
  const { sources } = tabStore
  const content = sources.map(tab => <Tab key={tab.id} tab={tab} faked />)
  return <div style={{ ...style, ...props.style }}>{content}</div>
})
