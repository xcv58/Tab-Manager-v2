import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { SearchIcon } from 'icons/actionIcons'
import { CloseIcon } from 'icons/materialIcons'

export const SETTINGS_SECTIONS = [
  { id: 'appearance', title: 'Appearance' },
  { id: 'windows-layout', title: 'Windows & layout' },
  { id: 'tab-details', title: 'Tab details' },
  { id: 'search', title: 'Search' },
  { id: 'popup-controls', title: 'Popup & controls' },
] as const
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id']
export type SettingsNavigationState = { scrollTop: number }

const aliases: Record<string, string> = {
  Theme: 'dark light system colors',
  'Interface style': 'modern classic appearance',
  'Increase contrast': 'accessibility visibility',
  'Font size': 'text reading zoom scale',
  'Minimum tab width': 'columns size density layout',
  'Auto-fit columns': 'horizontal scrolling layout responsive',
  'Window order': 'recent last used default sort',
  'Show tab icons': 'favicon favicons',
  'Show URLs': 'address links',
  'Show tab tooltips': 'hover title url length lines copy expand',
  'Mark duplicate tabs': 'duplicates identical same url',
  'Keep toolbar visible': 'dock bottom right auto hide autohide buttons',
  'Extension icon count': 'badge toolbar count tabs',
  'Use lite popup mode': 'compact browser action',
  'Show shortcut hints': 'keyboard hotkeys feedback',
}
const matches = (text: string, query: string) =>
  query
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => text.toLocaleLowerCase().includes(word))

// Short views pin only the title; spacious views pin its description too.
const stickyHeadings = (container: Element) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      '.settings-section-header, .settings-section-heading',
    ),
  ).filter((heading) => getComputedStyle(heading).position === 'sticky')

const controlText = (nodes: React.ReactNode): string =>
  React.Children.toArray(nodes)
    .map((node) => {
      if (typeof node === 'string' || typeof node === 'number')
        return String(node)
      if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return ''
      return controlText(node.props.children)
    })
    .join(' ')

// Labeled controls are filtered before rendering, keeping their real callbacks.
// Sample preview text never contributes to matching.
function filterControls(
  nodes: React.ReactNode,
  query: string,
): { nodes: React.ReactNode; count: number; titles: Set<string> } {
  let count = 0
  const titles = new Set<string>()
  const filtered = React.Children.toArray(nodes).map((node) => {
    if (!React.isValidElement<Record<string, unknown>>(node)) return node
    const title = (node.props.title || node.props['data-setting-search']) as
      | string
      | undefined
    if (title) {
      if (
        !matches(
          `${title} ${node.props.description || ''} ${aliases[title] || ''} ${controlText((node.props.details || node.props.children) as React.ReactNode)}`,
          query,
        )
      )
        return null
      count++
      titles.add(title)
      return node
    }
    if (node.type === 'h3' && query) return null
    if (node.props.children) {
      const result = filterControls(
        node.props.children as React.ReactNode,
        query,
      )
      count += result.count
      result.titles.forEach((title) => titles.add(title))
      return React.cloneElement(node, {}, result.nodes)
    }
    return node
  })
  const nodesWithPreviews = filtered.map((node) => {
    if (!React.isValidElement<Record<string, unknown>>(node)) return node
    const previewFor = node.props['data-settings-preview'] as string | undefined
    return previewFor &&
      !previewFor.split('|').some((title) => titles.has(title))
      ? null
      : node
  })
  return { nodes: nodesWithPreviews, count, titles }
}

export default function SettingsNavigation({
  children,
  stateRef,
  uiPreset,
}: {
  uiPreset: 'modern' | 'classic'
  children: React.ReactElement<{
    sectionId: SettingsSectionId
    title: string
    children: React.ReactNode
  }>[]
  stateRef: React.MutableRefObject<SettingsNavigationState>
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousQuery = useRef('')
  const savedScroll = useRef(stateRef.current.scrollTop)
  const [query, setQuery] = useState('')
  const [moreBelow, setMoreBelow] = useState(false)
  const normalizedQuery = query.trim()
  let count = 0
  const panels = children.flatMap((panel) => {
    const sectionQuery =
      normalizedQuery && matches(panel.props.title, normalizedQuery)
        ? ''
        : normalizedQuery
    const result = filterControls(panel.props.children, sectionQuery)
    count += result.count
    return result.count
      ? [
          React.cloneElement(
            panel,
            { key: panel.props.sectionId },
            result.nodes,
          ),
        ]
      : []
  })
  const measureViewport = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    container.style.setProperty(
      '--settings-viewport-height',
      `${container.clientHeight}px`,
    )
    setMoreBelow(
      container.scrollHeight - container.scrollTop - container.clientHeight > 1,
    )
    const heights = stickyHeadings(container).map(
      (heading) => heading.getBoundingClientRect().height,
    )
    container.style.setProperty(
      '--settings-sticky-height',
      `${Math.max(0, ...heights) + 8}px`,
    )
  }, [])
  const rememberScroll = () => {
    const container = scrollRef.current
    if (!container) return
    if (!normalizedQuery) stateRef.current.scrollTop = container.scrollTop
    measureViewport()
  }
  const keepFocusVisible = (event: React.FocusEvent<HTMLDivElement>) => {
    const container = scrollRef.current
    const target = event.target as HTMLElement
    // Tooltip portals have their own position and focus handling.
    if (!container?.contains(target) || target === container) return
    const section = target.closest('.settings-section')
    const heading = section ? stickyHeadings(section)[0] : undefined
    if (heading?.contains(target)) return
    const viewport = container.getBoundingClientRect()
    // A switch's clipped checkbox is not its visible track or row focus ring.
    const visibleTarget = target.matches('input[type="checkbox"]')
      ? target.closest<HTMLElement>('.settings-option') ||
        target.closest<HTMLElement>('label') ||
        target
      : target
    const rect = visibleTarget.getBoundingClientRect()
    const top = viewport.top + (heading?.offsetHeight || 0) + 8
    const bottom = viewport.bottom - 16
    if (rect.top < top) container.scrollTop += rect.top - top
    else if (rect.bottom > bottom) container.scrollTop += rect.bottom - bottom
  }
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = stateRef.current.scrollTop
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureViewport)
    resizeObserver?.observe(container)
    if (contentRef.current) resizeObserver?.observe(contentRef.current)
    window.addEventListener('resize', measureViewport)
    measureViewport()
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureViewport)
    }
  }, [measureViewport, stateRef])
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    if (!previousQuery.current && normalizedQuery)
      savedScroll.current = stateRef.current.scrollTop
    if (previousQuery.current !== normalizedQuery) {
      container.scrollTop = normalizedQuery ? 0 : savedScroll.current
      previousQuery.current = normalizedQuery
      measureViewport()
    }
  }, [normalizedQuery, measureViewport])
  return (
    <div className="settings-layout" data-ui-preset={uiPreset}>
      <div className="settings-search-tools">
        <div className="settings-search-input">
          <SearchIcon fontSize={18} aria-hidden="true" />
          <input
            ref={searchRef}
            aria-label="Search settings"
            placeholder="Search settings…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear settings search"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <CloseIcon fontSize={16} />
            </button>
          )}
        </div>
        {normalizedQuery && (
          <p className="settings-search-status" role="status">
            {count
              ? `${count} matching ${count === 1 ? 'setting' : 'settings'}`
              : 'No matching settings'}
          </p>
        )}
      </div>
      <div className="settings-scroll-viewport" data-more-below={moreBelow}>
        <div
          ref={scrollRef}
          className="settings-scroll"
          data-testid="settings-scroll"
          data-filtered={normalizedQuery ? 'true' : 'false'}
          role="region"
          aria-label="Settings sections"
          tabIndex={0}
          onScroll={rememberScroll}
          onFocusCapture={keepFocusVisible}
        >
          <div ref={contentRef}>
            {panels.length ? (
              panels
            ) : (
              <div className="settings-empty-results">
                <h2>Search settings</h2>
                <p>No matching settings. Try another word.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
