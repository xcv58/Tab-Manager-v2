import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import CloseButton from 'components/CloseButton'

const props = {
  onClick: jest.fn(),
}

describe('CloseButton', () => {
  it('should render correct components', () => {
    render(<CloseButton {...props} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Close' })).toMatchSnapshot()
  })

  it('should honor disabled', () => {
    render(<CloseButton {...props} disabled />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close' })).toMatchSnapshot()
  })

  it('should call onClick', () => {
    const onClick = jest.fn()
    render(<CloseButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick.mock.calls.length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick.mock.calls.length).toBe(2)
  })
})
