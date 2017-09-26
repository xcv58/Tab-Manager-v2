import React from 'react'
import { storiesOf } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import Tab from 'components/Tab/Tab'
import DraggableTab from 'components/Tab/DraggableTab'
import Icon from 'components/Tab/Icon'

const tabProps = () => ({
  id: 1,
  title: `Rubik's Cube Timer`,
  url: 'https://rubik.xcv58.com',
  dragPreview: action('dragPreview'),
  getWindowList: action('getWindowList'),
  faked: true
})

storiesOf('Tab', module)
  .add('DraggableTab', () => (
    <DraggableTab {...tabProps()} />
  ))
  .add('Tab', () => (
    <Tab {...tabProps()} />
  ))
  .add('Pinned DraggableTab', () => (
    <DraggableTab {...tabProps()} pinned />
  ))
  .add('Pinned Tab', () => (
    <Tab {...tabProps()} pinned />
  ))

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
].map((x) => {
  iconStory.add(`Chrome Icon ${x}`, () => (
    <Icon {...tabProps()} url={`chrome://${x}`} />
  ))
})
