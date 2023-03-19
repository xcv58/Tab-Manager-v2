import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import { browser, tabComparator, moveTabs } from 'libs'
import Tab from './Tab'

const DUMB_FUNCTION = () => {}

export default class ContainerStore {
  store: Store

  containerMap = new Map()

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
    this.init()
  }

  init = async () => {
    const containers = await browser.contextualIdentities.query({})
    containers.forEach(this._setContainer)
    browser.contextualIdentities.onCreated.addListener(this.onCreated)
    browser.contextualIdentities.onRemoved.addListener(this.onRemoved)
    browser.contextualIdentities.onUpdated.addListener(this.onUpdated)
  }

  _setContainer = (containerInfo) => {
    this.containerMap.set(containerInfo.cookieStoreId, containerInfo)
  }

  onCreated = (changeInfo) => {
    this._setContainer(changeInfo.contextualIdentity)
  }

  onUpdated = (changeInfo) => {
    this._setContainer(changeInfo.contextualIdentity)
  }

  onRemoved = (changeInfo) => {
    this.containerMap.delete(changeInfo.contextualIdentity.cookieStoreId)
  }

  get count() {
    return this.containerMap.size
  }

  getContainer = (cookieStoreId) => {
    return this.containerMap.get(cookieStoreId)
  }

  openSameContainerTabs =
    process.env.TARGET_BROWSER === 'firefox'
      ? (tab: Tab) => {
          const tabs = this.store.windowStore.tabs.filter(
            (x) => x.cookieStoreId === tab.cookieStoreId,
          )
          this.store.windowStore.createNewWindow(tabs)
        }
      : DUMB_FUNCTION

  groupTabsByContainer =
    process.env.TARGET_BROWSER === 'firefox'
      ? async () => {
          const cookieTabMap = this.store.windowStore.tabs.reduce(
            (acc, cur) => {
              acc[cur.cookieStoreId] = acc[cur.cookieStoreId] || []
              acc[cur.cookieStoreId].push(cur)
              return acc
            },
            {},
          )
          await Promise.all(
            Object.values(cookieTabMap).map(async (tabs: Tab[]) => {
              if (tabs.length > 1) {
                const sortedTabs = tabs.sort(tabComparator)
                const { windowId } = sortedTabs[0]
                await moveTabs(sortedTabs, windowId)
              }
            }),
          )
        }
      : DUMB_FUNCTION
}
