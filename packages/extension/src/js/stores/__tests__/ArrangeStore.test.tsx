import ArrangeStore from 'stores/ArrangeStore'
import { moveTabs } from 'libs'

jest.mock('libs', () => {
  const actual = jest.requireActual('libs')
  return {
    ...actual,
    moveTabs: jest.fn(),
  }
})

describe('ArrangeStore', () => {
  it('domainTabsMap should skip grouped tabs', () => {
    const arrangeStore = new ArrangeStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            domain: 'https://a.com',
            groupId: -1,
          },
          {
            id: 2,
            domain: 'https://a.com',
            groupId: 999,
          },
          {
            id: 3,
            domain: 'https://b.com',
            groupId: -1,
          },
        ],
      },
    } as any)

    expect(Object.keys(arrangeStore.domainTabsMap).sort()).toEqual([
      'https://a.com',
      'https://b.com',
    ])
    expect(
      arrangeStore.domainTabsMap['https://a.com'].map((x) => x.id),
    ).toEqual([1])
  })

  it('sortInWindow should not reorder across group boundaries', async () => {
    const arrangeStore = new ArrangeStore({} as any)
    const win = {
      id: 1,
      tabs: [
        {
          id: 10,
          groupId: 100,
          pinned: false,
          domain: 'https://b.com',
          url: 'https://b.com',
          title: 'b',
          index: 1,
        },
        {
          id: 11,
          groupId: 100,
          pinned: false,
          domain: 'https://a.com',
          url: 'https://a.com',
          title: 'a',
          index: 2,
        },
        {
          id: 20,
          groupId: -1,
          pinned: false,
          domain: 'https://d.com',
          url: 'https://d.com',
          title: 'd',
          index: 3,
        },
        {
          id: 21,
          groupId: -1,
          pinned: false,
          domain: 'https://c.com',
          url: 'https://c.com',
          title: 'c',
          index: 4,
        },
      ],
    }

    await arrangeStore.sortInWindow([win as any])

    expect(moveTabs).toHaveBeenCalledTimes(2)
    expect((moveTabs as jest.Mock).mock.calls[0][0].map((x) => x.id)).toEqual([
      11, 10,
    ])
    expect((moveTabs as jest.Mock).mock.calls[1][0].map((x) => x.id)).toEqual([
      21, 20,
    ])
  })
})
