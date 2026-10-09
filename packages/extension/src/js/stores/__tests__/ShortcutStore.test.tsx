import ShortcutStore from 'stores/ShortcutStore'
import DragStore from 'stores/DragStore'

describe('ShortcutStore.stopCallback', () => {
  it.each([
    'alt+shift+up',
    'alt+shift+down',
    'alt+shift+left',
    'alt+shift+right',
    'm g g',
    'm shift+g',
    'm shift+p',
    'm p',
  ])(
    'restricts %s to window cards and blocks editable/menu contexts',
    (combo) => {
      const shortcutStore = new ShortcutStore({} as any)
      const card = document.createElement('div')
      card.dataset.testid = 'window-card-7'
      const button = document.createElement('button')
      const event = new KeyboardEvent('keydown')

      expect(shortcutStore.stopCallback(event, button as any, combo)).toBe(true)
      card.appendChild(button)
      expect(shortcutStore.stopCallback(event, button as any, combo)).toBe(
        false,
      )

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      card.appendChild(checkbox)
      expect(shortcutStore.stopCallback(event, checkbox, combo)).toBe(false)

      for (const tag of ['input', 'textarea', 'select']) {
        const editable = document.createElement(tag)
        card.appendChild(editable)
        expect(shortcutStore.stopCallback(event, editable as any, combo)).toBe(
          true,
        )
      }
      for (const attribute of ['contenteditable', 'role']) {
        const container = document.createElement('div')
        container.setAttribute(
          attribute,
          attribute === 'role' ? 'menu' : 'true',
        )
        container.appendChild(button)
        card.appendChild(container)
        expect(shortcutStore.stopCallback(event, button as any, combo)).toBe(
          true,
        )
      }
    },
  )

  it('rechecks a Vim sequence when focus enters a menu or editor between keys', () => {
    const shortcutStore = new ShortcutStore({} as any)
    const card = document.createElement('div')
    card.dataset.testid = 'window-card-7'
    const button = document.createElement('button')
    card.appendChild(button)
    const event = new KeyboardEvent('keypress', { key: 'g' })
    expect(shortcutStore.stopCallback(event, button as any, 'g', 'm g g')).toBe(
      false,
    )

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    card.appendChild(menu)
    menu.appendChild(button)
    expect(shortcutStore.stopCallback(event, button as any, 'g', 'm g g')).toBe(
      true,
    )

    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    card.appendChild(editor)
    editor.appendChild(button)
    expect(shortcutStore.stopCallback(event, button as any, 'g', 'm g g')).toBe(
      true,
    )
  })

  it.each(['settings', 'help'])(
    'blocks move shortcuts while %s is open',
    (dialog) => {
      const shortcutStore = new ShortcutStore({
        userStore: { dialogOpen: dialog === 'settings' },
      } as any)
      shortcutStore.dialogOpen = dialog === 'help'
      const card = document.createElement('div')
      card.dataset.testid = 'window-card-7'
      const button = document.createElement('button')
      card.appendChild(button)
      expect(
        shortcutStore.stopCallback(
          new KeyboardEvent('keydown'),
          button as any,
          'alt+shift+down',
        ),
      ).toBe(true)
      expect(
        shortcutStore.stopCallback(
          new KeyboardEvent('keypress'),
          button as any,
          'g',
          'm g g',
        ),
      ).toBe(true)
    },
  )

  it('suppresses global shortcuts while focus is inside a menu', () => {
    const shortcutStore = new ShortcutStore({} as any)
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const menuItem = document.createElement('button')
    menuItem.setAttribute('role', 'menuitem')
    menu.appendChild(menuItem)
    document.body.appendChild(menu)

    expect(
      shortcutStore.stopCallback(
        new KeyboardEvent('keydown', { key: ' ' }),
        menuItem as any,
        'space',
      ),
    ).toBe(true)

    menu.remove()
  })

  it('still allows shortcuts from the focused tab content button', () => {
    const shortcutStore = new ShortcutStore({} as any)
    const tabButton = document.createElement('button')

    expect(
      shortcutStore.stopCallback(
        new KeyboardEvent('keydown', { key: ' ' }),
        tabButton as any,
        'space',
      ),
    ).toBe(false)
  })

  it('suppresses global shortcuts while the settings dialog is open', () => {
    const shortcutStore = new ShortcutStore({
      userStore: { dialogOpen: true },
    } as any)
    const settingsButton = document.createElement('button')

    expect(
      shortcutStore.stopCallback(
        new KeyboardEvent('keydown', { key: 'ArrowDown' }),
        settingsButton as any,
        'down',
      ),
    ).toBe(true)
    expect(
      shortcutStore.stopCallback(
        new KeyboardEvent('keydown', { key: 'Escape' }),
        settingsButton as any,
        'escape',
      ),
    ).toBe(false)
    expect(
      shortcutStore.stopCallback(
        new KeyboardEvent('keydown', { key: '?' }),
        settingsButton as any,
        '?',
      ),
    ).toBe(false)
  })
})

describe('ShortcutStore selected-tab moves', () => {
  const setup = () => {
    const source = { id: 1, incognito: false }
    const win = { id: 7, canDrop: true, incognito: false }
    const target = { id: 9, win }
    const store = {
      tabStore: { selection: new Map([[source.id, source]]) },
      focusStore: { focusedWindow: win, focusedTab: target },
    } as any
    const mocks = {
      moveSelectedTabsToWindowEdge: jest.fn().mockResolvedValue(undefined),
      drop: jest.fn().mockResolvedValue(undefined),
      showMoveHint: jest.fn(),
    }
    store.dragStore = new DragStore(store)
    // MobX wraps assigned functions; keep the original mocks for assertions.
    store.dragStore.moveSelectedTabsToWindowEdge =
      mocks.moveSelectedTabsToWindowEdge
    store.dragStore.drop = mocks.drop
    const shortcutStore = new ShortcutStore(store)
    shortcutStore.showMoveHint = mocks.showMoveHint
    return { shortcutStore, store, win, target, mocks }
  }

  it.each(['beginning', 'end'] as const)(
    'moves to the focused window %s',
    async (position) => {
      const { shortcutStore, mocks } = setup()
      await shortcutStore.moveSelectedTabs(position)
      expect(mocks.moveSelectedTabsToWindowEdge).toHaveBeenCalledWith(
        7,
        position,
      )
      expect(mocks.showMoveHint).not.toHaveBeenCalled()
    },
  )

  it.each(['before', 'after'] as const)(
    'moves %s the focused unselected tab',
    async (position) => {
      const { shortcutStore, target, mocks } = setup()
      await shortcutStore.moveSelectedTabs(position)
      expect(mocks.drop).toHaveBeenCalledWith(target, position === 'before')
      expect(mocks.showMoveHint).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['beginning', 'empty', 'Select tabs to move'],
    ['beginning', 'no-window', 'Focus a destination window or tab'],
    ['end', 'unsupported', 'Cannot move tabs to this window'],
    ['end', 'private', 'Cannot move tabs between regular and private windows'],
    ['before', 'no-tab', 'Focus a destination tab'],
    ['after', 'selected-target', 'Choose an unselected destination tab'],
  ] as const)(
    'explains %s rejection for %s without moving',
    async (position, scenario, hint) => {
      const { shortcutStore, store, win, target, mocks } = setup()
      if (scenario === 'empty') store.tabStore.selection.clear()
      if (scenario === 'no-window') store.focusStore.focusedWindow = null
      if (scenario === 'unsupported') win.canDrop = false
      if (scenario === 'private') win.incognito = true
      if (scenario === 'no-tab') store.focusStore.focusedTab = null
      if (scenario === 'selected-target') {
        store.tabStore.selection.set(target.id, target)
      }

      await shortcutStore.moveSelectedTabs(position)

      expect(mocks.showMoveHint).toHaveBeenCalledWith(hint)
      expect(mocks.moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
      expect(mocks.drop).not.toHaveBeenCalled()
    },
  )

  it('ignores repeats while a move is pending', async () => {
    const { shortcutStore, store, mocks } = setup()
    store.dragStore.pendingWindowEdgeDrop = true
    await shortcutStore.moveSelectedTabs('end')
    await shortcutStore.moveSelectedTabs('after')
    expect(mocks.moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    expect(mocks.drop).not.toHaveBeenCalled()
    expect(mocks.showMoveHint).not.toHaveBeenCalled()
  })
})
