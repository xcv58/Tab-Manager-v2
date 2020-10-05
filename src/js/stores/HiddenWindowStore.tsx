import { observable, makeObservable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'

export default class HiddenWindowsStore {
  store: Store

  constructor (store) {
    makeObservable(this, {
      hiddenWindows: observable
    })

    this.store = store
    this.init()
  }

  init = async () => {
    const { hiddenWindows = {} } = await browser.storage.local.get({
      hiddenWindows: {}
    })
    if (typeof hiddenWindows === 'object') {
      this.hiddenWindows = hiddenWindows
    }
  }

  hiddenWindows = {}

  updateHideForAllWindows = (hide) => {
    if (hide) {
      this.hiddenWindows = Object.assign(
        {},
        ...this.store.windowStore.windows.map((x) => ({ [x.id]: true }))
      )
    } else {
      this.hiddenWindows = {}
    }
    this.saveHiddenWindows()
  }

  toggleHideForAllWindows = () => {
    this.store.windowStore.windows.forEach((win) => {
      this.hiddenWindows[win.id] = !this.hiddenWindows[win.id]
    })
    this.saveHiddenWindows()
  }

  hideWindow = (windowId) => {
    this.hiddenWindows[windowId] = true
    this.saveHiddenWindows()
  }

  showWindow = (windowId) => {
    this.hiddenWindows[windowId] = false
    this.saveHiddenWindows()
  }

  saveHiddenWindows = () => {
    const value = { hiddenWindows: this.hiddenWindows }
    browser.storage.local.set(value)
  }
}
