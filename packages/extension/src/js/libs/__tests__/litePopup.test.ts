import { isLitePopupMode, isLiteShortcut } from 'libs/litePopup'

describe('lite popup scope', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))
  it('applies the preference only to the browser popup', () => {
    expect(isLitePopupMode(true)).toBe(true)
    expect(isLitePopupMode(false)).toBe(false)
    window.history.replaceState(null, '', '/?not_popup=1')
    expect(isLitePopupMode(true)).toBe(false)
  })
  it('allows quick tab actions and blocks selection and organization shortcuts', () => {
    for (const key of [
      'escape',
      '/',
      '>',
      'enter',
      'p',
      'ctrl+p',
      'r',
      'd d',
      'c c',
      'c t',
      'alt+down',
      'ctrl+,',
    ])
      expect(isLiteShortcut(key)).toBe(true)
    for (const key of [
      'space',
      'shift+x',
      'ctrl+s',
      'ctrl+shift+s',
      '* a',
      'alt+shift+g',
      'm g g',
      'alt+shift+left',
      'c ,',
    ])
      expect(isLiteShortcut(key)).toBe(false)
  })
})
