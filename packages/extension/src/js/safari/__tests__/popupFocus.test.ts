import { observable, runInAction } from 'mobx'
import { installSafariPopupFocus } from '../popupFocus'

jest.mock('libs', () => ({ NOT_POPUP: 'not_popup' }))

let stop: (() => void) | undefined
let frames: Map<number, FrameRequestCallback>
const flush = () => {
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach((callback) => callback(0))
}
const setup = (lite: boolean, autoFocus: boolean, loaded = true) => {
  document.body.innerHTML =
    '<main tabindex="-1"><input class="toolbar-search-field"><button>Other control</button></main>'
  const input = document.querySelector('input')!
  const store = {
    userStore: observable({
      loaded,
      autoFocusSearch: autoFocus,
      litePopupMode: lite,
    }),
    searchStore: {
      getSearchInputEl: () => input,
      resultFocusController: { focusTab: jest.fn(() => true) },
    },
    windowStore: observable(
      {
        initialLoading: !loaded,
        lastFocusedWindow: { tabs: [{ id: 7, active: true }] },
        windows: [],
        focusActiveTabInLastFocusedWindow: jest.fn(() => ({ id: 7 })),
      },
      { focusActiveTabInLastFocusedWindow: false },
    ),
    focusStore: { focus: jest.fn() },
  }
  stop = installSafariPopupFocus(store as any)
  return { input, store }
}

beforeEach(() => {
  history.replaceState({}, '', '/')
  frames = new Map()
  let id = 0
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++id, callback)
    return id
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  jest.spyOn(document, 'hasFocus').mockReturnValue(true)
})
afterEach(() => {
  stop?.()
  stop = undefined
  document.body.replaceChildren()
  jest.restoreAllMocks()
})

it.each([false, true])(
  'respects autofocus ON in lite=%s and applies it only once',
  (lite) => {
    const { input, store } = setup(lite, true)
    flush()
    expect(input).toHaveFocus()
    expect(
      store.searchStore.resultFocusController.focusTab,
    ).not.toHaveBeenCalled()
    const other = document.querySelector('button')!
    other.focus()
    window.dispatchEvent(new Event('focus'))
    flush()
    expect(other).toHaveFocus()
  },
)

it('blocks native initial field focus with autofocus OFF in the full popup', () => {
  const { input, store } = setup(false, false)
  const focus = jest.fn()
  input.addEventListener('focusin', focus)
  input.focus()
  expect(input).not.toHaveFocus()
  expect(focus).not.toHaveBeenCalled()
  flush()
  expect(
    store.windowStore.focusActiveTabInLastFocusedWindow,
  ).toHaveBeenCalledWith({ reveal: true })
})

it('focuses lite search even when the full-view autofocus preference is OFF', () => {
  const { input, store } = setup(true, false)
  input.focus()
  expect(input).toHaveFocus()
  flush()
  expect(input).toHaveFocus()
  expect(
    store.searchStore.resultFocusController.focusTab,
  ).not.toHaveBeenCalled()
  expect(
    store.windowStore.focusActiveTabInLastFocusedWindow,
  ).not.toHaveBeenCalled()
})

it('waits for saved preferences and tabs before applying focus', () => {
  const { input, store } = setup(true, false, false)
  input.focus()
  flush()
  expect(input).not.toHaveFocus()
  expect(
    store.searchStore.resultFocusController.focusTab,
  ).not.toHaveBeenCalled()
  runInAction(() => {
    store.userStore.loaded = true
    store.windowStore.initialLoading = false
  })
  flush()
  expect(input).toHaveFocus()
})

it('falls back to main for an empty full workspace', () => {
  const { store } = setup(false, false)
  store.windowStore.focusActiveTabInLastFocusedWindow.mockReturnValue(undefined)
  flush()
  expect(document.querySelector('main')).toHaveFocus()
})

it('waits until the native popup actually has focus', () => {
  jest.mocked(document.hasFocus).mockReturnValue(false)
  const { input } = setup(true, true)
  flush()
  expect(input).not.toHaveFocus()
  jest.mocked(document.hasFocus).mockReturnValue(true)
  window.dispatchEvent(new Event('focus'))
  flush()
  expect(input).toHaveFocus()
})

it('removes the initial guard when the popup is hidden', () => {
  const { input, store } = setup(true, false)
  window.dispatchEvent(new Event('pagehide'))
  input.focus()
  flush()
  expect(input).toHaveFocus()
  expect(
    store.searchStore.resultFocusController.focusTab,
  ).not.toHaveBeenCalled()
})

it('leaves the full-tab and separate-window startup alone', () => {
  history.replaceState({}, '', '/?not_popup=1')
  const { input, store } = setup(true, false)
  input.focus()
  flush()
  expect(input).toHaveFocus()
  expect(
    store.searchStore.resultFocusController.focusTab,
  ).not.toHaveBeenCalled()
})
