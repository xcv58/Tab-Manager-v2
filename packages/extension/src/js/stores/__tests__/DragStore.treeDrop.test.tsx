import DragStore from 'stores/DragStore'
import type Store from 'stores'
import type Tab from 'stores/Tab'

const makeTab = (id: number, windowId = 1, properties = {}) =>
  ({
    id,
    windowId,
    index: id,
    groupId: -1,
    ...properties,
  }) as Tab

const setup = (
  tabs: Tab[],
  selectedIds: number[],
  ancestors: Record<number, number[]> = {},
) => {
  const sources = tabs.filter((tab) => selectedIds.includes(tab.id))
  const getTreeInfo = (id: number) => ({ ancestorIds: ancestors[id] ?? [] })
  const tabSnapshots = tabs.map((tab) => ({ ...tab }))
  for (const tab of tabs) {
    Object.assign(tab, {
      win: {
        canDrop: true,
        incognito: false,
        tabs: tabSnapshots.filter(
          (candidate) => candidate.windowId === tab.windowId,
        ),
      },
      treeInfo: getTreeInfo(tab.id),
    })
  }

  const attachBranch = jest.fn().mockResolvedValue(true)
  const getBranchIds = jest.fn(async (id: number) => [
    id,
    ...tabs
      .filter((tab) => getTreeInfo(tab.id).ancestorIds.includes(id))
      .map((tab) => tab.id),
  ])
  const selection = new Map(sources.map((tab) => [tab.id, tab]))
  const dragStore = new DragStore({
    tabStore: { sources, selection },
    treeStyleTabStore: {
      active: true,
      attachBranch,
      getBranchIds,
      getTreeInfo,
    },
  } as unknown as Store)
  const dropAt = jest.spyOn(dragStore, 'dropAt').mockResolvedValue(undefined)
  const getWindowTabsFromBrowser = jest
    .spyOn(dragStore, 'getWindowTabsFromBrowser')
    .mockImplementation(async (windowId) =>
      tabs.filter((tab) => tab.windowId === windowId),
    )

  return {
    dragStore,
    attachBranch,
    dropAt,
    getWindowTabsFromBrowser,
    getBranchIds,
    selection,
  }
}

describe('Tree Style Tab drops', () => {
  it.each([
    {
      source: makeTab(1),
      target: makeTab(3, 1, { pinned: true }),
      hint: 'Pinned tabs',
    },
    {
      source: makeTab(1, 1, { pinned: true }),
      target: makeTab(3),
      hint: 'Pinned tabs',
    },
    {
      source: makeTab(1),
      target: makeTab(3, 2),
      hint: 'same window',
    },
    {
      source: makeTab(1, 1, { groupId: 10 }),
      target: makeTab(3, 1, { groupId: 20 }),
      hint: 'same Firefox tab group',
    },
  ])(
    'leaves tabs untouched when the drop crosses a boundary ($hint)',
    async ({ source, target, hint }) => {
      const { dragStore, dropAt, attachBranch } = setup([source, target], [1])

      await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(hint)

      expect(dropAt).not.toHaveBeenCalled()
      expect(attachBranch).not.toHaveBeenCalled()
    },
  )

  it('leaves a mixed selection of independent branches untouched', async () => {
    const target = makeTab(3, 1, { groupId: 20 })
    const { dragStore, dropAt, attachBranch } = setup(
      [makeTab(1, 1, { groupId: 10 }), makeTab(2), target],
      [1, 2],
    )

    await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(
      'one tab or branch',
    )

    expect(dropAt).not.toHaveBeenCalled()
    expect(attachBranch).not.toHaveBeenCalled()
  })

  it('rejects a drop onto a descendant even when the descendant is unselected', async () => {
    const target = makeTab(3)
    const { dragStore, attachBranch } = setup([makeTab(1), target], [1], {
      3: [1],
    })

    await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(
      'outside the dragged tree',
    )
    expect(attachBranch).not.toHaveBeenCalled()
  })

  it('validates descendants against the same native group rule', async () => {
    const target = makeTab(3, 1, { groupId: 10 })
    const { dragStore, attachBranch } = setup(
      [makeTab(1, 1, { groupId: 10 }), makeTab(2, 1, { groupId: 20 }), target],
      [1],
      { 2: [1] },
    )

    await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(
      'same Firefox tab group',
    )
    expect(attachBranch).not.toHaveBeenCalled()
  })

  it('attaches the root once and includes unselected descendants in the plan', async () => {
    const target = makeTab(3)
    const { dragStore, dropAt, attachBranch, selection } = setup(
      [makeTab(1), makeTab(2), target, makeTab(4)],
      [1, 2],
      { 2: [1], 4: [2, 1] },
    )

    expect('branch' in dragStore.getTreeDropPlan(target)).toBe(true)
    await expect(dragStore.dropIntoTreeTab(target)).resolves.toBeUndefined()

    expect(dropAt).not.toHaveBeenCalled()
    expect(attachBranch).toHaveBeenCalledTimes(1)
    expect(attachBranch).toHaveBeenCalledWith(3, [1, 2, 4])
    expect(selection.size).toBe(0)
  })

  it('rejects a branch that gained a descendant after the preview', async () => {
    const target = makeTab(3)
    const { dragStore, attachBranch, getBranchIds } = setup(
      [makeTab(1), target],
      [1],
    )
    getBranchIds.mockResolvedValueOnce([1, 9])

    await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(
      'branch changed',
    )
    expect(attachBranch).not.toHaveBeenCalled()
  })

  it('rejects a destination whose native group changed after the preview', async () => {
    const target = makeTab(3)
    const { dragStore, attachBranch, getWindowTabsFromBrowser } = setup(
      [makeTab(1), target],
      [1],
    )
    getWindowTabsFromBrowser.mockResolvedValueOnce([
      makeTab(1),
      makeTab(3, 1, { groupId: 20 }),
    ])

    await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(
      'same Firefox tab group',
    )
    expect(attachBranch).not.toHaveBeenCalled()
  })

  it('keeps the selection and avoids browser moves when the companion rejects attachment', async () => {
    const target = makeTab(3)
    const { dragStore, dropAt, attachBranch, selection } = setup(
      [makeTab(1), target],
      [1],
    )
    attachBranch.mockResolvedValueOnce(false)

    await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(
      'could not attach',
    )
    expect(dropAt).not.toHaveBeenCalled()
    expect(selection.has(1)).toBe(true)
  })
})
