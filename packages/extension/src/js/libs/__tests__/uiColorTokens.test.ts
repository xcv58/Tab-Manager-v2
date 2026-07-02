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

  it('raises muted text contrast while keeping classic active rows restrained', () => {
    const defaultTokens = getTabRowColorTokens(true, 'classic') as any
    const contrastTokens = getTabRowColorTokens(true, 'classic', true) as any

    expect(defaultTokens.mutedText).toBe('#9ca3af')
    expect(contrastTokens.mutedText).toBe('#cbd5e1')
    expect(defaultTokens.activeIndicatorWidth).toBe(3)
    expect(contrastTokens.activeIndicatorWidth).toBe(3)
    expect(defaultTokens.activeIndicatorSecondary).toBe(
      'rgba(181, 199, 230, 0.56)',
    )
    expect(contrastTokens.activeIndicatorSecondary).toBe(
      'rgba(199, 214, 237, 0.68)',
    )
    expect(defaultTokens.highlightedBackground).toBe('#425770')
    expect(contrastTokens.highlightedBackground).toBe('#465d76')
  })

  it('restores the exact classic focused-window shadow while keeping unfocused windows flat', () => {
    const tokens = getUiColorTokens(false, 'classic') as any

    expect(tokens.windowCardShadow).toBe('none')
    expect(tokens.windowCardShadowFocused).toBe(
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    )
  })
})
