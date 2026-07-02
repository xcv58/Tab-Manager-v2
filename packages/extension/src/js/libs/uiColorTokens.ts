import type { UiPreset } from 'stores/UserStore'

const MODERN = 'modern'

export const getUiColorTokens = (
  isDarkMode: boolean,
  uiPreset: UiPreset = MODERN,
  increaseContrast = false,
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
          focusRing: increaseContrast ? '#d8e4f7' : '#b5c7e6',
          headerSurface: classicSurface,
          mutedText: increaseContrast ? '#cbd5e1' : '#9ca3af',
          primaryText: '#eef1f5',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fecaca',
          toolbarShellBackground: classicSurface,
          toolbarShellBorderColor: increaseContrast
            ? 'rgba(238, 241, 245, 0.34)'
            : 'rgba(238, 241, 245, 0.18)',
          toolbarShellBorderRadius: 0,
          popupHeaderSurface: classicSurface,
          popupHeaderBorderColor: 'transparent',
          popupControlsSurface: classicSurface,
          popupControlsBorderColor: increaseContrast
            ? 'rgba(238, 241, 245, 0.34)'
            : 'rgba(238, 241, 245, 0.18)',
          popupControlsBorderRadius: 0,
          settingsDialogSurface: classicSurface,
          settingsPanelSurface: classicSurface,
          settingsRowSurface: classicSurface,
          settingsPreviewSurface: classicSurface,
          windowCardSurface: classicSurface,
          windowCardBorderColor: 'transparent',
          windowCardShadow: 'none',
          windowCardShadowFocused: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        }
      : {
          appCanvasSurface: classicSurface,
          rowSurface: classicSurface,
          focusRing: '#1a73e8',
          headerSurface: classicSurface,
          mutedText: increaseContrast ? '#334155' : '#64748b',
          primaryText: '#111827',
          duplicateTitle: '#f87171',
          duplicateUrl: '#fca5a5',
          toolbarShellBackground: classicSurface,
          toolbarShellBorderColor: increaseContrast
            ? 'rgba(15, 23, 42, 0.28)'
            : 'rgba(15, 23, 42, 0.16)',
          toolbarShellBorderRadius: 0,
          popupHeaderSurface: classicSurface,
          popupHeaderBorderColor: 'transparent',
          popupControlsSurface: classicSurface,
          popupControlsBorderColor: increaseContrast
            ? 'rgba(15, 23, 42, 0.28)'
            : 'rgba(15, 23, 42, 0.16)',
          popupControlsBorderRadius: 0,
          settingsDialogSurface: classicSurface,
          settingsPanelSurface: classicSurface,
          settingsRowSurface: classicSurface,
          settingsPreviewSurface: classicSurface,
          windowCardSurface: classicSurface,
          windowCardBorderColor: 'transparent',
          windowCardShadow: 'none',
          windowCardShadowFocused: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        }
  }

  return {
    appCanvasSurface,
    rowSurface: 'transparent',
    focusRing: isDarkMode
      ? increaseContrast
        ? '#d8e4f7'
        : '#b5c7e6'
      : '#1a73e8',
    headerSurface: isDarkMode ? '#373d46' : '#f6f8fc',
    mutedText: isDarkMode
      ? increaseContrast
        ? '#cbd5e1'
        : '#aeb5c0'
      : increaseContrast
        ? '#334155'
        : '#64748b',
    primaryText: isDarkMode ? '#eef1f5' : '#111827',
    duplicateTitle: isDarkMode ? '#fecaca' : '#ef4444',
    duplicateUrl: isDarkMode ? '#fecaca' : '#fca5a5',
    toolbarShellBackground: isDarkMode ? '#2e343c' : '#ffffff',
    toolbarShellBorderColor: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.32)'
        : 'rgba(238, 241, 245, 0.18)'
      : increaseContrast
        ? 'rgba(15, 23, 42, 0.28)'
        : 'rgba(15, 23, 42, 0.16)',
    toolbarShellBorderRadius: 16,
    popupHeaderSurface: isDarkMode ? '#2e343c' : '#ffffff',
    popupHeaderBorderColor: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.32)'
        : 'rgba(238, 241, 245, 0.18)'
      : increaseContrast
        ? 'rgba(15, 23, 42, 0.28)'
        : 'rgba(15, 23, 42, 0.16)',
    popupControlsSurface: isDarkMode ? '#2e343c' : '#ffffff',
    popupControlsBorderColor: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.32)'
        : 'rgba(238, 241, 245, 0.18)'
      : increaseContrast
        ? 'rgba(15, 23, 42, 0.28)'
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
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.38)'
        : 'rgba(238, 241, 245, 0.26)'
      : increaseContrast
        ? 'rgba(100, 116, 139, 0.72)'
        : 'rgba(148, 163, 184, 0.58)',
    windowCardShadow: 'none',
    windowCardShadowFocused: 'none',
  }
}

export const getTabRowColorTokens = (
  isDarkMode: boolean,
  uiPreset: UiPreset = MODERN,
  increaseContrast = false,
) => {
  const uiColors = getUiColorTokens(isDarkMode, uiPreset, increaseContrast)
  const isClassic = uiPreset === 'classic'

  if (isClassic) {
    return {
      ...uiColors,
      activeIndicatorPrimary: isDarkMode
        ? increaseContrast
          ? '#c7d6ed'
          : '#b5c7e6'
        : '#1a73e8',
      activeIndicatorSecondary: isDarkMode
        ? increaseContrast
          ? 'rgba(199, 214, 237, 0.68)'
          : 'rgba(181, 199, 230, 0.56)'
        : increaseContrast
          ? 'rgba(26, 115, 232, 0.6)'
          : 'rgba(26, 115, 232, 0.52)',
      activeIndicatorWidth: 3,
      activeIndicatorHeight: 25,
      hoverBackground: isDarkMode
        ? '#1f2937'
        : increaseContrast
          ? '#eaf3ff'
          : '#edf5ff',
      highlightedBackground: isDarkMode
        ? increaseContrast
          ? '#465d76'
          : '#425770'
        : increaseContrast
          ? '#d9ebff'
          : '#e0eeff',
      highlightedHoverBackground: isDarkMode
        ? increaseContrast
          ? '#506a86'
          : '#465d76'
        : increaseContrast
          ? '#cfe4ff'
          : '#daeaff',
      selectedBackground: isDarkMode
        ? increaseContrast
          ? '#5a7594'
          : '#4c6480'
        : increaseContrast
          ? '#bed9ff'
          : '#d4e7ff',
      duplicateMarkerVisible: false,
    }
  }

  return {
    ...uiColors,
    activeIndicatorPrimary: isDarkMode
      ? increaseContrast
        ? '#d8e4f7'
        : '#b5c7e6'
      : '#1a73e8',
    activeIndicatorSecondary: isDarkMode
      ? increaseContrast
        ? 'rgba(216, 228, 247, 0.82)'
        : 'rgba(181, 199, 230, 0.56)'
      : increaseContrast
        ? 'rgba(26, 115, 232, 0.7)'
        : 'rgba(26, 115, 232, 0.52)',
    activeIndicatorWidth: increaseContrast ? 4 : 3,
    activeIndicatorHeight: increaseContrast ? 28 : 25,
    hoverBackground: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.12)'
        : 'rgba(238, 241, 245, 0.08)'
      : increaseContrast
        ? 'rgba(15, 23, 42, 0.07)'
        : 'rgba(15, 23, 42, 0.04)',
    highlightedBackground: isDarkMode
      ? increaseContrast
        ? 'rgba(181, 199, 230, 0.24)'
        : 'rgba(181, 199, 230, 0.14)'
      : increaseContrast
        ? 'rgba(26, 115, 232, 0.13)'
        : 'rgba(26, 115, 232, 0.08)',
    highlightedHoverBackground: isDarkMode
      ? increaseContrast
        ? 'rgba(181, 199, 230, 0.27)'
        : 'rgba(181, 199, 230, 0.17)'
      : increaseContrast
        ? 'rgba(26, 115, 232, 0.16)'
        : 'rgba(26, 115, 232, 0.11)',
    selectedBackground: isDarkMode
      ? increaseContrast
        ? 'rgba(181, 199, 230, 0.3)'
        : 'rgba(181, 199, 230, 0.2)'
      : increaseContrast
        ? 'rgba(26, 115, 232, 0.2)'
        : 'rgba(26, 115, 232, 0.14)',
    duplicateMarkerVisible: true,
  }
}
