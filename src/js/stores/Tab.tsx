import { action, computed, observable } from 'mobx'
import { getDomain, togglePinTabs } from 'libs'
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
  constructor (tab, store, win) {
    this.store = store
    Object.assign(this, tab)
    this.win = win
    this.mounted = this.win.tabMounted
    this.setUrlIcon()
    this.showTab = !this.store.windowStore.initialLoading
  }

  @observable
  iconUrl = empty
  @observable
  active = false
  @observable
  title
  @observable
  url
  @observable
  id
  @observable
  showTab
  @observable
  removing = false

  favIconUrl: string

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
  reload = () => chrome.tabs.reload(this.id)

  @action
  focus = () => {
    this.store.searchStore.focus(this)
  }

  @action
  hover = () => {
    this.store.hoverStore.hover(this.id)
  }

  @action
  unhover = () => this.store.hoverStore.unhover()

  @action
  closeDuplicatedTab = () => this.store.windowStore.closeDuplicatedTab(this)

  @action
  remove = () => {
    this.removing = true
    this.store.windowStore.removeTabs([this.id])
    chrome.tabs.remove(this.id)
  }

  @action
  groupTab = () => {
    this.store.arrangeStore.groupTab(this)
  }

  @action
  togglePin = () => {
    togglePinTabs([this])
  }

  @computed
  get isMatched () {
    return this.store.searchStore.matchedSet.has(this.id)
  }

  @computed
  get isVisible () {
    if (this.removing) {
      return false
    }
    return this.isMatched || this.store.userStore.showUnmatchedTab
  }

  @computed
  get domain () {
    return getDomain(this.url)
  }

  @computed
  get sameDomainTabs () {
    return this.store.arrangeStore.domainTabsMap[this.domain]
  }

  @computed
  get urlCount () {
    return this.store.windowStore.urlCountMap[this.url] || 0
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
  get isHovered () {
    return this.id === this.store.hoverStore.hoveredTabId
  }

  @computed
  get shouldHighlight () {
    return this.isMatched && (this.isFocused || this.isHovered)
  }

  setUrlIcon = async () => {
    const { url, favIconUrl } = this
    if (!url) {
      return
    }
    const { host } = new window.URL(url)
    if (url.startsWith(CHROME_PREFIX)) {
      this.iconUrl = FAV_ICONS[host] || this.iconUrl
    } else if (url.startsWith(CHROME_EXTENSION_PREFIX)) {
      const { icons } = await chrome.management.get(host)
      this.iconUrl = ([...(icons || [])].pop() || {}).url || this.iconUrl
    } else {
      this.iconUrl = favIconUrl || this.iconUrl
    }
  }
}
