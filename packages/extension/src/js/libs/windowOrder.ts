export const WINDOW_ORDERS = ['default', 'lastUsed'] as const

export type WindowOrder = (typeof WINDOW_ORDERS)[number]

export const DEFAULT_WINDOW_ORDER: WindowOrder = 'default'

export const normalizeWindowOrder = (value: unknown): WindowOrder => {
  if (
    typeof value === 'string' &&
    WINDOW_ORDERS.includes(value as WindowOrder)
  ) {
    return value as WindowOrder
  }

  return DEFAULT_WINDOW_ORDER
}
