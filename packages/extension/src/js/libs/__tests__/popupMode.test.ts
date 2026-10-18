import { autorun } from 'mobx'
import { isPopupMode, setPopupModeOverride } from '../popupMode'
import { isLitePopupMode } from '../litePopup'
import SearchStore from 'stores/SearchStore'

it('uses the packaged page URL until a demo explicitly overrides the surface', () => {
  window.history.replaceState(null, '', '/?not_popup=1')
  expect(isPopupMode()).toBe(false)
  window.history.replaceState(null, '', '/?popup_preview=1')
  expect(isPopupMode()).toBe(true)
  expect(isLitePopupMode(false)).toBe(false)
})

it('updates popup layout and search-menu policy together without recreating stores', () => {
  window.history.replaceState(null, '', '/?not_popup=1')
  const search = new SearchStore({
    userStore: { showSearchResultMenu: false },
  } as any)
  const states: boolean[][] = []
  const dispose = autorun(() => {
    states.push([
      isPopupMode(),
      isLitePopupMode(true),
      search.searchResultMenuEnabled,
    ])
  })
  setPopupModeOverride(true)
  setPopupModeOverride(false)
  expect(states).toEqual([
    [false, false, false],
    [true, true, true],
    [false, false, false],
  ])
  dispose()
})

afterEach(() => window.history.replaceState(null, '', '/'))
