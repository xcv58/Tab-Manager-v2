import { getUiColorTokens } from '../uiColorTokens'

describe('uiColorTokens', () => {
  it('keeps classic light chrome on a shared neutral surface', () => {
    const tokens = getUiColorTokens(false, 'classic') as any

    expect(tokens.appCanvasSurface).toBe(tokens.headerSurface)
    expect(tokens.appCanvasSurface).toBe(tokens.windowCardSurface)
    expect(tokens.appCanvasSurface).toBe(tokens.toolbarShellBackground)
    expect(tokens.appCanvasSurface).toBe(tokens.popupHeaderSurface)
    expect(tokens.rowSurface).toBe(tokens.appCanvasSurface)
  })
})
