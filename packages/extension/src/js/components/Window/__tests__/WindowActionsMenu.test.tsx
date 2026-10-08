import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import WindowActionsMenu from '../WindowActionsMenu'

const setup = (
  selected = true,
  canDrop = true,
  pendingWindowEdgeDrop = false,
) => {
  const moveSelectedTabsToWindowEdge = jest.fn()
  const store = {
    dragStore: { moveSelectedTabsToWindowEdge, pendingWindowEdgeDrop },
    tabStore: { selection: new Map(selected ? [[1, { id: 1 }]] : []) },
  } as any
  render(
    <StoreContext.Provider value={store}>
      <WindowActionsMenu win={{ id: 7, canDrop } as any} />
    </StoreContext.Provider>,
  )
  const trigger = screen.getByRole('button', { name: 'Window actions' })
  fireEvent.click(trigger)
  return { trigger, moveSelectedTabsToWindowEdge }
}

describe('WindowActionsMenu', () => {
  it.each(['beginning', 'end'] as const)(
    'moves selected tabs to %s, closes the menu, and returns focus',
    (position) => {
      const { trigger, moveSelectedTabsToWindowEdge } = setup()

      fireEvent.click(
        screen.getByRole('menuitem', {
          name: `Move selected tabs to ${position}`,
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
    const items = screen.getAllByRole('menuitem')

    items.forEach((item) => {
      expect(item).toBeDisabled()
      fireEvent.click(item)
    })
    expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
  })

  it('supports keyboard navigation and Escape without moving tabs', () => {
    const { trigger, moveSelectedTabsToWindowEdge } = setup()
    const beginning = screen.getByRole('menuitem', {
      name: 'Move selected tabs to beginning',
    })
    const end = screen.getByRole('menuitem', {
      name: 'Move selected tabs to end',
    })
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
    'keeps disabled menus keyboard accessible with selected=%s, canDrop=%s, pending=%s',
    (selected, canDrop, pending) => {
      const { trigger, moveSelectedTabsToWindowEdge } = setup(
        selected,
        canDrop,
        pending,
      )
      const menu = screen.getByRole('menu')
      expect(menu).toHaveFocus()
      screen
        .getAllByRole('menuitem')
        .forEach((item) => expect(item).toBeDisabled())

      fireEvent.keyDown(menu, { key: 'Escape' })

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
      expect(moveSelectedTabsToWindowEdge).not.toHaveBeenCalled()
    },
  )
})
