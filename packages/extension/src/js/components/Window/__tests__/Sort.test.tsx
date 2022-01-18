import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import Sort from 'components/Window/Sort'
import * as StoreContext from 'components/hooks/useStore'
import { act } from 'react-dom/test-utils'

const id = 'id'
const sortTabs = jest.fn()
const props = {
  win: { id },
}
const mockStore = {
  arrangeStore: { sortTabs },
}

describe('Sort', () => {
  jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)

  it('should call arrangeStore.sortTabs', () => {
    render(<Sort {...props} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(sortTabs.mock.calls.length).toBe(1)
    expect(sortTabs.mock.calls[0]).toEqual([id])
    expect(screen.getByRole('button')).toMatchSnapshot()
  })

  it('should have correct tooltip', async () => {
    const { container } = render(<Sort {...props} />)
    const tooltip = screen.getByRole('button')
    act(() => {
      fireEvent(
        tooltip,
        new MouseEvent('mouseover', {
          bubbles: true,
        })
      )
    })

    // Wait for the tooltip to show up
    const tooltipText = await screen.findByRole('tooltip')
    expect(tooltipText).toBeInTheDocument()
    expect(tooltipText).toMatchSnapshot()
    expect(container).toMatchSnapshot()
  })
})
