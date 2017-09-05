import WindowStore from './WindowStore'
import SearchStore from './SearchStore'
import TabStore from './TabStore'
import ArrangeStore from './ArrangeStore'

export default class Store {
  constructor () {
    this.windowStore = new WindowStore(this)
    this.searchStore = new SearchStore(this)
    this.tabStore = new TabStore(this)
    this.arrangeStore = new ArrangeStore(this)
  }
}
