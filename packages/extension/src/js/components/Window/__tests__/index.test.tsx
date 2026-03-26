import React from 'react'
import { connectDropTarget } from 'test'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Window from 'components/Window'
import { createTheme } from '@mui/material/styles'
import { render } from '@testing-library/react'

jest.mock('../Tabs', () => 'tabs')

const theme = createTheme()
const tabs = [{ id: 1 }, { id: 2 }]
const props = {
  connectDropTarget,
  dragStore: {
    drop: jest.fn(),
  },
  win: {
    tabs,
    showTabs: true,
  },
  width: '100%',
  theme,
}

describe('Window', () => {
  it('render correct components', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <Window {...props} />
      </DndProvider>
    )
    expect(container).toMatchSnapshot()
  })

  it.skip('render error.light backgroundColor if canDrop is false', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <Window {...props} isDragging isOver canDrop={false} />
      </DndProvider>
    )
    expect(container).toMatchSnapshot()
    // expect(el.find(Title).length).toBe(1)
    // expect(el.find(Tabs).length).toBe(1)
    // expect(el.find('div').props().style.backgroundColor).toBe(
    //   theme.palette.error.light
    // )
  })

  it.skip('render Preview based on canDrop & isOver', () => {
    const { container } = render(<Window {...props} canDrop isOver />)
    expect(container).toMatchSnapshot()

    // expect(el.find(Preview).length).toBe(0)
    // el = render(<Window {...props} isOver />)
    // expect(el.find(Preview).length).toBe(0)
    // el = render(<Window {...props} canDrop />)
    // expect(el.find(Preview).length).toBe(0)
    // el = render(<Window {...props} canDrop isOver />)
    // expect(el.find(Preview).length).toBe(1)
  })

  // it.skip('render correct elevation based on lastFocused', () => {
  //   let el = render(<Window {...props} />)
  //   expect(el.find(Paper).props().elevation).toBe(2)
  //   el = render(<Window {...props} win={{ lastFocused: true }} />)
  //   expect(el.find(Paper).props().elevation).toBe(16)
  // })
})
