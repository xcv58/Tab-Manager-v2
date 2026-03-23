import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import SyncButton from 'components/SyncButton'

const syncAllWindows = jest.fn()

jest.mock('components/hooks/useStore', () => ({
  useStore: () => ({
    windowStore: {
      syncAllWindows,
    },
  }),
}))

describe('SyncButton', () => {
  beforeEach(() => {
    syncAllWindows.mockClear()
  })

  it('exposes an accessible button label for integration selectors and keyboard users', () => {
    render(
      <AppThemeContext.Provider value={lightAppTheme}>
        <SyncButton />
      </AppThemeContext.Provider>,
    )

    expect(
      screen.getByRole('button', { name: 'Sync All Windows' }),
    ).toBeVisible()
  })
})
