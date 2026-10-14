import { withActionStore } from '__testutils__/actionStore'

const setup = () => {
  const tab = {
    id: 1,
    title: 'Research',
    url: 'https://example.com',
    pinned: false,
  }
  const store = withActionStore({
    tabStore: { selection: new Map([[tab.id, tab]]), sources: [tab] },
    focusStore: { focusedTab: tab },
    windowStore: { windows: [], getDuplicateTabsToRemoveCount: () => 0 },
    arrangeStore: {},
    searchStore: { matchedTabs: [tab] },
    userStore: { theme: 'system', selectNextTheme: jest.fn() },
    copyTabs: jest.fn().mockResolvedValue(undefined),
    exportTabs: jest.fn().mockResolvedValue(undefined),
  })
  const actions = store.actionStore
  store.copyTabs.mockImplementation(async () => actions.showFeedback('Copied'))
  store.exportTabs.mockImplementation(async () =>
    actions.showFeedback('Exported'),
  )
  return { store, actions, tab }
}

describe('palette focus restoration', () => {
  let nextFrame: FrameRequestCallback
  beforeEach(() => {
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        nextFrame = callback
        return 1
      })
  })
  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const makeRow = (tabId: number) => {
    const row = document.createElement('div')
    row.dataset.testid = `search-tab-row-${tabId}`
    row.tabIndex = -1
    const button = document.createElement('button')
    button.setAttribute('aria-haspopup', 'dialog')
    row.append(button)
    document.body.append(row)
    return { row, button }
  }

  it.each(['menu', 'row', 'button'])(
    'returns to a recreated collapsed-group result opened from its %s',
    (opener) => {
      const { store, actions, tab } = setup()
      store.focusStore.focusedItem = { nodeRef: { current: null } }
      const original = makeRow(tab.id)
      if (opener === 'menu')
        actions.openMenu({ key: `search-tab-${tab.id}`, element: original.row })
      else (opener === 'button' ? original.button : original.row).focus()
      actions.openPalette()
      original.row.remove()
      actions.closePalette()
      // React creates a new row after closing, before the next animation frame.
      const replacement = makeRow(tab.id)
      nextFrame(0)
      expect(document.activeElement).toBe(
        opener === 'button' ? replacement.button : replacement.row,
      )
      expect(store.tabStore.selection.get(tab.id)).toBe(tab)
    },
  )

  it('falls back to search when the old result no longer exists', () => {
    const { store, actions, tab } = setup()
    const search = document.createElement('input')
    document.body.append(search)
    store.searchStore.searchEl = { current: search }
    const { row } = makeRow(tab.id)
    row.focus()
    actions.openPalette()
    row.remove()
    actions.closePalette()
    nextFrame(0)
    expect(document.activeElement).toBe(search)
  })

  it('does not steal focus if another overlay opens before restoration', () => {
    const { store, actions, tab } = setup()
    const { row } = makeRow(tab.id)
    row.focus()
    actions.openPalette()
    row.remove()
    actions.closePalette()
    makeRow(tab.id)
    store.userStore.dialogOpen = true
    nextFrame(0)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('ActionStore palette', () => {
  it.each(['csv', 'tsv', 'json', 'markdown'])(
    'copies %s while retaining the selection and picker',
    async (format) => {
      const { store, actions, tab } = setup()
      actions.openPalette()
      actions.chooseFormat('copy')
      const command = actions.commands.find(
        (item) => item.id === `copy-${format}`,
      )!

      await actions.execute(command)

      expect(store.copyTabs).toHaveBeenCalledWith([tab], format)
      expect(store.tabStore.selection.get(tab.id)).toBe(tab)
      expect(actions.paletteOpen).toBe(true)
      expect(actions.formatAction).toBe('copy')
      expect(actions.feedback).toBe('Copied')
      expect(command.icon).toBe(format)
      expect(command.label).toMatch(/^Copy (as|for) /)
    },
  )

  it.each(['csv', 'json'])(
    'exports %s while retaining the selection and picker',
    async (format) => {
      const { store, actions, tab } = setup()
      actions.openPalette()
      actions.chooseFormat('export')
      expect(actions.commands).toHaveLength(2)

      await actions.execute(
        actions.commands.find((item) => item.id === `export-${format}`)!,
      )

      expect(store.exportTabs).toHaveBeenCalledWith([tab], format)
      expect(store.tabStore.selection.get(tab.id)).toBe(tab)
      expect(actions.paletteOpen).toBe(true)
      expect(actions.feedback).toBe('Exported')
    },
  )

  it('explains unavailable formats when neither selection nor focus supplies tabs', async () => {
    const { store, actions } = setup()
    store.tabStore.selection.clear()
    store.focusStore.focusedTab = null
    actions.chooseFormat('copy')
    const command = actions.commands[0]

    await actions.execute(command)

    expect(command.disabledReason).toBe(
      'Select tabs or focus a tab, group or window',
    )
    expect(store.copyTabs).not.toHaveBeenCalled()
  })

  it('reports copy failures while keeping the picker available to retry', async () => {
    const { store, actions } = setup()
    store.copyTabs.mockRejectedValue(new Error('Clipboard denied'))
    actions.openPalette()
    actions.chooseFormat('copy')

    await actions.execute(actions.commands[0])

    expect(actions.busy).toBe(false)
    expect(actions.error).toMatch(/Could not complete/)
    expect(actions.paletteOpen).toBe(true)
    expect(store.tabStore.selection.size).toBe(1)
  })

  it('matches pin state and shows the current appearance with consistent copy symbols', () => {
    const { actions, store, tab } = setup()
    const command = (id: string) =>
      actions.commands.find((item) => item.id === id)!
    expect(command('pin-tab').icon).toBe('pin')
    tab.pinned = true
    expect(command('pin-tab')).toMatchObject({
      icon: 'unpin',
      label: 'Unpin this tab',
    })
    for (const [focused, selected] of [
      ['copy-tab', 'copy-selection'],
      ['copy-title-tab', 'copy-titles-selection'],
      ['copy-title-url-tab', 'copy-titles-urls-selection'],
    ]) {
      expect(command(focused).icon).toBe(command(selected).icon)
    }
    expect(command('theme')).toMatchObject({
      label: 'Change appearance',
      detail: 'Current: System',
    })
    store.userStore.theme = 'dark'
    expect(command('theme').detail).toBe('Current: Dark')
  })
})

test('focused copy formats work without changing selection', async () => {
  const { store, actions, tab } = setup()
  store.tabStore.selection.clear()
  actions.chooseFormat('copy')
  await actions.execute(
    actions.commands.find((command) => command.id === 'copy-json')!,
  )
  expect(store.copyTabs).toHaveBeenCalledWith([tab], 'json')
  expect(store.tabStore.selection.size).toBe(0)
})

test('tab details explains a hidden anchor and uses a mounted search result', () => {
  const { store, actions, tab } = setup()
  store.userStore.showTabTooltip = true
  const details = () =>
    actions.commands.find((item) => item.id === 'tab-details')!
  expect(details().disabledReason).toMatch(/Reveal this tab/)
  const row = document.createElement('div')
  row.dataset.testid = `search-tab-row-${tab.id}`
  const anchor = document.createElement('button')
  anchor.setAttribute('aria-haspopup', 'dialog')
  anchor.getClientRects = () =>
    [{ width: 200, height: 40 }] as unknown as DOMRectList
  row.append(anchor)
  document.body.append(row)
  expect(details().disabledReason).toBeUndefined()
  actions.openPalette()
  row.remove()
  expect(details().disabledReason).toBeUndefined()
  details().run()
  expect(store.hoverStore.openTooltip).toHaveBeenCalledWith(
    tab.id,
    true,
    'search',
  )
  actions.closePalette(false)
  expect(details().disabledReason).toMatch(/Reveal this tab/)
})

test('selection toggles describe focus, and group creation rejects invalid source sets', () => {
  const { store, actions, tab } = setup()
  store.focusStore.focusedItem = tab
  store.tabGroupStore = {
    canMutateGroups: () => true,
    getTabGroup: () => null,
    isNoGroupId: () => true,
    canCreateGroupFromTabs: (tabs) =>
      tabs.length >= 2 &&
      tabs.every((item) => item.windowId === tabs[0].windowId),
  }
  const command = (id) => actions.commands.find((item) => item.id === id)!
  expect(command('select-focused').label).toBe('Toggle selection for this tab')
  expect(command('create-group').disabledReason).toMatch(/at least two/)
  store.tabStore.sources = [
    { id: 1, windowId: 7 },
    { id: 2, windowId: 8 },
  ]
  expect(command('create-group').disabledReason).toMatch(/same window/)
  store.tabStore.sources[1].windowId = 7
  expect(command('create-group').disabledReason).toBeUndefined()
})
