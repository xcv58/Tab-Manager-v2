import { action, computed, observable, makeObservable } from 'mobx'
import { getDomain, togglePinTabs, browser } from 'libs'
import bookmarks from 'img/chrome/bookmarks.png'
import chromeIcon from 'img/chrome/chrome.png'
import crashes from 'img/chrome/crashes.png'
import empty from 'img/chrome/empty.png'
import downloads from 'img/chrome/downloads.png'
import extensions from 'img/chrome/extensions.png'
import flags from 'img/chrome/flags.png'
import history from 'img/chrome/history.png'
import settings from 'img/chrome/settings.png'
import Store from 'stores'
import Window from './Window'
import Focusable from './Focusable'

const FAV_ICONS = {
  bookmarks,
  chrome: chromeIcon,
  crashes,
  downloads,
  extensions,
  flags,
  history,
  settings,
}

const CHROME_PREFIX = 'chrome://'
const CHROME_EXTENSION_PREFIX = 'chrome-extension://'

export default class Tab extends Focusable {
  win: Window

  constructor(tab, store: Store, win: Window) {
    super(store)

    makeObservable(this, {
      cookieStoreId: observable,
      iconUrl: observable,
      active: observable,
      pinned: observable,
      title: observable,
      index: observable,
      url: observable,
      windowId: observable,
      removing: observable,
      activate: action,
      select: action,
      bulkSelect: action,
      toggleHide: action,
      toggleSelectAll: action,
      reload: action,
      update: action,
      focus: action,
      hover: action,
      unhover: action,
      closeDuplicatedTab: action,
      remove: action,
      groupTab: action,
      togglePin: action,
      isMatched: computed,
      isVisible: computed,
      domain: computed,
      sameDomainTabs: computed,
      duplicatedTabCount: computed,
      isDuplicated: computed,
      isSelected: computed,
      query: computed,
      isHovered: computed,
      shouldHighlight: computed,
      fingerPrint: computed,
      closeOtherTabs: action,
      closeWindow: action,
      selectTabsInSameContainer: action,
      openSameContainerTabs: action,
    })

    this.store = store
    Object.assign(this, tab)
    this.win = win
    this.setUrlIcon()
  }

  cookieStoreId = ''

  iconUrl = empty

  active = false

  pinned = false

  title = ''

  url = ''

  windowId: number = null

  removing = false

  favIconUrl = ''

  index = -1

  activate = () => {
    this.focus()
    this.store.tabStore.activate(this)
  }

  select = () => {
    this.focus()
    this.store.tabStore.select(this)
  }

  bulkSelect = () => {
    this.focus()
    this.store.tabStore.bulkSelct(this)
  }

  toggleHide = () => this.win.toggleHide()

  toggleSelectAll = () => this.win.toggleSelectAll()

  reload = () => browser.tabs.reload(this.id)

  _updateHandle: any = null

  _update = async () => {
    const newTab = await browser.tabs.get(this.id)
    Object.assign(this, newTab)
    this.setUrlIcon()
    this._updateHandle = null
  }

  update = () => {
    if (this._updateHandle) {
      clearTimeout(this._updateHandle)
    }
    this._updateHandle = setTimeout(this._update, 0)
  }

  focus = () => {
    this.store.focusStore.focus(this)
  }

  hover = () => {
    this.store.hoverStore.hover(this.id)
  }

  unhover = () => this.store.hoverStore.unhover()

  closeDuplicatedTab = () => this.store.windowStore.closeDuplicatedTab(this)

  remove = () => {
    this.removing = true
    this.store.windowStore.removeTabs([this.id])
    browser.tabs.remove(this.id)
  }

  groupTab = () => {
    this.store.arrangeStore.groupTab(this)
  }

  togglePin = () => {
    togglePinTabs([this])
  }

  get isMatched() {
    return this.store.searchStore.matchedSet.has(this.id)
  }

  get isVisible() {
    if (this.removing) {
      return false
    }
    return this.isMatched || this.store.userStore.showUnmatchedTab
  }

  get domain() {
    return getDomain(this.url)
  }

  get sameDomainTabs() {
    return this.store.arrangeStore.domainTabsMap[this.domain]
  }

  get isDuplicated() {
    return this.store.windowStore.tabFingerprintMap[this.fingerPrint] > 1
  }

  get duplicatedTabCount() {
    return this.store.windowStore.tabFingerprintMap[this.fingerPrint]
  }

  get isSelected() {
    return this.store.tabStore.selection.has(this.id)
  }

  get query() {
    return this.store.searchStore._tabQuery
  }

  get isHovered() {
    return this.id === this.store.hoverStore.hoveredTabId
  }

  get shouldHighlight() {
    return this.isMatched && (this.isFocused || this.isHovered)
  }

  get fingerPrint() {
    if (!this.store.userStore.ignoreHash) {
      return this.url
    }
    return this.url.split('#')[0]
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
      const { icons } = await browser.management.get(host)
      this.iconUrl = ([...(icons || [])].pop() || {}).url || this.iconUrl
    } else {
      this.iconUrl = favIconUrl || this.iconUrl
    }
  }

  closeOtherTabs = () => {
    this.win.tabs.filter((tab) => tab.id !== this.id).map((tab) => tab.remove())
  }

  closeWindow = () => this.win.closeWindow()

  selectTabsInSameContainer =
    process.env.TARGET_BROWSER === 'firefox'
      ? () => {
          this.store.tabStore.selectTabsInSameContainer(this)
        }
      : () => {}

  openSameContainerTabs =
    process.env.TARGET_BROWSER === 'firefox'
      ? () => {
          this.store.containerStore.openSameContainerTabs(this)
        }
      : () => {}
}
