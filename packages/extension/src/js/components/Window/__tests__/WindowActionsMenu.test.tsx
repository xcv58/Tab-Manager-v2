import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import { AppThemeContext, lightAppTheme, darkAppTheme } from 'libs/appTheme'
import WindowActionsMenu from '../WindowActionsMenu'

const setup = (
  selected = true,
  canDrop = true,
  pendingWindowEdgeDrop = false,
  hide = false,
  sourceIncognito = false,
  destinationIncognito = false,
) => {
  const moveSelectedTabsToWindowEdge = jest.fn()
  const sortTabs = jest.fn().mockResolvedValue(undefined)
  const reload = jest.fn()
  const store = {
    arrangeStore: { sortTabs },
    dragStore: { moveSelectedTabsToWindowEdge, pendingWindowEdgeDrop },
    tabStore: {
      selection: new Map(
        selected ? [[1, { id: 1, incognito: sourceIncognito }]] : [],
      ),
    },
    focusStore: { focus: jest.fn() },
  } as any
  render(
    <StoreContext.Provider value={store}>
      <WindowActionsMenu
        win={
          {
            id: 7,
            canDrop,
            hide,
            reload,
            incognito: destinationIncognito,
          } as any
        }
      />
    </StoreContext.Provider>,
  )
  const trigger = screen.getByRole('button', { name: 'Window actions' })
  fireEvent.click(trigger)
  return { trigger, moveSelectedTabsToWindowEdge, sortTabs, reload }
}

describe('WindowActionsMenu', () => {
  it.each([
    [false, true, true],
    [true, false, true],
    [true, true, false],
  ])(
    'sets move availability for source private=%s and destination private=%s',
    (sourceIncognito, destinationIncognito, disabled) => {
      const { moveSelectedTabsToWindowEdge } = setup(
        true,
        true,
        false,
        false,
        sourceIncognito,
        destinationIncognito,
      )
      for (const item of screen.getAllByRole('menuitem', {
        name: /^Move selected to/,
      })) {
        expect(item).toHaveProperty('disabled', disabled)
        if (disabled) {
          fireEvent.click(item)
        }
      }
      expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    },
  )

  it.each([lightAppTheme, darkAppTheme])(
    'clears pointer feedback after clicking and leaving in $mode theme',
    (theme) => {
      const store = {
        dragStore: { pendingWindowEdgeDrop: false },
        tabStore: { selection: new Map() },
        focusStore: { focus: jest.fn() },
      } as any
      render(
        <StoreContext.Provider value={store}>
          <AppThemeContext.Provider value={theme}>
            <WindowActionsMenu win={{ id: 7, canDrop: true } as any} />
          </AppThemeContext.Provider>
        </StoreContext.Provider>,
      )
      const button = screen.getByRole('button', { name: 'Window actions' })
      const idleBackground = button.style.backgroundColor

      fireEvent.mouseEnter(button)
      expect(button.style.backgroundColor).not.toBe(idleBackground)
      fireEvent.mouseDown(button)
      fireEvent.mouseUp(button)
      fireEvent.click(button)
      fireEvent.mouseLeave(button)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

      expect(button.style.backgroundColor).toBe(idleBackground)
    },
  )

  it.each(['beginning', 'end'] as const)(
    'moves selected tabs to %s, closes the menu, and returns focus',
    (position) => {
      const { trigger, moveSelectedTabsToWindowEdge } = setup()

      fireEvent.click(
        screen.getByRole('menuitem', {
          name: `Move selected to ${position}`,
        }),
      )

      expect(moveSelectedTabsToWindowEdge).toHaveBeenCalledWith(7, position)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    },
  )

  it.each([
    [false, true],
    [true, false],
  ])('disables moves with selected=%s and canDrop=%s', (selected, canDrop) => {
    const { moveSelectedTabsToWindowEdge } = setup(selected, canDrop)
    const items = screen.getAllByRole('menuitem', {
      name: /^Move selected to/,
    })

    items.forEach((item) => {
      expect(item).toBeDisabled()
      fireEvent.click(item)
    })
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    expect(screen.getByRole('menuitem', { name: 'Sort tabs' })).toBeEnabled()
    expect(
      screen.getByRole('menuitem', { name: 'Reload all tabs' }),
    ).toBeEnabled()
  })

  it('supports keyboard navigation and Escape without moving tabs', () => {
    const { trigger, moveSelectedTabsToWindowEdge } = setup()
    const sort = screen.getByRole('menuitem', {
      name: 'Sort tabs',
    })
    const reload = screen.getByRole('menuitem', {
      name: 'Reload all tabs',
    })
    const beginning = screen.getByRole('menuitem', {
      name: 'Move selected to beginning',
    })
    const end = screen.getByRole('menuitem', {
      name: 'Move selected to end',
    })
    expect(sort).toHaveFocus()
    fireEvent.keyDown(sort, { key: 'ArrowDown' })
    expect(reload).toHaveFocus()
    fireEvent.keyDown(reload, { key: 'ArrowDown' })
    expect(beginning).toHaveFocus()
    fireEvent.keyDown(beginning, { key: 'ArrowDown' })
    expect(end).toHaveFocus()
    fireEvent.keyDown(end, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
  })

  it.each([
    [false, true, false],
    [true, false, false],
    [true, true, true],
  ])(
    'keeps window actions usable with selected=%s, canDrop=%s, pending=%s',
    (selected, canDrop, pending) => {
      const { trigger, moveSelectedTabsToWindowEdge } = setup(
        selected,
        canDrop,
        pending,
      )
      const sort = screen.getByRole('menuitem', {
        name: 'Sort tabs',
      })
      const reload = screen.getByRole('menuitem', {
        name: 'Reload all tabs',
      })
      expect(sort).toHaveFocus()
      expect(reload).toBeEnabled()
      screen
        .getAllByRole('menuitem', { name: /^Move selected to/ })
        .forEach((item) => expect(item).toBeDisabled())
      fireEvent.keyDown(sort, { key: 'ArrowDown' })
      expect(reload).toHaveFocus()
      fireEvent.keyDown(reload, { key: 'ArrowDown' })
      expect(sort).toHaveFocus()

      fireEvent.keyDown(sort, { key: 'Escape' })

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
      expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    },
  )

  it('sorts only this window without a selection and restores trigger focus', () => {
    const { trigger, sortTabs, reload, moveSelectedTabsToWindowEdge } =
      setup(false)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sort tabs' }))
    expect(sortTabs).toHaveBeenCalledWith(7)
    expect(reload).not.toHaveBeenCalled()
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('reloads this window without a selection or supported move destination', () => {
    const { trigger, sortTabs, reload, moveSelectedTabsToWindowEdge } = setup(
      false,
      false,
      true,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reload all tabs' }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(sortTabs).not.toHaveBeenCalled()
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('preserves collapsed-window action availability and disabled menu focus', () => {
    const { trigger, sortTabs, reload, moveSelectedTabsToWindowEdge } = setup(
      false,
      true,
      false,
      true,
    )
    const menu = screen.getByRole('menu')
    expect(menu).toHaveFocus()
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toBeDisabled()
      fireEvent.click(item)
    }
    expect(sortTabs).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
