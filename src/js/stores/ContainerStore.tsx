import { observable, computed } from 'mobx'
import Store from 'stores'
import { browser } from 'libs'

export default class ContainerStore {
  store: Store

  @observable
  containerMap = new Map()

  constructor (store) {
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

  @computed
  get count () {
    return this.containerMap.size
  }

  getContainer = (cookieStoreId) => {
    return this.containerMap.get(cookieStoreId)
  }
}
