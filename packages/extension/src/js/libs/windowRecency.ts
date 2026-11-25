export const WINDOW_LAST_FOCUSED_STORAGE_KEY = 'windowLastFocusedAt'

export type WindowTimestamps = Record<string, number>

export const normalizeWindowTimestamps = (
  value: unknown,
  liveWindowIds?: ReadonlySet<number>,
): WindowTimestamps => {
  if (!value || typeof value !== 'object') return {}

  const timestamps: WindowTimestamps = {}
  for (const [windowId, rawTimestamp] of Object.entries(value)) {
    const id = Number(windowId)
    const timestamp = Number(rawTimestamp)
    if (
      Number.isInteger(id) &&
      id > 0 &&
      (!liveWindowIds || liveWindowIds.has(id)) &&
      Number.isFinite(timestamp) &&
      timestamp > 0
    ) {
      timestamps[id] = timestamp
    }
  }
  return timestamps
}

export const nextWindowTimestamp = (
  timestamps: WindowTimestamps,
  at = Date.now(),
) => {
  const latest = Object.values(timestamps).reduce(
    (max, timestamp) =>
      Number.isFinite(timestamp) ? Math.max(max, timestamp) : max,
    0,
  )
  return Math.max(at, latest + 1)
}
