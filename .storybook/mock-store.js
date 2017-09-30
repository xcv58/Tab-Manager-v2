import Store from 'stores'
import windows from './windows'
import chrome from 'sinon-chrome'

global.chrome = chrome

class MockStore {
  windows = windows
  lastFocusedWindowId = windows[1].id
}

const mockStore = new MockStore()
chrome.windows.getAll.yields(mockStore.windows)

const store = new Store()
store.windowStore.lastFocusedWindowId = mockStore.lastFocusedWindowId

export default store
