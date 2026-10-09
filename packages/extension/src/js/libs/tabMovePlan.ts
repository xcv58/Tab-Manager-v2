type MoveTab = { id: number; pinned?: boolean }

export const getTabMoveDestinationHint = (
  destination: { canDrop?: boolean; incognito?: boolean },
  sources: Iterable<{ incognito?: boolean }>,
): string | undefined => {
  if (destination.canDrop === false) {
    return 'Cannot move tabs to this window'
  }
  for (const tab of sources) {
    if (Boolean(tab.incognito) !== Boolean(destination.incognito)) {
      return 'Cannot move tabs between regular and private windows'
    }
  }
}

export const getTabInsertIndex = (
  tabs: Array<{ pinned?: boolean }>,
  tab: { pinned?: boolean },
  index: number,
) => {
  const pinnedCount = tabs.filter((item) => item.pinned).length
  const requested = index === -1 ? tabs.length : Math.max(0, index)
  return tab.pinned
    ? Math.min(requested, pinnedCount)
    : Math.min(tabs.length, Math.max(requested, pinnedCount))
}

export const planTabMove = <T extends MoveTab>(
  tabs: T[],
  destination: T[],
  from: number,
): T[] => {
  const movingIds = new Set(tabs.map((tab) => tab.id))
  // Insertion positions count only tabs that will remain in the destination.
  const planned = destination.filter((tab) => !movingIds.has(tab.id))
  const movingTabs =
    from === 0
      ? [
          ...tabs.filter((tab) => tab.pinned),
          ...tabs.filter((tab) => !tab.pinned),
        ]
      : tabs
  const placedIds = new Set<number>()
  let cursor = from
  for (const tab of movingTabs) {
    const position = getTabInsertIndex(planned, tab, cursor)
    planned.splice(position, 0, tab)
    placedIds.add(tab.id)
    if (from !== -1) {
      // A later pin may land before an already placed unpinned tab.
      cursor = planned.reduce(
        (next, item, index) => (placedIds.has(item.id) ? index + 1 : next),
        0,
      )
    }
  }
  return planned
}
