import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import * as StoreHook from 'components/hooks/useStore'
import TabMenu from '../TabMenu'

describe('TabMenu', () => {
  beforeEach(() => {
    jest.spyOn(StoreHook, 'useStore').mockReturnValue({
      tabGroupStore: undefined,
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
    win: { tabs: [{ id: 42 }, { id: 99 }] },
    sameDomainTabs: [{ id: 42 }, { id: 99 }],
    groupTab: jest.fn(),
    duplicatedTabCount: 1,
    closeDuplicatedTab: jest.fn(),
    isSelected: false,
    ...overrides,
  })

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
