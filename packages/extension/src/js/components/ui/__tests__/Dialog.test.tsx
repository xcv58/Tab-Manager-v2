import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Dialog from '../Dialog'

const createAnchorEl = () => {
  const anchorEl = document.createElement('button')
  anchorEl.textContent = 'Open dialog'
  document.body.appendChild(anchorEl)
  return anchorEl
}

describe('Dialog', () => {
  it('focuses the first focusable control, traps tab navigation, and restores focus on close', async () => {
    const anchorEl = createAnchorEl()

    const Example = () => {
      const [open, setOpen] = React.useState(true)
      return (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          data-testid="test-dialog"
        >
          <div>
            <button type="button">First action</button>
            <button type="button">Second action</button>
          </div>
        </Dialog>
      )
    }

    anchorEl.focus()
    render(<Example />)

    const firstButton = await screen.findByRole('button', {
      name: 'First action',
    })
    const secondButton = screen.getByRole('button', { name: 'Second action' })

    await waitFor(() => {
      expect(firstButton).toHaveFocus()
    })

    fireEvent.keyDown(firstButton, { key: 'Tab', shiftKey: true })
    expect(secondButton).toHaveFocus()

    fireEvent.keyDown(secondButton, { key: 'Tab' })
    expect(firstButton).toHaveFocus()

    fireEvent.keyDown(firstButton, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(anchorEl).toHaveFocus()
    })

    anchorEl.remove()
  })

  it('does not restore focus when disableRestoreFocus is enabled', async () => {
    const anchorEl = createAnchorEl()

    const Example = () => {
      const [open, setOpen] = React.useState(true)
      return (
        <Dialog open={open} disableRestoreFocus onClose={() => setOpen(false)}>
          <div>
            <button type="button">Only action</button>
          </div>
        </Dialog>
      )
    }

    anchorEl.focus()
    render(<Example />)

    const button = await screen.findByRole('button', { name: 'Only action' })
    await waitFor(() => {
      expect(button).toHaveFocus()
    })

    fireEvent.keyDown(button, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(anchorEl).not.toHaveFocus()
    })

    anchorEl.remove()
  })
})
