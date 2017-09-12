import Mousetrap from 'mousetrap'

Mousetrap.bind('ctrl+b', (e) => {
  console.log('ctrl+b')
  chrome.runtime.sendMessage({ action: 'last-active-tab' })
})
