import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppThemeContext, darkAppTheme } from 'libs/appTheme'
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

  it('only closes the topmost dialog on Escape when dialogs are stacked', async () => {
    const outerOnClose = jest.fn()

    const Example = () => {
      const [outerOpen, setOuterOpen] = React.useState(true)
      const [innerOpen, setInnerOpen] = React.useState(true)

      return (
        <>
          <Dialog
            open={outerOpen}
            onClose={() => {
              outerOnClose()
              setOuterOpen(false)
            }}
          >
            <div>
              <button type="button">Outer action</button>
            </div>
          </Dialog>
          <Dialog open={innerOpen} onClose={() => setInnerOpen(false)}>
            <div>
              <button type="button">Inner action</button>
            </div>
          </Dialog>
        </>
      )
    }

    render(<Example />)

    const innerButton = await screen.findByRole('button', {
      name: 'Inner action',
    })

    fireEvent.keyDown(innerButton, { key: 'Escape' })

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Inner action' }),
      ).not.toBeInTheDocument()
    })

    expect(
      screen.getByRole('button', { name: 'Outer action' }),
    ).toBeInTheDocument()
    expect(outerOnClose).not.toHaveBeenCalled()
  })

  it('uses the theme paper color by default when no inline background is provided', () => {
    render(
      <AppThemeContext.Provider value={darkAppTheme}>
        <Dialog open onClose={() => {}}>
          <div>Dialog body</div>
        </Dialog>
      </AppThemeContext.Provider>,
    )

    expect(screen.getByRole('dialog')).toHaveStyle(
      `background-color: ${darkAppTheme.palette.background.paper}`,
    )
    expect(screen.getByRole('dialog')).toHaveStyle(
      `color: ${darkAppTheme.palette.text.primary}`,
    )
  })
})
