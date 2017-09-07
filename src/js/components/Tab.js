import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'
import bookmarks from '../../img/chrome/bookmarks.png'
import chrome from '../../img/chrome/chrome.png'
import crashes from '../../img/chrome/crashes.png'
import downloads from '../../img/chrome/downloads.png'
import extensions from '../../img/chrome/extensions.png'
import flags from '../../img/chrome/flags.png'
import history from '../../img/chrome/history.png'
import settings from '../../img/chrome/settings.png'

const FAV_ICONS = {
  bookmarks,
  chrome,
  crashes,
  downloads,
  extensions,
  flags,
  history,
  settings
}

const CHROME_PREFIX = 'chrome://'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  getFavIconUrl = () => {
    const { url, favIconUrl } = this.props
    if (url.startsWith(CHROME_PREFIX)) {
      const segments = url.slice(CHROME_PREFIX.length).match(/^\w+/g)
      if (segments) {
        return FAV_ICONS[segments[0]]
      }
    }
    return favIconUrl
  }

  onClick = () => {
    this.onFocus()
    this.props.tabStore.activate(this.props)
  }

  select = () => {
    this.onFocus()
    this.props.tabStore.select(this.props)
  }

  onFocus = () => {
    this.props.searchStore.focus(this.props)
  }

  render () {
    const {
      id,
      title,
      tabStore: { selection }
    } = this.props
    const selected = selection.has(id)
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}>
        <Checkbox
          checked={selected}
          onChange={this.select}
          onFocus={this.onFocus}
          style={{
            width: '1rem',
            height: '1rem',
            padding: 4
          }}
        />
        <img src={this.getFavIconUrl()}
          style={{
            padding: '0 8px',
            width: '1rem',
            height: '1rem'
          }}
        />
        <div
          onClick={this.onClick}
          style={{
            marginLeft: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
          {title}
        </div>
      </div>
    )
  }
}
