import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { observable, runInAction } from 'mobx'
import { StoreContext } from 'components/hooks/useStore'
import { ThemeContext } from 'components/hooks/useTheme'
import TabRow from '../Tab'

jest.mock('components/Tab/Icon', () => () => <div data-testid="tab-icon" />)
jest.mock('components/Tab/TabTools', () => () => (
  <div data-testid="tab-tools" />
))
jest.mock('components/Tab/TabContent', () => () => (
  <div data-testid="tab-content" />
))
jest.mock('components/CloseButton', () => () => (
  <button type="button">close</button>
))
jest.mock('components/RowActionSlot', () => ({ children }) => <>{children}</>)
jest.mock('components/RowActionRail', () => ({ children }) => <>{children}</>)
jest.mock('../DuplicateMarker', () => () => null)
jest.mock('../ContainerOrGroupIndicator', () => () => null)

describe('Tab', () => {
  it('focuses and reveals the row when the observable focus request changes', () => {
    const focus = jest.spyOn(HTMLElement.prototype, 'focus')
    const scrollIntoView = jest.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })

    const store = {
      dragStore: {
        dragging: false,
      },
      userStore: {
        uiPreset: 'modern',
      },
      searchStore: observable({
        typing: false,
      }),
      focusStore: {
        shouldRevealNode: jest.fn(() => true),
      },
      tabGroupStore: {
        isNoGroupId: jest.fn(() => true),
      },
    } as any
    const tab = observable({
      id: 1,
      groupId: -1,
      cookieStoreId: '',
      active: false,
      className: '',
      isFocused: false,
      focusRequestId: 0,
      isMatched: true,
      isSelected: false,
      pinned: false,
      shouldHighlight: false,
      shouldMoveDomFocus: true,
      shouldRevealOnFocus: false,
      removing: false,
      hover: jest.fn(),
      unhover: jest.fn(),
      remove: jest.fn(),
      setNodeRef: jest.fn(),
      win: {
        lastFocused: true,
        tabs: [{ id: 1 }, { id: 2 }],
      },
    }) as any

    render(
      <StoreContext.Provider value={store}>
        <ThemeContext.Provider value={false}>
          <TabRow tab={tab} />
        </ThemeContext.Provider>
      </StoreContext.Provider>,
    )

    act(() => {
      runInAction(() => {
        tab.isFocused = true
        tab.focusRequestId = 1
        tab.shouldRevealOnFocus = true
      })
    })

    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(store.focusStore.shouldRevealNode).toHaveBeenCalledWith(
      screen.getByTestId('tab-row-1'),
    )
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    })
  })

  it('clears hover state when the row unmounts', () => {
    const unhover = jest.fn()
    const store = {
      dragStore: {
        dragging: false,
      },
      userStore: {
        uiPreset: 'modern',
      },
      searchStore: observable({
        typing: false,
      }),
      focusStore: {
        shouldRevealNode: jest.fn(() => false),
      },
      tabGroupStore: {
        isNoGroupId: jest.fn(() => true),
      },
    } as any
    const tab = observable({
      id: 1,
      groupId: -1,
      cookieStoreId: '',
      active: false,
      isFocused: false,
      focusRequestId: 0,
      isMatched: true,
      isSelected: false,
      pinned: false,
      shouldHighlight: false,
      shouldMoveDomFocus: true,
      shouldRevealOnFocus: false,
      removing: false,
      hover: jest.fn(),
      unhover,
      remove: jest.fn(),
      setNodeRef: jest.fn(),
      win: {
        lastFocused: true,
        tabs: [{ id: 1 }, { id: 2 }],
      },
    }) as any

    const { unmount } = render(
      <StoreContext.Provider value={store}>
        <ThemeContext.Provider value={false}>
          <TabRow tab={tab} />
        </ThemeContext.Provider>
      </StoreContext.Provider>,
    )

    unmount()

    expect(unhover).toHaveBeenCalledTimes(1)
  })
})
