// Generated on this device. No favicon service or website request is involved.
const colors = [
  '#475569',
  '#0369a1',
  '#4338ca',
  '#7e22ce',
  '#a21caf',
  '#be123c',
  '#b45309',
  '#047857',
]
const escapeXml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  )

export const websiteOriginPattern = (value: string): string | null => {
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null
    // WebExtension match patterns cannot restrict a port.
    return `${url.protocol}//${url.hostname}/*`
  } catch {
    return null
  }
}

export const createTabMonogram = (value: string, title = ''): string | null => {
  if (!websiteOriginPattern(value)) return null
  const url = new URL(value)
  const host = url.hostname.replace(/^www\./i, '')
  const local =
    host === 'localhost' || host.includes(':') || /^\d+(\.\d+){3}$/.test(host)
  const name = (local ? title : host) || host
  const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() || '?'
  const hash = Array.from(host).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0,
  )
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${colors[hash % colors.length]}"/><text x="16" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="21" font-weight="600" fill="white">${escapeXml(letter)}</text></svg>`)}`
}
