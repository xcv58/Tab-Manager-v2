import { action, computed, observable } from 'mobx'
import bookmarks from 'img/chrome/bookmarks.png'
import chromeIcon from 'img/chrome/chrome.png'
import crashes from 'img/chrome/crashes.png'
import empty from 'img/chrome/empty.png'
import downloads from 'img/chrome/downloads.png'
import extensions from 'img/chrome/extensions.png'
import flags from 'img/chrome/flags.png'
import history from 'img/chrome/history.png'
import settings from 'img/chrome/settings.png'

const FAV_ICONS = {
  bookmarks,
  chrome: chromeIcon,
  crashes,
  downloads,
  extensions,
  flags,
  history,
  settings
}

const CHROME_PREFIX = 'chrome://'
const CHROME_EXTENSION_PREFIX = 'chrome-extension://'

export default class Tab {
  constructor (tab, store) {
    this.store = store
    Object.assign(this, tab)
    this.setUrlIcon()
  }

  @observable isHovered = false
  @observable iconUrl = empty

  @action
  activate = () => {
    this.focus()
    this.store.tabStore.activate(this)
  }

  @action
  select = () => {
    this.focus()
    this.store.tabStore.select(this)
  }

  @action
  focus = () => {
    this.store.searchStore.focus(this)
  }

  @action
  hover = () => {
    this.isHovered = true
  }

  @action
  unhover = () => {
    this.isHovered = false
  }

  @computed
  get isMatched () {
    return this.store.searchStore.matchedSet.has(this.id)
  }

  @computed
  get isFocused () {
    return this.id === this.store.searchStore.focusedTab
  }

  @computed
  get isSelected () {
    return this.store.tabStore.selection.has(this.id)
  }

  @computed
  get query () {
    return this.store.searchStore._query
  }

  @computed
  get shouldHighlight () {
    return this.isMatched && (this.isFocused || this.isHovered)
  }

  setUrlIcon = async () => {
    const { url, favIconUrl } = this
    const { host } = new window.URL(url)
    if (url.startsWith(CHROME_PREFIX)) {
      this.iconUrl = FAV_ICONS[host] || this.iconUrl
    } else if (url.startsWith(CHROME_EXTENSION_PREFIX)) {
      const { icons } = await chrome.management.get(host)
      this.iconUrl = ([...icons].pop() || {}).url || this.iconUrl
    } else {
      this.iconUrl = favIconUrl || this.iconUrl
    }
  }
}
