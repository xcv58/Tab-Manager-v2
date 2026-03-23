import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import { browser } from 'libs'
import SettingsDialog from '../SettingsDialog'
import { useStore } from 'components/hooks/useStore'

jest.mock('components/hooks/useStore', () => ({
  useStore: jest.fn(),
}))

jest.mock('libs/useReduceMotion', () => ({
  __esModule: true,
  default: () => false,
}))

jest.mock('../SponsorButton', () => ({
  __esModule: true,
  default: () => <button type="button">Sponsor</button>,
}))

jest.mock('../FeedbackButton', () => ({
  __esModule: true,
  default: () => <button type="button">Feedback</button>,
}))

jest.mock('../TabRowPreview', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-row-preview" />,
}))

const mockUseStore = useStore as jest.Mock

const renderSettingsDialog = () => {
  const userStore = {
    dialogOpen: true,
    closeDialog: jest.fn(),
    highlightDuplicatedTab: false,
    toggleHighlightDuplicatedTab: jest.fn(),
    showTabTooltip: false,
    toggleShowTabTooltip: jest.fn(),
    preserveSearch: false,
    togglePreserveSearch: jest.fn(),
    searchHistory: false,
    toggleSearchHistory: jest.fn(),
    showAppWindow: false,
    toggleShowAppWindow: jest.fn(),
    showUnmatchedTab: false,
    toggleShowUnmatchedTab: jest.fn(),
    litePopupMode: false,
    toggleLitePopupMode: jest.fn(),
    showShortcutHint: false,
    toggleShowShortcutHint: jest.fn(),
    toolbarAutoHide: false,
    toggleAutoHide: jest.fn(),
    showUrl: true,
    toggleShowUrl: jest.fn(),
    autoFocusSearch: false,
    toggleAutoFocusSearch: jest.fn(),
    tabWidth: 20,
    updateTabWidth: jest.fn(),
    fontSize: 14,
    updateFontSize: jest.fn(),
    showTabIcon: true,
    toggleShowTabIcon: jest.fn(),
    uiPreset: 'modern',
    selectUiPreset: jest.fn(),
    theme: 'system',
    selectTheme: jest.fn(),
  }

  mockUseStore.mockReturnValue({ userStore })

  return {
    userStore,
    ...render(
      <AppThemeContext.Provider value={lightAppTheme}>
        <SettingsDialog />
      </AppThemeContext.Provider>,
    ),
  }
}

describe('SettingsDialog', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  beforeEach(() => {
    jest
      .spyOn(browser.runtime, 'getManifest')
      .mockReturnValue({ version: '2.1.0' } as chrome.runtime.Manifest)
  })

  it('avoids nested labels for search and view switches so keyboard focus can reach them consistently', () => {
    const { container } = renderSettingsDialog()

    expect(container.querySelector('label label')).toBeNull()
  })

  it('adds visible focus styling to the search and view switch rows for keyboard users', () => {
    renderSettingsDialog()

    expect(screen.getByTestId('settings-search-focus')).toHaveClass(
      'focus-within:ring-2',
    )
    expect(screen.getByTestId('settings-lite-popup-mode')).toHaveClass(
      'focus-within:ring-2',
    )
  })

  it('toggles the search and lite popup settings from their visible labels', () => {
    const { userStore } = renderSettingsDialog()

    fireEvent.click(screen.getByText('Focus search on open'))
    fireEvent.click(screen.getByText('Use lite popup mode'))

    expect(userStore.toggleAutoFocusSearch).toHaveBeenCalledTimes(1)
    expect(userStore.toggleLitePopupMode).toHaveBeenCalledTimes(1)
  })
})
