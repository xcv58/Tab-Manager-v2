import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import HotkeyDialog from '../HotkeyDialog'

jest.mock('components/hooks/useStore', () => ({
  useStore: jest.fn(),
}))

jest.mock('libs/useReduceMotion', () => ({
  __esModule: true,
  default: () => false,
}))

jest.mock('../Help', () => ({
  __esModule: true,
  default: () => <div>Keyboard shortcuts help</div>,
}))

jest.mock('components/CloseButton', () => ({
  __esModule: true,
  default: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      Close
    </button>
  ),
}))

const mockUseStore = useStore as jest.Mock

const renderHotkeyDialog = () => {
  mockUseStore.mockReturnValue({
    shortcutStore: {
      dialogOpen: true,
      closeDialog: jest.fn(),
    },
  })

  return render(
    <AppThemeContext.Provider value={lightAppTheme}>
      <HotkeyDialog />
    </AppThemeContext.Provider>,
  )
}

describe('HotkeyDialog', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('updates fullscreen layout when the window crosses the mobile breakpoint', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    })

    renderHotkeyDialog()

    const dialog = screen.getByRole('dialog')
    expect(dialog).not.toHaveStyle('height: 100vh')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 500,
    })
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(dialog).toHaveStyle('height: 100vh')
      expect(dialog).toHaveStyle('width: 100vw')
    })
  })
})
