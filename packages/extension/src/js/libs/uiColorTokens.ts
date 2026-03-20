import type { UiPreset } from 'stores/UserStore'

const MODERN = 'modern'

export const getUiColorTokens = (
  isDarkMode: boolean,
  uiPreset: UiPreset = MODERN,
) => {
  const isClassic = uiPreset === 'classic'
  const appCanvasSurface = isDarkMode ? '#1f242b' : '#e7edf5'
  const rowSurface = isDarkMode ? '#2e343c' : '#ffffff'

  if (isClassic) {
    return isDarkMode
      ? {
          appCanvasSurface,
          rowSurface,
          focusRing: '#b5c7e6',
          headerSurface: appCanvasSurface,
          mutedText: '#9ca3af',
          primaryText: '#eef1f5',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fecaca',
          toolbarShellBackground: appCanvasSurface,
          toolbarShellBorderColor: 'rgba(238, 241, 245, 0.18)',
          toolbarShellBorderRadius: 0,
          popupHeaderSurface: appCanvasSurface,
          popupHeaderBorderColor: 'rgba(238, 241, 245, 0.18)',
          popupControlsSurface: appCanvasSurface,
          popupControlsBorderColor: 'rgba(238, 241, 245, 0.18)',
          popupControlsBorderRadius: 0,
          settingsDialogSurface: rowSurface,
          settingsPanelSurface: rowSurface,
          settingsRowSurface: rowSurface,
          settingsPreviewSurface: appCanvasSurface,
          windowCardSurface: appCanvasSurface,
          windowCardBorderColor: 'transparent',
          windowCardShadow: 'none',
          windowCardShadowFocused: 'none',
        }
      : {
          appCanvasSurface,
          rowSurface,
          focusRing: '#1a73e8',
          headerSurface: appCanvasSurface,
          mutedText: '#64748b',
          primaryText: '#111827',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fca5a5',
          toolbarShellBackground: appCanvasSurface,
          toolbarShellBorderColor: 'rgba(15, 23, 42, 0.16)',
          toolbarShellBorderRadius: 0,
          popupHeaderSurface: appCanvasSurface,
          popupHeaderBorderColor: 'rgba(15, 23, 42, 0.16)',
          popupControlsSurface: appCanvasSurface,
          popupControlsBorderColor: 'rgba(15, 23, 42, 0.16)',
          popupControlsBorderRadius: 0,
          settingsDialogSurface: rowSurface,
          settingsPanelSurface: rowSurface,
          settingsRowSurface: rowSurface,
          settingsPreviewSurface: appCanvasSurface,
          windowCardSurface: appCanvasSurface,
          windowCardBorderColor: 'transparent',
          windowCardShadow: 'none',
          windowCardShadowFocused: 'none',
        }
  }

  return {
    appCanvasSurface,
    rowSurface: 'transparent',
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
      hoverBackground: isDarkMode ? '#39404a' : '#eef4fc',
      highlightedBackground: isDarkMode ? '#414a55' : '#e5eefb',
      selectedBackground: isDarkMode ? '#46515f' : '#d7e5fa',
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
