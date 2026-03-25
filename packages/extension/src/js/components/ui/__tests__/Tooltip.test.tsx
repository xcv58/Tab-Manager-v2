import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tooltip from '../Tooltip'

describe('Tooltip', () => {
  it('renders when controlled open is true', async () => {
    const { rerender } = render(
      <Tooltip open title="Tab tooltip">
        <button type="button">Tab row</button>
      </Tooltip>,
    )

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Tab tooltip')

    rerender(
      <Tooltip open={false} title="Tab tooltip">
        <button type="button">Tab row</button>
      </Tooltip>,
    )

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  it('still supports hover-driven visibility when uncontrolled', async () => {
    render(
      <Tooltip title="Hover tooltip">
        <button type="button">Hover target</button>
      </Tooltip>,
    )

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Hover target' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Hover tooltip',
    )
  })
})
