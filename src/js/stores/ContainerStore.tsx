import { observable, computed } from 'mobx'
import Store from 'stores'
import { browser } from 'libs'

// This store is for individual tab's tooltip.
export default class ContainerStore {
  store: Store

  @observable
  containerMap = new Map()

  constructor (store) {
    this.store = store
    this.init()
  }

  init = async () => {
    console.log('containers:')
    const containers = await browser.contextualIdentities.query({})
    console.log('containers:', containers)
    containers.forEach(this._setContainer)
    console.log(this.containerMap)
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
    // this.containerMap.set(containerInfo.cookieStoreId, containerInfo)
    console.log('upUpdated:', changeInfo)
    this._setContainer(changeInfo.contextualIdentity)
  }

  onRemoved = (changeInfo) => {
    this.containerMap.delete(changeInfo.contextualIdentity.cookieStoreId)
  }

  @computed
  get count () {
    return this.containerMap.size
  }

  getContainer = (cookieStoreId) => {
    return this.containerMap.get(cookieStoreId)
  }
}
