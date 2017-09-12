import '../img/icon-16.png'
import '../img/icon-48.png'
import '../img/icon-128.png'
import 'chrome-extension-async'
import TabHistory from './background/TabHistory'

class Background {
  constructor () {
    this.tabHistory = new TabHistory(this)
  }
}

const init = () => new Background()
init()
