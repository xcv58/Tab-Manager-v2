import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Icon } from 'components/Tab/Icon'

const tab = {
  focus: jest.fn(),
  select: jest.fn(),
  iconUrl: 'url',
  isSelected: false,
  bulkSelect: jest.fn(),
}

const props = { tab }

describe('Icon', () => {
  it('should render correct component', () => {
    const { container } = render(<Icon {...props} />)
    expect(container).toMatchSnapshot()
  })

  it('should call correct function based on input', () => {
    render(<Icon {...props} />)
    fireEvent(
      screen.getByRole('checkbox'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: false,
      })
    )
    expect(tab.select.mock.calls.length).toBe(1)
    expect(tab.bulkSelect.mock.calls.length).toBe(0)

    fireEvent(
      screen.getByRole('checkbox'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      })
    )
    expect(tab.select.mock.calls.length).toBe(1)
    expect(tab.bulkSelect.mock.calls.length).toBe(1)

    fireEvent(
      screen.getByRole('checkbox'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      })
    )
    expect(tab.select.mock.calls.length).toBe(1)
    expect(tab.bulkSelect.mock.calls.length).toBe(2)
  })

  it('should always call select if the isSelected is true', () => {
    const select = jest.fn()
    const bulkSelect = jest.fn()
    render(<Icon tab={{ ...tab, select, bulkSelect, isSelected: true }} />)
    fireEvent(
      screen.getByRole('checkbox'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: false,
      })
    )
    expect(select.mock.calls.length).toBe(1)
    expect(bulkSelect.mock.calls.length).toBe(0)

    fireEvent(
      screen.getByRole('checkbox'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      })
    )
    expect(select.mock.calls.length).toBe(2)
    expect(bulkSelect.mock.calls.length).toBe(0)

    fireEvent(
      screen.getByRole('checkbox'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      })
    )
    expect(select.mock.calls.length).toBe(3)
    expect(bulkSelect.mock.calls.length).toBe(0)
  })
})
