import HoverStore from '../HoverStore'

const createStore = () => {
  const tabs = new Map([1, 2].map((id) => [id, { setHovered: jest.fn() }]))
  return new HoverStore({
    userStore: { showTabTooltip: true },
    windowStore: { windows: [{ getTabById: (id) => tabs.get(id) }] },
  } as any)
}

describe('Interactive tab tooltip ownership', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('allows crossing the gap, holding the card, and then leaving it', () => {
    const hover = createStore()
    hover.hover(1)
    jest.advanceTimersByTime(1000)
    hover.unhover(1)
    jest.advanceTimersByTime(100)
    expect(hover.hovered).toBe(true)
    hover.holdTooltip(1)
    jest.advanceTimersByTime(2000)
    expect(hover.hoveredTabId).toBe(1)
    expect(hover.hovered).toBe(true)
    hover.releaseTooltip(1)
    jest.advanceTimersByTime(500)
    expect(hover.hoveredTabId).toBeNull()
    expect(hover.hovered).toBe(false)
  })

  it('does not let stale row cleanup dismiss a newer card', () => {
    const hover = createStore()
    hover.openTooltip(1)
    hover.openTooltip(2)
    hover.unhover(1)
    hover.hideTooltip(1)
    jest.advanceTimersByTime(2000)
    expect(hover.hoveredTabId).toBe(2)
    expect(hover.hovered).toBe(true)
  })

  it('keeps the card open when repositioning returns the pointer to its row', () => {
    const hover = createStore()
    hover.openTooltip(1)
    hover.holdTooltip(1)
    hover.releaseTooltip(1, true)
    jest.advanceTimersByTime(1000)
    expect(hover.hovered).toBe(true)
    hover.unhover(1)
    jest.advanceTimersByTime(500)
    expect(hover.hovered).toBe(false)
  })

  it('cancels pending opening when the row is left before the hover delay', () => {
    const hover = createStore()
    hover.hover(1)
    hover.unhover(1)
    jest.advanceTimersByTime(2000)
    expect(hover.hovered).toBe(false)
    expect(hover.hoveredTabId).toBeNull()
  })

  it('does not replace an interactive card when resizing exposes another row', () => {
    const hover = createStore()
    hover.openTooltip(1, true)
    hover.holdTooltip(1)
    hover.hover(2)
    jest.advanceTimersByTime(2000)
    expect(hover.hoveredTabId).toBe(1)
    expect(hover.keyboardEntry).toBe(true)
    hover.releaseTooltip(1)
    jest.advanceTimersByTime(500)
    hover.hover(2)
    jest.advanceTimersByTime(1000)
    expect(hover.hoveredTabId).toBe(2)
  })

  it('isolates search details from cleanup of the same tab in the window list', () => {
    const hover = createStore()
    hover.openTooltip(1, true, 'search')
    hover.holdTooltip(1, 'search')
    hover.unhover(1)
    hover.hideTooltip(1, 'list')
    jest.advanceTimersByTime(2000)
    expect(hover.hoveredTabId).toBe(1)
    expect(hover.hoveredSurface).toBe('search')
    expect(hover.hovered).toBe(true)
    hover.hideTooltip(1, 'search')
    expect(hover.hovered).toBe(false)
  })

  it('allows explicit keyboard entry to replace a held card', () => {
    const hover = createStore()
    hover.openTooltip(1, true)
    hover.holdTooltip(1)
    hover.openTooltip(2, true, 'search')
    expect(hover.hoveredTabId).toBe(2)
    expect(hover.hoveredSurface).toBe('search')
    expect(hover.hovered).toBe(true)
  })
})
