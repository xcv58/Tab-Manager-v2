import { action, observable, makeAutoObservable } from 'mobx'
import Store from 'stores'
import { browser } from 'libs'

export type TabGroup = {
  collapsed: boolean
  color: string
  id: number
  title?: string
  windowId: number
}

export default class GroupStore {
  store: Store

  tabGroupMap: Map<number, TabGroup> = new Map()

  constructor(store: Store) {
    makeAutoObservable(this, {
      tabGroupMap: observable,
      onTabGroup: action,
      onRemoved: action,
    })

    this.store = store
    this.init()
  }

  init = async () => {
    const tabGroups = await browser.tabGroups.query({})
    if (Array.isArray(tabGroups)) {
      tabGroups.forEach((tabGroup) => {
        this.tabGroupMap.set(tabGroup.id, tabGroup)
      })
    }
    browser.tabGroups.onCreated.addListener(this.onTabGroup)
    browser.tabGroups.onRemoved.addListener(this.onRemoved)
    browser.tabGroups.onMoved.addListener(this.onTabGroup)
    browser.tabGroups.onUpdated.addListener(this.onTabGroup)
  }

  onTabGroup = (tabGroup: TabGroup) => {
    this.tabGroupMap.set(tabGroup.id, tabGroup)
  }

  onRemoved = (tabGroup: TabGroup) => {
    this.tabGroupMap.delete(tabGroup.id)
  }

  getTabGroup = (id: number | null) => {
    return this.tabGroupMap.get(id)
  }
}
