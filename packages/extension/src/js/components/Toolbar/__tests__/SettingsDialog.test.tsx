import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, darkAppTheme, lightAppTheme } from 'libs/appTheme'
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
  TabRowsPreview: () => <div data-testid="tab-rows-preview" />,
}))

jest.mock('../SettingsPopupPreview', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-popup-preview" />,
}))

const mockUseStore = useStore as jest.Mock

const renderSettingsDialog = (theme = lightAppTheme, overrides = {}) => {
  const userStore = {
    dialogOpen: true,
    closeDialog: jest.fn(),
    highlightDuplicatedTab: false,
    toggleHighlightDuplicatedTab: jest.fn(),
    highlightActiveTabsInAllWindows: false,
    toggleHighlightActiveTabsInAllWindows: jest.fn(),
    increaseContrast: false,
    toggleIncreaseContrast: jest.fn(),
    showTabTooltip: false,
    toggleShowTabTooltip: jest.fn(),
    tabTooltipTitleLines: 3,
    selectTabTooltipTitleLines: jest.fn(),
    tabTooltipUrlLines: 3,
    selectTabTooltipUrlLines: jest.fn(),
    preserveSearch: false,
    togglePreserveSearch: jest.fn(),
    searchHistory: false,
    toggleSearchHistory: jest.fn(),
    showSearchResultMenu: true,
    toggleShowSearchResultMenu: jest.fn(),
    showAppWindow: false,
    toggleShowAppWindow: jest.fn(),
    showUnmatchedTab: false,
    toggleShowUnmatchedTab: jest.fn(),
    autoFitColumns: false,
    toggleAutoFitColumns: jest.fn(),
    litePopupMode: false,
    toggleLitePopupMode: jest.fn(),
    actionTabCountMode: 'off',
    selectActionTabCountMode: jest.fn(),
    windowOrder: 'default',
    selectWindowOrder: jest.fn(),
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
    ...overrides,
  }

  mockUseStore.mockReturnValue({ userStore })

  return {
    userStore,
    ...render(
      <AppThemeContext.Provider value={theme}>
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

  it('exposes keyboard-focusable labelled search and view switches', () => {
    renderSettingsDialog()
    for (const name of [
      'Focus search on open',
      'Use lite popup mode',
      'Increase contrast',
    ]) {
      const control = screen.getByRole('checkbox', { name })
      act(() => control.focus())
      expect(control).toHaveFocus()
    }
  })

  it('uses themed foreground colors when the dark settings dialog is open', () => {
    renderSettingsDialog(darkAppTheme)

    expect(screen.getByRole('dialog')).toHaveStyle(
      `color: ${darkAppTheme.palette.text.primary}`,
    )
  })

  it('keeps described search rows vertically centered with their switches', () => {
    renderSettingsDialog()

    const describedSwitch = screen.getByRole('checkbox', {
      name: 'Keep non-matching tabs visible',
    })
    const switchLabel = describedSwitch.closest('label')

    expect(switchLabel?.parentElement).toHaveClass('items-center')
    expect(switchLabel).toHaveStyle('margin-top: 0px')
  })

  it('toggles settings from their visible controls', () => {
    const { userStore } = renderSettingsDialog()

    fireEvent.click(screen.getByTestId('settings-search-focus'))
    fireEvent.click(screen.getByTestId('settings-search-result-menu'))
    fireEvent.click(screen.getByTestId('settings-lite-popup-mode'))
    fireEvent.click(screen.getByTestId('settings-increase-contrast'))
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Highlight all active tabs',
      }),
    )

    expect(userStore.toggleAutoFocusSearch).toHaveBeenCalledTimes(1)
    expect(userStore.toggleShowSearchResultMenu).toHaveBeenCalledTimes(1)
    expect(userStore.toggleLitePopupMode).toHaveBeenCalledTimes(1)
    expect(userStore.toggleIncreaseContrast).toHaveBeenCalledTimes(1)
    expect(
      userStore.toggleHighlightActiveTabsInAllWindows,
    ).toHaveBeenCalledTimes(1)
  })

  it('updates the extension icon count mode from the segmented control', () => {
    const { userStore } = renderSettingsDialog()

    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Show extension icon count for this window tabs',
      }),
    )

    expect(userStore.selectActionTabCountMode).toHaveBeenCalledWith(
      'currentWindow',
    )
  })

  it('updates the window order mode from the segmented control', () => {
    const { userStore } = renderSettingsDialog()

    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Use last used window order',
      }),
    )

    expect(userStore.selectWindowOrder).toHaveBeenCalledWith('lastUsed')
  })

  it('labels previews and exposes their intended interactions', () => {
    renderSettingsDialog()
    expect(screen.getAllByTestId('tab-details-shared-preview')).toHaveLength(1)
    expect(
      screen.getByTestId('tab-details-shared-preview'),
    ).not.toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText(/Hover or press Alt/)).toBeInTheDocument()
    expect(screen.getAllByTestId('settings-popup-preview')).toHaveLength(1)
    expect(
      screen.queryByRole('combobox', { name: 'Jump to section' }),
    ).toBeNull()
  })

  it('changes title and URL line limits independently', () => {
    const { userStore } = renderSettingsDialog(lightAppTheme, {
      showTabTooltip: true,
    })
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Title line limit' }),
      {
        target: { value: '5' },
      },
    )
    expect(userStore.selectTabTooltipTitleLines).toHaveBeenCalledWith(5)
    expect(userStore.selectTabTooltipUrlLines).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox', { name: 'URL line limit' }), {
      target: { value: 'full' },
    })
    expect(userStore.selectTabTooltipUrlLines).toHaveBeenCalledWith('full')
    expect(userStore.selectTabTooltipTitleLines).toHaveBeenCalledTimes(1)
  })

  it('disables both line limits when tooltips are off', () => {
    renderSettingsDialog()
    expect(
      screen.getByRole('combobox', { name: 'Title line limit' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('combobox', { name: 'URL line limit' }),
    ).toBeDisabled()
  })
})
