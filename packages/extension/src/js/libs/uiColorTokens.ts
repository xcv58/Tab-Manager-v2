import type { UiPreset } from 'stores/UserStore'

const MODERN = 'modern'

export const getUiColorTokens = (
  isDarkMode: boolean,
  uiPreset: UiPreset = MODERN,
) => {
  const isClassic = uiPreset === 'classic'
  const appCanvasSurface = isDarkMode ? '#1f242b' : '#e7edf5'
  const rowSurface = isDarkMode ? '#2e343c' : '#ffffff'
  const classicSurface = rowSurface

  if (isClassic) {
    return isDarkMode
      ? {
          appCanvasSurface: classicSurface,
          rowSurface: classicSurface,
          focusRing: '#b5c7e6',
          headerSurface: classicSurface,
          mutedText: '#9ca3af',
          primaryText: '#eef1f5',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fecaca',
          toolbarShellBackground: classicSurface,
          toolbarShellBorderColor: 'rgba(238, 241, 245, 0.18)',
          toolbarShellBorderRadius: 0,
          popupHeaderSurface: classicSurface,
          popupHeaderBorderColor: 'transparent',
          popupControlsSurface: classicSurface,
          popupControlsBorderColor: 'rgba(238, 241, 245, 0.18)',
          popupControlsBorderRadius: 0,
          settingsDialogSurface: classicSurface,
          settingsPanelSurface: classicSurface,
          settingsRowSurface: classicSurface,
          settingsPreviewSurface: classicSurface,
          windowCardSurface: classicSurface,
          windowCardBorderColor: 'transparent',
          windowCardShadow: 'none',
          windowCardShadowFocused: 'none',
        }
      : {
          appCanvasSurface: classicSurface,
          rowSurface: classicSurface,
          focusRing: '#1a73e8',
          headerSurface: classicSurface,
          mutedText: '#64748b',
          primaryText: '#111827',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fca5a5',
          toolbarShellBackground: classicSurface,
          toolbarShellBorderColor: 'rgba(15, 23, 42, 0.16)',
          toolbarShellBorderRadius: 0,
          popupHeaderSurface: classicSurface,
          popupHeaderBorderColor: 'transparent',
          popupControlsSurface: classicSurface,
          popupControlsBorderColor: 'rgba(15, 23, 42, 0.16)',
          popupControlsBorderRadius: 0,
          settingsDialogSurface: classicSurface,
          settingsPanelSurface: classicSurface,
          settingsRowSurface: classicSurface,
          settingsPreviewSurface: classicSurface,
          windowCardSurface: classicSurface,
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
        ? 'rgba(181, 199, 230, 0.56)'
        : 'rgba(26, 115, 232, 0.52)',
      hoverBackground: isDarkMode ? '#394a60' : '#edf5ff',
      highlightedBackground: isDarkMode ? '#425770' : '#e0eeff',
      selectedBackground: isDarkMode ? '#4c6480' : '#d4e7ff',
      duplicateMarkerVisible: false,
    }
  }

  return {
    ...uiColors,
    activeIndicatorPrimary: isDarkMode ? '#b5c7e6' : '#1a73e8',
    activeIndicatorSecondary: isDarkMode
      ? 'rgba(181, 199, 230, 0.56)'
      : 'rgba(26, 115, 232, 0.52)',
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
