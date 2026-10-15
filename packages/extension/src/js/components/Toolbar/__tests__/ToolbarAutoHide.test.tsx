import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { observable, runInAction } from 'mobx'
import { StoreContext } from 'components/hooks/useStore'
import { browser } from 'libs'
import UserStore from 'stores/UserStore'
import ToolbarDock from '..'

jest.mock('../Toolbar', () => ({
  __esModule: true,
  default: ({ onMenuOpenChange }) => (
    <div data-testid="expanded-toolbar">
      <button onClick={() => onMenuOpenChange(true)}>Open menu</button>
      <button onClick={() => onMenuOpenChange(false)}>Dismiss menu</button>
    </div>
  ),
}))
jest.mock('../ToolbarIndicator', () => ({
  __esModule: true,
  default: () => <button>Toggle toolbar</button>,
}))

const setup = async () => {
  const userStore = new UserStore({} as any)
  await userStore.initPromise
  runInAction(() => {
    userStore.toolbarAutoHide = true
    userStore.toolbarVisible = true
  })
  const selection = observable.map<number, object>()
  const { container } = render(
    <StoreContext.Provider
      value={
        {
          userStore,
          tabStore: { selection },
          dragStore: { dragging: false },
        } as any
      }
    >
      <ToolbarDock />
      <button>Outside the toolbar</button>
    </StoreContext.Provider>,
  )
  return {
    userStore,
    selection,
    dock: container.querySelector('.corner-dock')!,
  }
}

const waitForHide = () => act(() => jest.advanceTimersByTime(600))

describe('toolbar auto-hide holds', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(browser.storage.sync, 'get').mockResolvedValue({})
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('hides after a selection is cleared with the pointer outside', async () => {
    const { dock, selection } = await setup()
    fireEvent.mouseEnter(dock)
    act(() => selection.set(1, {}))
    fireEvent.mouseLeave(dock)
    waitForHide()
    expect(screen.getByTestId('expanded-toolbar')).toBeVisible()
    act(() => selection.clear())
    waitForHide()
    expect(screen.queryByTestId('expanded-toolbar')).toBeNull()
  })

  it('hides after the menu is dismissed with the pointer outside', async () => {
    const { dock } = await setup()
    fireEvent.mouseEnter(dock)
    fireEvent.click(screen.getByText('Open menu'))
    fireEvent.mouseLeave(dock)
    waitForHide()
    expect(screen.getByTestId('expanded-toolbar')).toBeVisible()
    fireEvent.click(screen.getByText('Dismiss menu'))
    waitForHide()
    expect(screen.queryByTestId('expanded-toolbar')).toBeNull()
  })

  it('retains the collapse control while an open menu holds the toolbar visible', async () => {
    const { dock } = await setup()
    fireEvent.mouseEnter(dock)
    const indicator = screen.getByRole('button', { name: 'Toggle toolbar' })

    fireEvent.click(screen.getByText('Open menu'))
    expect(screen.getByRole('button', { name: 'Toggle toolbar' })).toBe(
      indicator,
    )
    fireEvent.mouseLeave(dock)
    waitForHide()
    expect(screen.getByTestId('expanded-toolbar')).toBeVisible()

    fireEvent.click(screen.getByText('Dismiss menu'))
    expect(screen.getByRole('button', { name: 'Toggle toolbar' })).toBe(
      indicator,
    )
    waitForHide()
    expect(screen.queryByTestId('expanded-toolbar')).toBeNull()
  })

  it('keeps the toolbar open when a hold ends under the pointer', async () => {
    const { dock, selection } = await setup()
    fireEvent.mouseEnter(dock)
    act(() => selection.set(1, {}))
    act(() => selection.clear())
    waitForHide()
    expect(screen.getByTestId('expanded-toolbar')).toBeVisible()
    fireEvent.mouseLeave(dock)
    waitForHide()
    expect(screen.queryByTestId('expanded-toolbar')).toBeNull()
  })

  it('keeps keyboard focus visible until it leaves the dock', async () => {
    const { dock, selection } = await setup()
    act(() => selection.set(1, {}))
    act(() => screen.getByText('Open menu').focus())
    fireEvent.mouseLeave(dock)
    act(() => selection.clear())
    waitForHide()
    expect(screen.getByTestId('expanded-toolbar')).toBeVisible()
    act(() => screen.getByText('Outside the toolbar').focus())
    waitForHide()
    expect(screen.queryByTestId('expanded-toolbar')).toBeNull()
  })
})
