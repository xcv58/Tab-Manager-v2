export const getUiColorTokens = (isDarkMode: boolean) => ({
  focusRing: isDarkMode ? '#b5c7e6' : '#1a73e8',
  headerSurface: isDarkMode ? '#373d46' : '#f6f8fc',
  mutedText: isDarkMode ? '#aeb5c0' : '#64748b',
  primaryText: isDarkMode ? '#eef1f5' : '#111827',
})

export const getTabRowColorTokens = (isDarkMode: boolean) => ({
  ...getUiColorTokens(isDarkMode),
  activeIndicatorPrimary: isDarkMode ? '#b5c7e6' : '#1a73e8',
  activeIndicatorSecondary: isDarkMode
    ? 'rgba(167, 188, 217, 0.72)'
    : 'rgba(91, 124, 173, 0.68)',
  highlightedBackground: isDarkMode
    ? 'rgba(181, 199, 230, 0.14)'
    : 'rgba(26, 115, 232, 0.08)',
  selectedBackground: isDarkMode
    ? 'rgba(181, 199, 230, 0.2)'
    : 'rgba(26, 115, 232, 0.14)',
})
