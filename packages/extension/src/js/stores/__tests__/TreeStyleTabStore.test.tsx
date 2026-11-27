import { browser } from 'libs'
import TreeStyleTabStore from 'stores/TreeStyleTabStore'
import type Store from 'stores'

jest.mock('libs', () => ({ browser: { runtime: { sendMessage: jest.fn() } } }))

const sendMessage = browser.runtime.sendMessage as jest.Mock

const branch = (collapsed = false) => ({
  id: 1,
  states: collapsed ? ['subtree-collapsed'] : [],
  children: [{ id: 2, ancestorTabIds: [1] }],
})

const setup = () => {
  const tabs = [1, 2, 3].map((id) => ({ id, isMatched: true }))
  const repackLayout = jest.fn()
  const treeStore = new TreeStyleTabStore({
    userStore: { loaded: false, useTreeStyleTab: false },
    searchStore: { queryActive: false },
    windowStore: { windows: [{ id: 5, tabs }], repackLayout },
  } as unknown as Store)
  treeStore.setStatus('connected')
  return { treeStore, repackLayout }
}

describe('Tree Style Tab snapshots', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    sendMessage.mockReset()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('walks a roots-only reply and only repacks for a visibility change', async () => {
    const { treeStore, repackLayout } = setup()
    sendMessage.mockResolvedValueOnce([branch()])
    await treeStore['refresh']()

    expect(sendMessage).toHaveBeenCalledWith(expect.any(String), {
      type: 'get-light-tree',
      window: 5,
    })
    expect(treeStore.getTreeInfo(2)?.parentId).toBe(1)
    expect(repackLayout).not.toHaveBeenCalled()

    sendMessage.mockResolvedValueOnce([branch(), { id: 3 }])
    await treeStore['refresh']()
    expect(repackLayout).not.toHaveBeenCalled()

    sendMessage.mockResolvedValueOnce([branch(true), { id: 3 }])
    await treeStore['refresh']()
    expect(treeStore.isHiddenByCollapsedTree(2)).toBe(true)
    expect(repackLayout).toHaveBeenCalledTimes(1)
  })

  it('keeps an optimistic collapse when an older read completes', async () => {
    const { treeStore } = setup()
    sendMessage.mockResolvedValueOnce([branch()])
    await treeStore['refresh']()

    let finishRead: (value: unknown) => void
    sendMessage.mockReturnValueOnce(
      new Promise((resolve) => {
        finishRead = resolve
      }),
    )
    const olderRead = treeStore['refresh']()

    sendMessage.mockResolvedValueOnce(true)
    await treeStore.toggleTreeCollapsed(1)
    finishRead([branch()])
    await olderRead

    expect(treeStore.isHiddenByCollapsedTree(2)).toBe(true)
  })
})

describe('Tree Style Tab attachment', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    sendMessage.mockReset()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('attaches only the root and verifies its descendants in the reply', async () => {
    const { treeStore } = setup()
    sendMessage.mockResolvedValueOnce(true)
    sendMessage.mockResolvedValueOnce({ id: 3, children: [branch()] })

    await expect(treeStore.attachBranch(3, [1, 2])).resolves.toBe(true)
    expect(sendMessage.mock.calls.map(([, message]) => message)).toEqual([
      { type: 'attach', parent: 3, child: 1 },
      { type: 'get-light-tree', tab: 3 },
    ])
  })

  it('rejects an acknowledgement that did not preserve the branch', async () => {
    const { treeStore } = setup()
    sendMessage.mockResolvedValueOnce(true)
    sendMessage.mockResolvedValueOnce({ id: 3, children: [{ id: 1 }] })

    await expect(treeStore.attachBranch(3, [1, 2])).resolves.toBe(false)
  })
})
