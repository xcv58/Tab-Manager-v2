import React from 'react'
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

export default class Icon extends React.Component {
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

  render () {
    return (
      <img src={this.getFavIconUrl()}
        style={{
          padding: '0 8px',
          width: '1rem',
          height: '1rem'
        }}
      />
    )
  }
}
