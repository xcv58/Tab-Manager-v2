import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { observable, runInAction } from 'mobx'
import HeaderActions from 'components/HeaderActions'

const windowStore = observable(
  {
    layoutDirty: false,
    windowLastUsedLayoutDirty: false,
    repackLayoutAndRevealActiveTab: jest.fn(() => {
      runInAction(() => {
        windowStore.layoutDirty = false
        windowStore.windowLastUsedLayoutDirty = false
      })
    }),
  },
  { repackLayoutAndRevealActiveTab: false },
)
jest.mock('components/hooks/useStore', () => ({
  useStore: () => ({ windowStore }),
}))
jest.mock('components/SyncButton', () => () => <button>Sync</button>)
jest.mock('components/ThemeToggle', () => () => <button>Theme</button>)
jest.mock('components/OpenInTab', () => () => <button>Open in new tab</button>)
const relayout = () =>
  screen.getByRole('button', { name: 'Relayout all columns' })
const dirty = (key: 'layoutDirty' | 'windowLastUsedLayoutDirty') => {
  act(() =>
    runInAction(() => {
      windowStore[key] = true
    }),
  )
}

beforeEach(() => {
  runInAction(() => {
    windowStore.layoutDirty = false
    windowStore.windowLastUsedLayoutDirty = false
  })
  windowStore.repackLayoutAndRevealActiveTab.mockClear()
})

it.each(['layoutDirty', 'windowLastUsedLayoutDirty'] as const)(
  'replaces all normal controls with Relayout when %s is pending',
  (key) => {
    render(<HeaderActions />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    dirty(key)
    expect(screen.getAllByRole('button')).toEqual([relayout()])
    expect(relayout()).not.toHaveAttribute('aria-disabled')
  },
)

it('does not replace controls under the pointer until it leaves the header', () => {
  render(<HeaderActions />)
  const header = screen.getByTestId('search-header-actions')
  fireEvent.pointerEnter(header)
  dirty('layoutDirty')
  expect(screen.getByRole('button', { name: 'Sync' })).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Relayout all columns' }),
  ).toBeNull()
  fireEvent.pointerLeave(header)
  expect(relayout()).toBeVisible()
})

it('keeps keyboard focus stable while moving between normal controls', () => {
  render(<HeaderActions />)
  const sync = screen.getByRole('button', { name: 'Sync' })
  const theme = screen.getByRole('button', { name: 'Theme' })
  fireEvent.focus(sync)
  dirty('layoutDirty')
  fireEvent.blur(sync, { relatedTarget: theme })
  fireEvent.focus(theme, { relatedTarget: sync })
  expect(theme).toBeVisible()
  fireEvent.blur(theme, { relatedTarget: document.body })
  expect(relayout()).toBeVisible()
})

it('retains a completed Relayout button without running it twice, until focus and pointer leave', () => {
  runInAction(() => {
    windowStore.layoutDirty = true
  })
  render(<HeaderActions />)
  const header = screen.getByTestId('search-header-actions')
  const button = relayout()
  fireEvent.pointerEnter(header)
  fireEvent.focus(button)
  fireEvent.click(button, { detail: 0 })
  expect(windowStore.repackLayoutAndRevealActiveTab).toHaveBeenCalledWith(
    'keyboard',
  )
  expect(button).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(button)
  expect(windowStore.repackLayoutAndRevealActiveTab).toHaveBeenCalledTimes(1)
  fireEvent.pointerLeave(header)
  expect(button).toBeVisible()
  fireEvent.blur(button, { relatedTarget: document.body })
  expect(screen.getByRole('button', { name: 'Open in new tab' })).toBeVisible()
})
