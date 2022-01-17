import React from 'react'
import { connectDropTarget } from 'test'
import { render } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Tabs from 'components/Window/Tabs'

const tabs = [
  { id: 1, isVisible: true, setNodeRef: jest.fn() },
  { id: 2, isVisible: true, setNodeRef: jest.fn() },
  { id: 3 },
]
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
    showTabs: true,
  },
  dragPreview: 'preview node',
}

describe('Tabs', () => {
  it('render correct components', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <Tabs {...props} />
      </DndProvider>
    )
    expect(container).toMatchSnapshot()
  })

  it('does not render tab with isVisible = `false`', () => {
    const { container } = render(
      <Tabs
        {...props}
        win={{
          ...props.win,
          tabs: tabs.map((x) => ({ ...x, isVisible: false })),
        }}
      />
    )
    expect(container).toMatchSnapshot()
  })

  it('call requestAnimationFrame with windowStore.windowMounted', () => {
    const requestAnimationFrame = jest.fn(0)
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(requestAnimationFrame)
    render(
      <DndProvider backend={HTML5Backend}>
        <Tabs {...props} />
      </DndProvider>
    )
    expect(requestAnimationFrame.mock.calls.length).toBe(1)
  })
})
