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
