import { getTabRowColorTokens, getUiColorTokens } from '../uiColorTokens'

describe('uiColorTokens', () => {
  it('keeps classic light chrome on a shared neutral surface', () => {
    const tokens = getUiColorTokens(false, 'classic') as any

    expect(tokens.appCanvasSurface).toBe(tokens.headerSurface)
    expect(tokens.appCanvasSurface).toBe(tokens.windowCardSurface)
    expect(tokens.appCanvasSurface).toBe(tokens.toolbarShellBackground)
    expect(tokens.appCanvasSurface).toBe(tokens.popupHeaderSurface)
    expect(tokens.rowSurface).toBe(tokens.appCanvasSurface)
  })

  it('uses the same active indicator colors across modern and classic', () => {
    const modern = getTabRowColorTokens(false, 'modern') as any
    const classic = getTabRowColorTokens(false, 'classic') as any

    expect(classic.activeIndicatorPrimary).toBe(modern.activeIndicatorPrimary)
    expect(classic.activeIndicatorSecondary).toBe(
      modern.activeIndicatorSecondary,
    )
  })

  it('keeps classic light highlight states in a stronger pale-blue range', () => {
    const tokens = getTabRowColorTokens(false, 'classic') as any

    expect(tokens.hoverBackground).toBe('#edf5ff')
    expect(tokens.highlightedBackground).toBe('#e0eeff')
    expect(tokens.selectedBackground).toBe('#d4e7ff')
  })
})
