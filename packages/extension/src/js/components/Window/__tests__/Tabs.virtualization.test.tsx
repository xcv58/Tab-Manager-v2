import React from 'react'
import { act, render } from '@testing-library/react'
import { observable, runInAction } from 'mobx'
import Tabs from '../Tabs'

let mockStore: any
jest.mock('components/hooks/useStore', () => ({
  useStore: () => mockStore,
  useTabHeight: () => 42,
}))
jest.mock('components/Tab/DraggableTab', () => ({
  __esModule: true,
  default: ({ tab }) => <div data-testid={`source-row-${tab.id}`} />,
}))
jest.mock('components/TabGroup/GroupRow', () => ({
  __esModule: true,
  default: ({ row }) => <div data-testid={`group-row-${row.groupId}`} />,
}))

it('keeps the source DOM node while scrolling without mounting the intervening tabs', () => {
  const range = observable({ start: 80, end: 83 })
  const tabs = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))
  const win = {
    id: 1,
    rows: tabs.map((tab) => ({ kind: 'tab', tabId: tab.id })),
    getTabById: (id) => tabs.find((tab) => tab.id === id),
  }
  mockStore = {
    windowStore: { getVisibleRowRange: () => range, windowMounted: () => {} },
    dragStore: { dragOriginWindowId: 1, dragOriginRowIndex: 81 },
  }
  const view = render(<Tabs win={win as any} />)
  const source = view.getByTestId('source-row-82')
  expect(
    view.container.querySelectorAll('[data-testid^="source-row-"]').length,
  ).toBe(3)
  act(() =>
    runInAction(() => {
      range.start = 0
      range.end = 3
    }),
  )
  expect(view.getByTestId('source-row-82')).toBe(source)
  expect(
    view.container.querySelectorAll('[data-testid^="source-row-"]').length,
  ).toBe(4)
})
