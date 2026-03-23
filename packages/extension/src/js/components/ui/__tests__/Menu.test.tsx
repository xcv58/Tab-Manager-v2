import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppThemeContext, darkAppTheme, lightAppTheme } from 'libs/appTheme'
import Menu, { MenuDivider, MenuItem } from '../Menu'

const createAnchorEl = () => {
  const anchorEl = document.createElement('button')
  anchorEl.textContent = 'Open menu'
  anchorEl.getBoundingClientRect = () =>
    ({
      x: 24,
      y: 48,
      top: 48,
      left: 24,
      bottom: 88,
      right: 144,
      width: 120,
      height: 40,
      toJSON: () => ({}),
    }) as DOMRect
  document.body.appendChild(anchorEl)
  return anchorEl
}

describe('Menu', () => {
  it('focuses the first enabled item, supports arrow navigation, and restores focus on close', async () => {
    const anchorEl = createAnchorEl()

    const Example = () => {
      const [open, setOpen] = React.useState(true)
      return (
        <AppThemeContext.Provider value={lightAppTheme}>
          <Menu
            open={open}
            anchorEl={anchorEl}
            onClose={() => setOpen(false)}
            data-testid="test-menu"
          >
            <MenuItem>First action</MenuItem>
            <MenuItem disabled>Disabled action</MenuItem>
            <MenuItem>Second action</MenuItem>
          </Menu>
        </AppThemeContext.Provider>
      )
    }

    anchorEl.focus()
    render(<Example />)

    const menu = await screen.findByTestId('test-menu')
    const items = await screen.findAllByRole('menuitem')

    await waitFor(() => {
      expect(items[0]).toHaveFocus()
    })

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(items[2]).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'ArrowUp' })
    expect(items[0]).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'End' })
    expect(items[2]).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'Home' })
    expect(items[0]).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'Escape' })
    await waitFor(() => {
      expect(anchorEl).toHaveFocus()
    })

    anchorEl.remove()
  })

  it('uses theme surface, text, hover, and divider colors in dark mode', async () => {
    const anchorEl = createAnchorEl()

    render(
      <AppThemeContext.Provider value={darkAppTheme}>
        <Menu
          open
          anchorEl={anchorEl}
          onClose={() => {}}
          data-testid="test-menu"
        >
          <MenuItem>Dark action</MenuItem>
          <MenuDivider />
        </Menu>
      </AppThemeContext.Provider>,
    )

    const menu = await screen.findByTestId('test-menu')
    const menuItem = await screen.findByRole('menuitem', {
      name: 'Dark action',
    })
    const divider = screen.getByRole('separator')

    expect(menu).toHaveStyle(`
      background-color: ${darkAppTheme.palette.background.paper};
      color: ${darkAppTheme.palette.text.primary};
    `)

    fireEvent.mouseEnter(menuItem)
    expect(menuItem).toHaveStyle(
      `background-color: ${darkAppTheme.palette.action.hover}`,
    )

    expect(divider).toHaveStyle(
      `border-top: 1px solid ${darkAppTheme.palette.divider}`,
    )

    anchorEl.remove()
  })
})
