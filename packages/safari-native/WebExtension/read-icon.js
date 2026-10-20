// Runs only on an explicitly permitted, non-private tab. Read icon metadata
// from the document head; do not inspect page content or modify the document.
;(() => ({
  url: location.href,
  icons: Array.from(document.head?.querySelectorAll('link[rel][href]') || [])
    .filter((link) =>
      /(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/i.test(link.rel),
    )
    .slice(0, 8)
    .map((link) => link.href.slice(0, 4096)),
}))()
