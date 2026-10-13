import ActionStore from 'stores/ActionStore'

/** Give component fixtures the same observable overlay owner as the app. */
export const withActionStore = (store: any) => {
  store.tabStore ??= { selection: new Map() }
  store.focusStore ??= { focus: jest.fn() }
  store.dragStore ??= { dragging: false }
  store.hoverStore ??= { hideTooltip: jest.fn() }
  store.userStore ??= { dialogOpen: false }
  store.shortcutStore ??= { dialogOpen: false, showMoveHint: jest.fn() }
  store.actionStore = new ActionStore(store)
  return store
}
