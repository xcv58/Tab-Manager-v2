// History uses numeric browser timestamps. Keep the existing English labels
// and thresholds without loading a date library and its locale catalog.
export const formatRelativeTime = (
  timestamp: number | undefined,
  now = Date.now(),
) => {
  const value = timestamp === undefined ? now : timestamp
  if (!Number.isFinite(value) || !Number.isFinite(now)) return 'Invalid date'

  const elapsed = now - value
  let duration = Math.abs(elapsed)
  let monthDuration = ((duration / 86400000) * 4800) / 146097
  if (duration >= 25 * 86400000) {
    // Match calendar-month durations for older/future timestamps as well as
    // normal seven-day history. Clamp month ends before adding the remainder.
    const earlier = new Date(Math.min(value, now))
    const later = new Date(Math.max(value, now))
    if (
      !Number.isFinite(earlier.getTime()) ||
      !Number.isFinite(later.getTime())
    )
      return 'Invalid date'
    let wholeMonths =
      (later.getFullYear() - earlier.getFullYear()) * 12 +
      later.getMonth() -
      earlier.getMonth()
    const addMonths = (count: number) => {
      const anchor = new Date(earlier)
      const day = anchor.getDate()
      anchor.setDate(1)
      anchor.setMonth(anchor.getMonth() + count)
      const end = new Date(anchor)
      end.setMonth(end.getMonth() + 1, 0)
      anchor.setDate(Math.min(day, end.getDate()))
      return anchor.getTime()
    }
    let anchor = addMonths(wholeMonths)
    if (anchor > later.getTime()) anchor = addMonths(--wholeMonths)
    const remainder = later.getTime() - anchor
    monthDuration = wholeMonths + ((remainder / 86400000) * 4800) / 146097
    duration = Math.round((wholeMonths * 146097) / 4800) * 86400000 + remainder
  }
  const seconds = Math.round(duration / 1000)
  const minutes = Math.round(duration / 60000)
  const hours = Math.round(duration / 3600000)
  const days = Math.round(duration / 86400000)
  const months = Math.round(monthDuration)
  const years = Math.round(monthDuration / 12)
  const phrase =
    seconds <= 44
      ? 'a few seconds'
      : minutes <= 1
        ? 'a minute'
        : minutes < 45
          ? `${minutes} minutes`
          : hours <= 1
            ? 'an hour'
            : hours < 22
              ? `${hours} hours`
              : days <= 1
                ? 'a day'
                : days < 26
                  ? `${days} days`
                  : months <= 1
                    ? 'a month'
                    : months < 11
                      ? `${months} months`
                      : years <= 1
                        ? 'a year'
                        : `${years} years`

  return elapsed < 0 ? `in ${phrase}` : `${phrase} ago`
}
