import { planTabMove } from '../tabMovePlan'

describe('mixed pinned tab insertion boundaries', () => {
  const destination = [
    { id: 11, pinned: true },
    { id: 12, pinned: false },
    { id: 13, pinned: false },
  ]

  test('keeps the unpinned block before the requested destination after inserting a pin', () => {
    const sources = [
      { id: 1, pinned: true },
      { id: 3, pinned: false },
      { id: 4, pinned: false },
    ]
    expect(planTabMove(sources, destination, 2).map((tab) => tab.id)).toEqual([
      11, 1, 12, 3, 4, 13,
    ])
  })

  test('retains that boundary when a later selected pin precedes a placed tab', () => {
    const sources = [
      { id: 3, pinned: false },
      { id: 1, pinned: true },
      { id: 4, pinned: false },
    ]
    expect(planTabMove(sources, destination, 2).map((tab) => tab.id)).toEqual([
      11, 1, 12, 3, 4, 13,
    ])
  })

  test('keeps an explicit end boundary after a pin lands at the start', () => {
    const sources = [
      { id: 1, pinned: true },
      { id: 3, pinned: false },
    ]
    expect(
      planTabMove(sources, destination, destination.length).map(
        (tab) => tab.id,
      ),
    ).toEqual([11, 1, 12, 13, 3])
  })
})
