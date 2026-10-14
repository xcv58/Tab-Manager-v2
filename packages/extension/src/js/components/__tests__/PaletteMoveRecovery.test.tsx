import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import { withActionStore } from '__testutils__/actionStore'
import CommandPalette from '../CommandPalette'

const setup = () => {
  const source = {
    id: 1,
    windowId: 7,
    index: 0,
    title: 'Source',
    url: 'https://source.example.test/',
    incognito: false,
    pinned: false,
  }
  const destination = {
    id: 2,
    windowId: 7,
    index: 1,
    title: 'Destination',
    url: 'https://destination.example.test/',
    incognito: false,
    pinned: false,
    groupId: -1,
  }
  const win = {
    id: 7,
    tabs: [source, destination],
    canDrop: true,
    incognito: false,
  }
  const selection = new Map([[source.id, source]])
  const store = withActionStore({
    tabStore: {
      selection,
      get sources() {
        return [...selection.values()]
      },
      unselectAll: () => selection.clear(),
      selectAll: (tabs) => tabs.forEach((tab) => selection.set(tab.id, tab)),
    },
    focusStore: {
      focusedTab: { ...destination, win },
      focusedItem: destination,
      focusedWindow: win,
    },
    windowStore: {
      windows: [win],
      tabs: [source, destination],
      getDuplicateTabsToRemoveCount: () => 0,
      syncAllWindows: jest.fn().mockResolvedValue(undefined),
    },
    dragStore: {
      dragging: false,
      pendingWindowEdgeDrop: false,
      moveSelectedTabsRelativeToTab: jest
        .fn()
        .mockResolvedValue('Couldn’t move these tabs.'),
    },
    tabGroupStore: { tabGroupMap: new Map(), getTabGroup: () => null },
    searchStore: { matchedTabs: [source, destination], focus: jest.fn() },
    userStore: {
      showTabTooltip: true,
      theme: 'system',
      selectNextTheme: jest.fn(),
    },
    arrangeStore: {},
    hiddenWindowStore: {},
  })
  store.actionStore.openPalette()
  render(
    <StoreContext.Provider value={store}>
      <CommandPalette />
    </StoreContext.Provider>,
  )
  return { store, source, destination, selection, actions: store.actionStore }
}

describe('palette move recovery', () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = jest.fn()
  })
  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView
  })
  afterEach(() => jest.restoreAllMocks())

  it('keeps selection, focuses Retry, and retries against refreshed browser data', async () => {
    const { store, actions, selection } = setup()
    fireEvent.click(screen.getByRole('option', { name: /before this tab/ }))
    await screen.findByRole('alert')
    const retry = screen.getByRole('button', { name: 'Retry', exact: true })
    await waitFor(() => expect(retry).toHaveFocus())
    expect(selection.size).toBe(1)
    expect(actions.paletteOpen).toBe(true)
    store.dragStore.moveSelectedTabsRelativeToTab.mockResolvedValue(undefined)
    fireEvent.click(retry)
    await waitFor(() => expect(actions.paletteOpen).toBe(false))
    expect(store.windowStore.syncAllWindows).toHaveBeenCalledTimes(1)
    expect(store.dragStore.moveSelectedTabsRelativeToTab).toHaveBeenCalledTimes(
      2,
    )
  })

  it('offers another destination when the original tab disappeared', async () => {
    const { store, actions, source, selection } = setup()
    store.dragStore.moveSelectedTabsRelativeToTab.mockImplementation(
      async () => {
        store.windowStore.tabs = [source]
        return 'That destination is no longer available.'
      },
    )
    fireEvent.click(screen.getByRole('option', { name: /before this tab/ }))
    await screen.findByRole('alert')
    expect(
      screen.queryByRole('button', { name: 'Retry', exact: true }),
    ).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose another destination' }),
    )
    expect(actions.choosingDestination).toBe(true)
    expect(selection.size).toBe(1)
  })

  it('Cancel dismisses the operation while retaining selected tabs', async () => {
    const { actions, selection } = setup()
    fireEvent.click(screen.getByRole('option', { name: /before this tab/ }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }))
    expect(actions.paletteOpen).toBe(false)
    expect(selection.size).toBe(1)
  })

  it('retry excludes tabs which disappeared during refresh', async () => {
    const { store, actions, selection } = setup()
    fireEvent.click(screen.getByRole('option', { name: /before this tab/ }))
    await screen.findByRole('alert')
    store.windowStore.syncAllWindows.mockImplementation(async () => {
      store.windowStore.tabs = []
    })
    await act(async () => actions.retryMove())
    expect(actions.error).toBe('These tabs are no longer available.')
    expect(
      screen.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeVisible()
    expect(selection.size).toBe(0)
    expect(store.dragStore.moveSelectedTabsRelativeToTab).toHaveBeenCalledTimes(
      1,
    )
  })
})
