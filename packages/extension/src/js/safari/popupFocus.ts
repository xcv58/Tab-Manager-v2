import { reaction } from 'mobx'
import { NOT_POPUP } from 'libs'
import type Store from 'stores'

// Safari can focus the first text field when its native popover is presented,
// even without HTML autofocus. Intercept that initial focus before React opens
// results or the browser paints a caret, then apply the saved preference once.
export const installSafariPopupFocus = (store: Store) => {
  if (new URLSearchParams(location.search).has(NOT_POPUP)) return

  let finished = false
  let frame = 0
  let disposeReady = () => {}
  const ready = () =>
    store.userStore.loaded && !store.windowStore.initialLoading

  const shouldFocusSearch = () =>
    store.userStore.litePopupMode || store.userStore.autoFocusSearch

  const stop = () => {
    finished = true
    cancelAnimationFrame(frame)
    disposeReady()
    window.removeEventListener('focus', schedule)
    window.removeEventListener('pagehide', stop)
    document.removeEventListener('visibilitychange', schedule)
    document.removeEventListener('focusin', guardInitialFocus, true)
    document.removeEventListener('keydown', preserveInteraction, true)
    document.removeEventListener('pointerdown', preserveInteraction, true)
  }
  const preserveInteraction = (event: Event) => {
    if (event.isTrusted) stop()
  }
  const apply = () => {
    if (finished || !ready() || !document.hasFocus()) return
    const input = store.searchStore.getSearchInputEl()
    if (!input) return
    stop()
    if (shouldFocusSearch()) {
      input.focus({ preventScroll: true })
      return
    }

    // Release Safari's automatic field focus before requesting the tab row;
    // normal focus protection deliberately preserves an active search field.
    input.blur()
    const { windowStore, focusStore } = store
    const active = windowStore.focusActiveTabInLastFocusedWindow({
      reveal: true,
    })
    if (active) return
    const first = windowStore.windows
      .filter((win) => !win.hide)
      .flatMap((win) => win.focusableRows)[0]
    if (first) {
      focusStore.focus(first, { reveal: true })
      return
    }
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
  }
  function guardInitialFocus(event: FocusEvent) {
    const target = event.target
    if (
      !finished &&
      target instanceof HTMLInputElement &&
      target.classList.contains('toolbar-search-field') &&
      (!store.userStore.loaded || !shouldFocusSearch())
    ) {
      // Native popover focus is not a user search request. A trusted key or
      // pointer event removes this guard before intentional focus is handled.
      event.stopImmediatePropagation()
      target.blur()
    }
    schedule()
  }
  function schedule() {
    if (
      finished ||
      !ready() ||
      !document.hasFocus() ||
      document.visibilityState !== 'visible'
    )
      return
    cancelAnimationFrame(frame)
    // Wait only for React's ready-state commit. Native field focus is guarded
    // synchronously, so it never needs a visible focus-then-blur correction.
    frame = requestAnimationFrame(apply)
  }

  window.addEventListener('focus', schedule)
  window.addEventListener('pagehide', stop)
  document.addEventListener('visibilitychange', schedule)
  document.addEventListener('focusin', guardInitialFocus, true)
  document.addEventListener('keydown', preserveInteraction, true)
  document.addEventListener('pointerdown', preserveInteraction, true)
  disposeReady = reaction(ready, schedule, { fireImmediately: true })
  return stop
}
