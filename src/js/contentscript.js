import Mousetrap from 'mousetrap'

Mousetrap.bind('ctrl+b', (e) => {
  chrome.runtime.sendMessage({ action: 'last-active-tab' })
})
