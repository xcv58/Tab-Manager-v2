import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import CloseButton from 'components/CloseButton'

const props = {
  onClick: jest.fn(),
}

describe('CloseButton', () => {
  it('should render correct components', () => {
    render(<CloseButton {...props} />)
    expect(screen.getByRole('button')).toHaveTextContent('x')
    expect(screen.getByRole('button')).toBeEnabled()
    expect(screen.getByRole('button')).toMatchSnapshot()
  })

  it('should honor disabled', () => {
    render(<CloseButton {...props} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toMatchSnapshot()
  })

  it('should call onClick', () => {
    const onClick = jest.fn()
    render(<CloseButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick.mock.calls.length).toBe(1)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick.mock.calls.length).toBe(2)
  })
})
