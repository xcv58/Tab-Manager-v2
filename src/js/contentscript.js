import Mousetrap from 'mousetrap'
import actions from 'libs/actions'

Mousetrap.bind('ctrl+b', (e) => {
  chrome.runtime.sendMessage({ action: actions.lastActiveTab() })
})
