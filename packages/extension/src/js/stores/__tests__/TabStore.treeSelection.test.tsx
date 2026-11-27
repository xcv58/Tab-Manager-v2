import type Store from 'stores'
import TabStore from 'stores/TabStore'
import type Tab from 'stores/Tab'

const setup = (active: boolean) => {
  const tabs = [1, 2, 3].map((id) => ({
    id,
    get isSelected() {
      return store.selection.has(id)
    },
  })) as Tab[]
  const win = {
    rows: [
      { kind: 'tab', tabId: 1 },
      { kind: 'group', tabIds: [2] },
      { kind: 'tab', tabId: 3 },
    ],
    getTabById: (id: number) => tabs.find((tab) => tab.id === id),
  }
  const store = new TabStore({
    windowStore: { tabs, windowsByColumn: [[win]] },
    treeStyleTabStore: { active },
  } as unknown as Store)
  return { store, tabs }
}

describe('Shift-click selection in a tree workspace', () => {
  it.each([
    [0, 2],
    [2, 0],
  ])('selects visible tabs between positions %s and %s', (from, to) => {
    const { store, tabs } = setup(true)
    store.select(tabs[from])
    store.bulkSelct(tabs[to])

    expect([...store.selection.keys()].sort()).toEqual([1, 3])
  })

  it('keeps the ordinary range behavior when tree mode is off', () => {
    const { store, tabs } = setup(false)
    store.select(tabs[0])
    store.bulkSelct(tabs[2])

    expect([...store.selection.keys()]).toEqual([1, 2, 3])
  })
})
