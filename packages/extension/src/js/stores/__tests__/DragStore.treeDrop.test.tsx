import DragStore from 'stores/DragStore'
import type Store from 'stores'
import type Tab from 'stores/Tab'

const makeTab = (id: number, windowId: number, properties = {}) =>
  ({
    id,
    windowId,
    index: 0,
    groupId: -1,
    win: { canDrop: true, incognito: false },
    ...properties,
  }) as Tab

const setup = (sources: Tab[], targetAncestors: number[] = []) => {
  const attachTabs = jest.fn().mockResolvedValue(true)
  const dragStore = new DragStore({
    tabStore: {
      sources,
      selection: new Map(sources.map((tab) => [tab.id, tab])),
    },
    tabGroupStore: {
      getTabsForGroup: (id: number) =>
        sources.filter((tab) => tab.groupId === id),
    },
    treeStyleTabStore: {
      active: true,
      attachTabs,
      getTreeInfo: (id: number) => ({
        ancestorIds: id === 3 ? targetAncestors : [],
      }),
    },
  } as unknown as Store)
  const dropAt = jest.spyOn(dragStore, 'dropAt').mockResolvedValue(undefined)
  return { dragStore, attachTabs, dropAt }
}

describe('Tree Style Tab drops', () => {
  it.each([
    {
      sources: [makeTab(1, 1)],
      target: makeTab(3, 2, { pinned: true }),
      ancestors: [],
      hint: 'Pinned tabs',
    },
    {
      sources: [makeTab(1, 1, { pinned: true })],
      target: makeTab(3, 2),
      ancestors: [],
      hint: 'Pinned tabs',
    },
    {
      sources: [makeTab(1, 1), makeTab(2, 2)],
      target: makeTab(3, 1),
      ancestors: [1],
      hint: 'outside the dragged tree',
    },
    {
      sources: [makeTab(1, 1, { groupId: 10 })],
      target: makeTab(3, 2, { groupId: 20 }),
      ancestors: [],
      hint: 'Move the tab group',
    },
  ])(
    'rejects an unsafe drop before moving any tabs ($hint)',
    async ({ sources, target, ancestors, hint }) => {
      const { dragStore, dropAt, attachTabs } = setup(sources, ancestors)

      await expect(dragStore.dropIntoTreeTab(target)).resolves.toContain(hint)

      expect(dropAt).not.toHaveBeenCalled()
      expect(attachTabs).not.toHaveBeenCalled()
    },
  )

  it('still nests ungrouped tabs across windows', async () => {
    const { dragStore, dropAt, attachTabs } = setup([makeTab(1, 1)])

    await expect(
      dragStore.dropIntoTreeTab(makeTab(3, 2)),
    ).resolves.toBeUndefined()

    expect(dropAt).toHaveBeenCalledWith(
      expect.objectContaining({ windowId: 2 }),
    )
    expect(attachTabs).toHaveBeenCalledWith(3, [1])
  })
})
