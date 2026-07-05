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
    const contrastTokens = getTabRowColorTokens(false, 'classic', true) as any

    expect(tokens.hoverBackground).toBe('#edf5ff')
    expect(tokens.highlightedBackground).toBe('#e0eeff')
    expect(tokens.highlightedHoverBackground).toBe('#daeaff')
    expect(tokens.selectedBackground).toBe('#d4e7ff')
    expect(contrastTokens.hoverBackground).toBe('#eaf3ff')
    expect(contrastTokens.highlightedBackground).toBe('#d9ebff')
    expect(contrastTokens.highlightedHoverBackground).toBe('#cfe4ff')
    expect(contrastTokens.selectedBackground).toBe('#bed9ff')
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
    expect(defaultTokens.highlightedHoverBackground).toBe('#465d76')
    expect(contrastTokens.highlightedHoverBackground).toBe('#506a86')
    expect(contrastTokens.selectedBackground).toBe('#536d8a')
    expect(defaultTokens.hoverBackground).toBe('#1f2937')
    expect(contrastTokens.hoverBackground).toBe('#1f2937')
  })

  it('keeps modern highlighted hover states between highlight and selected strength', () => {
    const lightTokens = getTabRowColorTokens(false, 'modern') as any
    const darkContrastTokens = getTabRowColorTokens(true, 'modern', true) as any

    expect(lightTokens.highlightedBackground).toBe('rgba(26, 115, 232, 0.08)')
    expect(lightTokens.highlightedHoverBackground).toBe(
      'rgba(26, 115, 232, 0.11)',
    )
    expect(lightTokens.selectedBackground).toBe('rgba(26, 115, 232, 0.14)')
    expect(darkContrastTokens.highlightedBackground).toBe(
      'rgba(181, 199, 230, 0.24)',
    )
    expect(darkContrastTokens.highlightedHoverBackground).toBe(
      'rgba(181, 199, 230, 0.27)',
    )
    expect(darkContrastTokens.selectedBackground).toBe(
      'rgba(181, 199, 230, 0.3)',
    )
  })

  it('restores the exact classic focused-window shadow while keeping unfocused windows flat', () => {
    const tokens = getUiColorTokens(false, 'classic') as any

    expect(tokens.windowCardShadow).toBe('none')
    expect(tokens.windowCardShadowFocused).toBe(
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    )
  })
})
