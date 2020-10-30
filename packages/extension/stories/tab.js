import React from 'react'
import { storiesOf } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import Tab from 'components/Tab/Tab'
import DraggableTab from 'components/Tab/DraggableTab'
import Icon from 'components/Tab/Icon'
import store from '../.storybook/mock-store'

store.windowStore.getAllWindows()
const tabs = store.windowStore.windows[0].tabs

const tabProps = (props) => {
  const tab = tabs[Math.floor(Math.random() * tabs.length)]
  Object.assign(tab, props)
  return {
    tab,
    dragPreview: action('dragPreview'),
    getWindowList: action('getWindowList'),
    faked: true
  }
}

storiesOf('Tab', module)
  .add('DraggableTab', () => <DraggableTab {...tabProps({ pinned: false })} />)
  .add('Tab', () => <Tab {...tabProps({ pinned: false })} />)
  .add('Pinned DraggableTab', () => (
    <DraggableTab {...tabProps({ pinned: true })} />
  ))
  .add('Pinned Tab', () => <Tab {...tabProps({ pinned: true })} />)

const iconStory = storiesOf('Icon', module)
;[
  'bookmarks',
  'chrome',
  'crashes',
  'downloads',
  'extensions',
  'flags',
  'history',
  'settings'
].forEach((x) => {
  iconStory.add(`Chrome Icon ${x}`, () => (
    <Icon {...tabProps()} url={`chrome://${x}`} />
  ))
})
