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

  it('explains unavailable formats and does not copy without a selection', async () => {
    const { store, actions } = setup()
    store.tabStore.selection.clear()
    actions.chooseFormat('copy')
    const command = actions.commands[0]

    await actions.execute(command)

    expect(command.disabledReason).toBe('Select tabs first')
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
