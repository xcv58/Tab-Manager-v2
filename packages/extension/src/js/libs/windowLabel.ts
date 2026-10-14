// Browser windows have no user-visible names. Identify them by the active tab,
// consistently across destinations, search results and tab details.
export const getWindowLabel = (win?: {
  tabs?: Array<{ active?: boolean; title?: string }>
}) =>
  win?.tabs?.find((tab) => tab.active)?.title ||
  win?.tabs?.[0]?.title ||
  'Empty window'
