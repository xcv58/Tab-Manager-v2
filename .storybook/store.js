import Store from 'stores'
import windows from './windows'
import chrome from 'sinon-chrome'
global.chrome = chrome

const store = new Store()
store.windowStore.getAllWindows = () => {
  store.windowStore.windows = windows
}

export default store
