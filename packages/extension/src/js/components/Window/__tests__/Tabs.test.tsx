import React from 'react'
import { connectDropTarget } from 'test'
import { render } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Tabs from 'components/Window/Tabs'

const tabs = [
  {
    id: 1,
    isVisible: true,
    setNodeRef: jest.fn(),
    unhover: jest.fn(),
    hover: jest.fn(),
  },
  {
    id: 2,
    isVisible: true,
    setNodeRef: jest.fn(),
    unhover: jest.fn(),
    hover: jest.fn(),
  },
  { id: 3 },
]
const getRows = (inputTabs = tabs) =>
  inputTabs
    .filter((x) => x.isVisible)
    .map((x) => ({
      kind: 'tab' as const,
      tabId: x.id,
      windowId: 1,
      groupId: -1,
      hiddenByCollapse: false,
    }))
const renderTabs = (win = props.win) =>
  render(
    <DndProvider backend={HTML5Backend}>
      <Tabs {...props} win={win} />
    </DndProvider>,
  )
const windowMounted = jest.fn()
const props = {
  connectDropTarget,
  dragStore: {
    drop: jest.fn(),
  },
  windowStore: {
    windowMounted,
  },
  win: {
    tabs,
    rows: getRows(),
    getTabById: (tabId) => tabs.find((x) => x.id === tabId),
    showTabs: true,
  },
  dragPreview: 'preview node',
}

describe('Tabs', () => {
  it('render correct components', () => {
    const { container } = renderTabs()
    expect(container).toMatchSnapshot()
  })

  it('does not render tab with isVisible = `false`', () => {
    const { container } = render(
      <Tabs
        {...props}
        win={{
          ...props.win,
          tabs: tabs.map((x) => ({ ...x, isVisible: false })),
          rows: [],
          getTabById: () => null,
        }}
      />,
    )
    expect(container).toMatchSnapshot()
  })

  it('does not render active indicator when the window has only one tab', () => {
    const singleTab = {
      id: 1,
      active: true,
      isVisible: true,
      setNodeRef: jest.fn(),
      unhover: jest.fn(),
      hover: jest.fn(),
    }
    const win = {
      ...props.win,
      tabs: [singleTab],
      rows: getRows([singleTab]),
      getTabById: () => singleTab,
    }
    singleTab.win = win

    const { container } = renderTabs(win)

    expect(
      container.querySelector(
        `[data-testid="tab-active-indicator-${singleTab.id}"]`,
      ),
    ).toBeNull()
  })

  it('call requestAnimationFrame with windowStore.windowMounted', () => {
    const requestAnimationFrame = jest.fn(0)
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(requestAnimationFrame)
    render(
      <DndProvider backend={HTML5Backend}>
        <Tabs {...props} />
      </DndProvider>,
    )
    expect(requestAnimationFrame.mock.calls.length).toBe(1)
  })
})
