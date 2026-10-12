import Focusable from '../Focusable'
import FocusStore from '../FocusStore'
import SearchStore from '../SearchStore'
import type Store from 'stores'

it('shares React refs so unmounted nodes are released and have no stale geometry', () => {
  const model = new Focusable({} as Store)
  const ref = { current: document.createElement('div') }
  model.setNodeRef(ref)
  expect(model.nodeRef).toBe(ref)
  ref.current = null
  expect(model.nodeRef.current).toBeNull()
  expect(model.getBoundingClientRect()).toBeUndefined()
})

it('shares the workspace container ref and releases it after unmount', () => {
  const store = new FocusStore({} as Store)
  const ref = { current: document.createElement('div') }
  store.setContainerRef(ref)
  expect(store.containerRef).toBe(ref)
  ref.current = null
  expect(store.containerRef.current).toBeNull()
})

it('shares the search input ref and releases it after unmount', () => {
  const store = new SearchStore({} as Store)
  const ref = { current: document.createElement('input') }
  store.setSearchEl(ref)
  expect(store.searchEl).toBe(ref)
  ref.current = null
  expect(store.getSearchInputEl()).toBeNull()
})
