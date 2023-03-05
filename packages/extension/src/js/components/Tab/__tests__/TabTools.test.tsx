import React from 'react'
import TabTools from 'components/Tab/TabTools'
import * as StoreContext from 'components/hooks/useStore'
import { cleanup, render, screen } from '@testing-library/react'

jest.mock('components/Tab/TabMenu', () => 'TabMenu')
const classes = { root: 'root' }
const props = {
  classes,
  faked: false,
  tab: { isHovered: true, removing: false },
}
const mockStore = {
  dragStore: { dragging: false },
}

describe('TabTools', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('should render correct components', () => {
    const { container } = render(<TabTools {...props} />)
    expect(container).toMatchSnapshot()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should render null', () => {
    let { container } = render(<TabTools {...props} faked />)
    expect(container.firstChild).toBeNull()

    cleanup()
    container = render(
      <TabTools {...props} tab={{ isHovered: false }} />,
    ).container
    // expect(el.getElement()).toBe(null)
    expect(container.firstChild).toBeNull()

    jest
      .spyOn(StoreContext, 'useStore')
      .mockImplementation(() => ({ dragStore: { dragging: true } }))
    container = render(<TabTools {...props} />).container
    expect(container.firstChild).toBeNull()
  })
})
