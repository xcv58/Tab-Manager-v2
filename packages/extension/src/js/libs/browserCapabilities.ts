// Build-time capabilities keep browser-specific features out of every UI entry
// point. Chrome/Firefox and the isolated website demo retain their current scope.
export const isSafari = process.env.TARGET_BROWSER === 'safari'
export const canMoveTabs = !isSafari
export const canSearchHistory = !isSafari
export const canShowAppWindows = !isSafari

export const isSupportedCommand = (id: string) =>
  !isSafari ||
  !/^(move-|new-window-|sort-|cluster-|group-|ungroup-|create-group|edit-group|rename-group|color-group|collapse-group|expand-group|close-group|reload-group|clean-group|delete-group|bring-same-site$)/.test(
    id,
  )

export const isSupportedShortcut = (description: string) =>
  !isSafari ||
  !/move.*tab|sort|cluster|group.*tab|tab.*group|new window/i.test(description)
