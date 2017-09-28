import Store from 'stores'
import windows from './windows'
import chrome from 'sinon-chrome'

global.chrome = chrome
chrome.windows.get.yields({ id: 'a' })

class MockStore {
  windows = windows
}

const mockStore = new MockStore()

const store = new Store()

store.windowStore.getAllWindows = () => {
  store.windowStore.windows = mockStore.windows
}

export default store
