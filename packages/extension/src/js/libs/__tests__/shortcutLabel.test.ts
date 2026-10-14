import { formatShortcutLabel, matchesShortcutSearch } from 'libs/shortcutLabel'

describe('shortcut Help search', () => {
  afterEach(() => jest.restoreAllMocks())

  it.each(['MacIntel', 'Win32', 'Linux x86_64'])(
    'finds displayed shortcuts and raw bindings on %s',
    (platform) => {
      jest.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
      for (const shortcut of [
        'command+k',
        'alt+k',
        'alt+down',
        'alt+shift+up',
        'm shift+g',
      ]) {
        expect(
          matchesShortcutSearch(shortcut, formatShortcutLabel(shortcut)),
        ).toBe(true)
        expect(matchesShortcutSearch(shortcut, shortcut)).toBe(true)
      }
    },
  )

  it('matches either displayed alias, ignoring case and spacing', () => {
    jest.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    const keys = ['command+k', 'alt+k']
    expect(matchesShortcutSearch(keys, '⌘ + K')).toBe(true)
    expect(matchesShortcutSearch(keys, 'OPTION + k')).toBe(true)
    expect(matchesShortcutSearch(keys, 'command+k')).toBe(true)
    expect(matchesShortcutSearch(keys, 'ctrl+x')).toBe(false)
    expect(matchesShortcutSearch(keys, '')).toBe(true)
  })
})
