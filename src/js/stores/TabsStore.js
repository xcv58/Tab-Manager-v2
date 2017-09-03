import { action, computed, observable } from 'mobx'

class TabsStore {
  @observable selection = new Map()
  @observable targetId = null
  @observable before = true

  @action
  select = (tab) => {
    const { id } = tab
    if (this.selection.has(id)) {
      this.selection.delete(id)
    } else {
      this.selection.set(id, tab)
    }
  }

  @action
  clear = () => {
    this.selection.clear()
    this.targetId = null
    this.before = false
  }

  @action
  dragStart = (tab) => {
    this.selection.set(tab.id, tab)
  }

  @action
  setDropTarget = (id, before) => {
    this.targetId = id
    this.before = before
  }

  @computed
  get sources () {
    return this.selection.values().sort((a, b) => {
      if (a.windowId === b.windowId) {
        return a.index - b.index
      }
      return a.windowId - b.windowId
    })
  }

  @action
  drop = (tab) => {
    const { windowId } = tab
    const index = tab.index + (this.before ? 0 : 1)
    const sources = this.before ? this.sources.reverse() : this.sources
    sources.map(({ id, pinned }) => {
      chrome.tabs.move(
        id,
        { windowId, index },
        () => {
          chrome.tabs.update(id, { pinned })
        }
      )
    })
  }
}

export default new TabsStore()
