export const TAB_TOOLTIP_URL_LINES = [1, 3, 5, 'full'] as const

export type TabTooltipUrlLines = (typeof TAB_TOOLTIP_URL_LINES)[number]

export const DEFAULT_TAB_TOOLTIP_URL_LINES: TabTooltipUrlLines = 3

export const normalizeTabTooltipUrlLines = (
  value: unknown,
): TabTooltipUrlLines =>
  TAB_TOOLTIP_URL_LINES.includes(value as TabTooltipUrlLines)
    ? (value as TabTooltipUrlLines)
    : DEFAULT_TAB_TOOLTIP_URL_LINES
