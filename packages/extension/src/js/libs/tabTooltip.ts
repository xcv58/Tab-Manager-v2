export const TAB_TOOLTIP_URL_LINES = [1, 3, 5, 'full'] as const

export type TabTooltipUrlLines = (typeof TAB_TOOLTIP_URL_LINES)[number]

export const DEFAULT_TAB_TOOLTIP_URL_LINES: TabTooltipUrlLines = 3

export const normalizeTabTooltipUrlLines = (
  value: unknown,
): TabTooltipUrlLines =>
  TAB_TOOLTIP_URL_LINES.includes(value as TabTooltipUrlLines)
    ? (value as TabTooltipUrlLines)
    : DEFAULT_TAB_TOOLTIP_URL_LINES

export const TAB_TOOLTIP_TITLE_LINES = TAB_TOOLTIP_URL_LINES

export type TabTooltipTitleLines = (typeof TAB_TOOLTIP_TITLE_LINES)[number]

export const DEFAULT_TAB_TOOLTIP_TITLE_LINES: TabTooltipTitleLines = 3

export const normalizeTabTooltipTitleLines = (
  value: unknown,
): TabTooltipTitleLines =>
  TAB_TOOLTIP_TITLE_LINES.includes(value as TabTooltipTitleLines)
    ? (value as TabTooltipTitleLines)
    : DEFAULT_TAB_TOOLTIP_TITLE_LINES

export const getMountedTabDetailsSurface = (
  tabId: number,
  preferredSurface?: 'list' | 'search',
) => {
  const surfaces =
    preferredSurface === 'list'
      ? (['list', 'search'] as const)
      : (['search', 'list'] as const)
  return surfaces.find((surface) => {
    const prefix = surface === 'search' ? 'search-tab-row' : 'tab-row'
    return document
      .querySelector(
        `[data-testid="${prefix}-${tabId}"] button[aria-haspopup="dialog"]`,
      )
      ?.getClientRects().length
  })
}
