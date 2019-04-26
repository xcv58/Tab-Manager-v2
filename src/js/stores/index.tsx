import WindowStore from 'stores/WindowStore'
import SearchStore from 'stores/SearchStore'
import TabStore from 'stores/TabStore'
import ArrangeStore from 'stores/ArrangeStore'
import DragStore from 'stores/DragStore'
import ShortcutStore from 'stores/ShortcutStore'
import UserStore from 'stores/UserStore'
import HoverStore from 'stores/HoverStore'
import ThemeStore from 'stores/ThemeStore'

export default class Store {
  windowStore: WindowStore
  tabStore: TabStore
  arrangeStore: ArrangeStore
  dragStore: DragStore
  shortcutStore: ShortcutStore
  userStore: UserStore
  hoverStore: HoverStore
  searchStore: SearchStore
  themeStore: ThemeStore

  constructor () {
    this.windowStore = new WindowStore(this)
    this.tabStore = new TabStore(this)
    this.arrangeStore = new ArrangeStore(this)
    this.dragStore = new DragStore(this)
    this.shortcutStore = new ShortcutStore(this)
    this.userStore = new UserStore(this)
    this.hoverStore = new HoverStore(this)
    this.searchStore = new SearchStore(this)
    this.themeStore = new ThemeStore(this)
  }
}
