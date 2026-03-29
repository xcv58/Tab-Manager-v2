import ShortcutStore from 'stores/ShortcutStore'

describe('ShortcutStore.stopCallback', () => {
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
