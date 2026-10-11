import { getDragPreviewLabel } from '../dragPreview'

describe('drag action preview', () => {
  it('restores the count when leaving the target or entering a different nested target', () => {
    const target = { targetId: 'header-end', destination: 'end' as const }
    expect(getDragPreviewLabel(5, 'header-end', target)).toBe(
      'Move 5 tabs to end',
    )
    expect(getDragPreviewLabel(5, null, target)).toBe('5 tabs')
    expect(getDragPreviewLabel(5, 'tab-row', target)).toBe('5 tabs')
  })

  it('updates the destination and supports a single tab', () => {
    expect(
      getDragPreviewLabel(1, 'header-beginning', {
        targetId: 'header-beginning',
        destination: 'beginning',
      }),
    ).toBe('Move 1 tab to beginning')
    expect(
      getDragPreviewLabel(17, 'new-window', {
        targetId: 'new-window',
        destination: 'new-window',
      }),
    ).toBe('Move 17 tabs to new window')
  })

  it('explains a blocked destination only while that target is active', () => {
    const target = {
      targetId: 'private-window',
      destination: 'end' as const,
      blockedHint: 'Cannot move tabs between regular and private windows',
    }
    expect(getDragPreviewLabel(5, 'private-window', target)).toBe(
      target.blockedHint,
    )
    expect(getDragPreviewLabel(5, null, target)).toBe('5 tabs')
  })
})
