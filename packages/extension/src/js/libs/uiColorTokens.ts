import type { UiPreset } from 'stores/UserStore'

const MODERN = 'modern'

export const getUiColorTokens = (
  isDarkMode: boolean,
  uiPreset: UiPreset = MODERN,
) => {
  const isClassic = uiPreset === 'classic'

  if (isClassic) {
    return isDarkMode
      ? {
          focusRing: '#b5c7e6',
          headerSurface: '#3a4049',
          mutedText: '#9ca3af',
          primaryText: '#eef1f5',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fecaca',
          toolbarShellBackground: '#2e343c',
          toolbarShellBorderColor: 'rgba(148, 163, 184, 0.24)',
          toolbarShellBorderRadius: 6,
          popupHeaderSurface: '#2e343c',
          popupHeaderBorderColor: 'rgba(148, 163, 184, 0.22)',
          popupControlsSurface: 'rgba(46, 52, 60, 0.94)',
          popupControlsBorderColor: 'rgba(148, 163, 184, 0.18)',
          popupControlsBorderRadius: 8,
          settingsDialogSurface: '#262b33',
          settingsPanelSurface: 'rgba(255, 255, 255, 0.02)',
          settingsRowSurface: 'rgba(255, 255, 255, 0.01)',
          settingsPreviewSurface: 'rgba(15, 23, 42, 0.26)',
          windowCardSurface: '#2e343c',
          windowCardBorderColor: 'rgba(148, 163, 184, 0.18)',
          windowCardShadow: '0 2px 6px rgba(15, 23, 42, 0.24)',
          windowCardShadowFocused: '0 18px 30px rgba(15, 23, 42, 0.34)',
        }
      : {
          focusRing: '#1a73e8',
          headerSurface: '#dbeafe',
          mutedText: '#64748b',
          primaryText: '#111827',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fca5a5',
          toolbarShellBackground: 'rgba(255, 255, 255, 0.94)',
          toolbarShellBorderColor: 'rgba(148, 163, 184, 0.36)',
          toolbarShellBorderRadius: 6,
          popupHeaderSurface: '#ffffff',
          popupHeaderBorderColor: 'rgba(148, 163, 184, 0.24)',
          popupControlsSurface: 'rgba(255, 255, 255, 0.94)',
          popupControlsBorderColor: 'rgba(148, 163, 184, 0.28)',
          popupControlsBorderRadius: 8,
          settingsDialogSurface: '#ffffff',
          settingsPanelSurface: 'rgba(255, 255, 255, 0.92)',
          settingsRowSurface: 'rgba(255, 255, 255, 0.96)',
          settingsPreviewSurface: 'rgba(255, 255, 255, 0.92)',
          windowCardSurface: '#ffffff',
          windowCardBorderColor: 'rgba(148, 163, 184, 0.28)',
          windowCardShadow: '0 1px 4px rgba(15, 23, 42, 0.12)',
          windowCardShadowFocused: '0 12px 24px rgba(15, 23, 42, 0.16)',
        }
  }

  return {
    focusRing: isDarkMode ? '#b5c7e6' : '#1a73e8',
    headerSurface: isDarkMode ? '#373d46' : '#f6f8fc',
    mutedText: isDarkMode ? '#aeb5c0' : '#64748b',
    primaryText: isDarkMode ? '#eef1f5' : '#111827',
    duplicateTitle: isDarkMode ? '#fecaca' : '#ef4444',
    duplicateUrl: isDarkMode ? '#fecaca' : '#fca5a5',
    toolbarShellBackground: isDarkMode ? '#2e343c' : '#ffffff',
    toolbarShellBorderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.18)'
      : 'rgba(15, 23, 42, 0.16)',
    toolbarShellBorderRadius: 16,
    popupHeaderSurface: isDarkMode ? '#2e343c' : '#ffffff',
    popupHeaderBorderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.18)'
      : 'rgba(15, 23, 42, 0.16)',
    popupControlsSurface: isDarkMode ? '#2e343c' : '#ffffff',
    popupControlsBorderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.18)'
      : 'rgba(15, 23, 42, 0.16)',
    popupControlsBorderRadius: 999,
    settingsDialogSurface: isDarkMode ? '#2e343c' : '#ffffff',
    settingsPanelSurface: isDarkMode
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(246, 248, 252, 0.94)',
    settingsRowSurface: isDarkMode
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(255, 255, 255, 0.5)',
    settingsPreviewSurface: isDarkMode
      ? 'rgba(15, 23, 42, 0.34)'
      : 'rgba(255, 255, 255, 0.72)',
    windowCardSurface: isDarkMode ? '#2e343c' : '#ffffff',
    windowCardBorderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.26)'
      : 'rgba(148, 163, 184, 0.58)',
    windowCardShadow: 'none',
    windowCardShadowFocused: 'none',
  }
}

export const getTabRowColorTokens = (
  isDarkMode: boolean,
  uiPreset: UiPreset = MODERN,
) => {
  const uiColors = getUiColorTokens(isDarkMode, uiPreset)
  const isClassic = uiPreset === 'classic'

  if (isClassic) {
    return {
      ...uiColors,
      activeIndicatorPrimary: isDarkMode ? '#b5c7e6' : '#1a73e8',
      activeIndicatorSecondary: isDarkMode
        ? 'rgba(174, 181, 192, 0.72)'
        : 'rgba(100, 116, 139, 0.38)',
      hoverBackground: isDarkMode ? '#1f2937' : 'rgba(147, 197, 253, 0.62)',
      highlightedBackground: isDarkMode ? '#374151' : 'rgba(191, 219, 254, 1)',
      selectedBackground: isDarkMode ? '#111827' : 'rgba(147, 197, 253, 1)',
      duplicateMarkerVisible: false,
    }
  }

  return {
    ...uiColors,
    activeIndicatorPrimary: isDarkMode ? '#b5c7e6' : '#1a73e8',
    activeIndicatorSecondary: isDarkMode
      ? 'rgba(167, 188, 217, 0.72)'
      : 'rgba(91, 124, 173, 0.68)',
    hoverBackground: isDarkMode
      ? 'rgba(238, 241, 245, 0.08)'
      : 'rgba(15, 23, 42, 0.04)',
    highlightedBackground: isDarkMode
      ? 'rgba(181, 199, 230, 0.14)'
      : 'rgba(26, 115, 232, 0.08)',
    selectedBackground: isDarkMode
      ? 'rgba(181, 199, 230, 0.2)'
      : 'rgba(26, 115, 232, 0.14)',
    duplicateMarkerVisible: true,
  }
}
