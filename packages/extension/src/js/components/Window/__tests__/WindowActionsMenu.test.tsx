import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import WindowActionsMenu from '../WindowActionsMenu'

const setup = (
  selected = true,
  canDrop = true,
  pendingWindowEdgeDrop = false,
  hide = false,
) => {
  const moveSelectedTabsToWindowEdge = jest.fn()
  const sortTabs = jest.fn().mockResolvedValue(undefined)
  const reload = jest.fn()
  const store = {
    arrangeStore: { sortTabs },
    dragStore: { moveSelectedTabsToWindowEdge, pendingWindowEdgeDrop },
    tabStore: { selection: new Map(selected ? [[1, { id: 1 }]] : []) },
  } as any
  render(
    <StoreContext.Provider value={store}>
      <WindowActionsMenu win={{ id: 7, canDrop, hide, reload } as any} />
    </StoreContext.Provider>,
  )
  const trigger = screen.getByRole('button', { name: 'Window actions' })
  fireEvent.click(trigger)
  return { trigger, moveSelectedTabsToWindowEdge, sortTabs, reload }
}

describe('WindowActionsMenu', () => {
  it.each(['beginning', 'end'] as const)(
    'moves selected tabs to %s, closes the menu, and returns focus',
    (position) => {
      const { trigger, moveSelectedTabsToWindowEdge } = setup()

      fireEvent.click(
        screen.getByRole('menuitem', {
          name: `Move selected tabs to ${position} of this window`,
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
      name: /^Move selected tabs/,
    })

    items.forEach((item) => {
      expect(item).toBeDisabled()
      fireEvent.click(item)
    })
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    expect(
      screen.getByRole('menuitem', { name: 'Sort tabs in this window' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('menuitem', { name: 'Reload all tabs in this window' }),
    ).toBeEnabled()
  })

  it('supports keyboard navigation and Escape without moving tabs', () => {
    const { trigger, moveSelectedTabsToWindowEdge } = setup()
    const sort = screen.getByRole('menuitem', {
      name: 'Sort tabs in this window',
    })
    const reload = screen.getByRole('menuitem', {
      name: 'Reload all tabs in this window',
    })
    const beginning = screen.getByRole('menuitem', {
      name: 'Move selected tabs to beginning of this window',
    })
    const end = screen.getByRole('menuitem', {
      name: 'Move selected tabs to end of this window',
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
        name: 'Sort tabs in this window',
      })
      const reload = screen.getByRole('menuitem', {
        name: 'Reload all tabs in this window',
      })
      expect(sort).toHaveFocus()
      expect(reload).toBeEnabled()
      screen
        .getAllByRole('menuitem', { name: /^Move selected tabs/ })
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
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Sort tabs in this window' }),
    )
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
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Reload all tabs in this window' }),
    )
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
