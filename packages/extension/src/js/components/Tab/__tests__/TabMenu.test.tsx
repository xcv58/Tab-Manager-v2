import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import * as StoreHook from 'components/hooks/useStore'
import TabMenu from '../TabMenu'

describe('TabMenu', () => {
  beforeEach(() => {
    jest.spyOn(StoreHook, 'useStore').mockReturnValue({
      tabGroupStore: undefined,
      tabStore: { selection: new Map() },
      dragStore: {
        pendingWindowEdgeDrop: false,
        moveSelectedTabsRelativeToTab: jest.fn(),
      },
      focusStore: { focus: jest.fn() },
    } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const createTab = (overrides: Partial<any> = {}) => ({
    id: 42,
    groupId: -1,
    pinned: false,
    togglePin: jest.fn(),
    remove: jest.fn(),
    closeOtherTabs: jest.fn(),
    win: { canDrop: true, tabs: [{ id: 42 }, { id: 99 }] },
    sameDomainTabs: [{ id: 42 }, { id: 99 }],
    groupTab: jest.fn(),
    duplicatedTabCount: 1,
    closeDuplicatedTab: jest.fn(),
    isSelected: false,
    ...overrides,
  })

  it.each([false, true])(
    'allows relative moves only when a private selection matches the destination (%s)',
    (incognito) => {
      const store = StoreHook.useStore()
      store.tabStore.selection.set(1, { id: 1, incognito: true } as any)
      render(
        <TabMenu
          tab={createTab({
            win: { canDrop: true, incognito, tabs: [{ id: 42 }, { id: 99 }] },
          })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Tab actions' }))

      for (const item of screen.getAllByRole('menuitem', {
        name: /^Move selected/,
      })) {
        expect(item).toHaveProperty('disabled', !incognito)
        if (!incognito) {
          fireEvent.click(item)
        }
      }
      expect(
        store.dragStore.moveSelectedTabsRelativeToTab,
      ).not.toHaveBeenCalled()
    },
  )

  it('shows the same-domain move action when multiple ungrouped same-domain tabs exist', () => {
    render(<TabMenu tab={createTab()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Tab actions' }))

    expect(
      screen.getByRole('menuitem', {
        name: 'Cluster 2 same domain ungrouped tabs to this window',
      }),
    ).toBeInTheDocument()
  })

  it('uses the existing groupTab action when the same-domain move action is clicked', () => {
    const groupTab = jest.fn()
    render(<TabMenu tab={createTab({ groupTab })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Tab actions' }))
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: 'Cluster 2 same domain ungrouped tabs to this window',
      }),
    )

    expect(groupTab).toHaveBeenCalledTimes(1)
  })
})
