import WindowStore from './WindowStore'
import SearchStore from './SearchStore'
import TabStore from './TabStore'
import ArrangeStore from './ArrangeStore'
import DragStore from './DragStore'
import ShortcutStore from './ShortcutStore'

export default class Store {
  constructor () {
    this.windowStore = new WindowStore(this)
    this.searchStore = new SearchStore(this)
    this.tabStore = new TabStore(this)
    this.arrangeStore = new ArrangeStore(this)
    this.dragStore = new DragStore(this)
    this.shortcutStore = new ShortcutStore(this)
  }
}
