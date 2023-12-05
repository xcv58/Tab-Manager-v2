import React from 'react'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import SelectAll from 'components/Window/SelectAll'
import { act } from 'react-dom/test-utils'

const id = 'id'
const toggleSelectAll = jest.fn()
const props = {
  win: {
    id,
    toggleSelectAll,
    allTabSelected: true,
    someTabSelected: false,
    disableSelectAll: false,
  },
}

describe('SelectAll', () => {
  it('should render correct components', () => {
    const { container } = render(<SelectAll {...props} />)
    expect(container).toMatchSnapshot()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('should render Tooltip content based on allTabSelected', async () => {
    render(<SelectAll {...props} />)
    let tooltip = screen.getByRole('checkbox')
    act(() => {
      fireEvent(
        tooltip,
        new MouseEvent('mouseover', {
          bubbles: true,
        }),
      )
    })
    let tooltipText = await screen.findByRole('tooltip')
    expect(tooltipText).toBeInTheDocument()
    expect(tooltipText).toMatchSnapshot()
    expect(tooltipText).toHaveTextContent('Unselect all tabs')
    cleanup()

    render(<SelectAll {...props} win={{ allTabSelected: false }} />)
    tooltip = screen.getByRole('checkbox')
    act(() => {
      fireEvent(
        tooltip,
        new MouseEvent('mouseover', {
          bubbles: true,
        }),
      )
    })
    tooltipText = await screen.findByRole('tooltip')
    expect(tooltipText).toBeInTheDocument()
    expect(tooltipText).toMatchSnapshot()
    expect(tooltipText).toHaveTextContent('Select all tabs')
  })

  it('should call toggleSelectAll when click', () => {
    render(<SelectAll {...props} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(toggleSelectAll.mock.calls.length).toBe(1)
  })
})
