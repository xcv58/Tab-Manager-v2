import React, { useLayoutEffect, useRef, useState } from 'react'
import { SearchIcon } from 'icons/actionIcons'
import { CloseIcon } from 'icons/materialIcons'
import Menu, { MenuItem } from 'components/ui/Menu'

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
  const previousQuery = useRef('')
  const savedScroll = useRef(stateRef.current.scrollTop)
  const [query, setQuery] = useState('')
  const [jumpAnchor, setJumpAnchor] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState<SettingsSectionId>('appearance')
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
  const updateSection = () => {
    const container = scrollRef.current
    if (!container) return
    const top = container.getBoundingClientRect().top + 24
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>('.settings-section'),
    )
    const current =
      sections
        .filter((section) => section.getBoundingClientRect().top <= top)
        .at(-1) || sections[0]
    if (current) setActive(current.dataset.sectionId as SettingsSectionId)
    if (!normalizedQuery) stateRef.current.scrollTop = container.scrollTop
  }
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = stateRef.current.scrollTop
    updateSection()
  }, [])
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    if (!previousQuery.current && normalizedQuery)
      savedScroll.current = stateRef.current.scrollTop
    if (previousQuery.current !== normalizedQuery) {
      container.scrollTop = normalizedQuery ? 0 : savedScroll.current
      previousQuery.current = normalizedQuery
      updateSection()
    }
  }, [normalizedQuery])
  const jump = (id: string, focusHeading = false) => {
    const container = scrollRef.current
    const section = container?.querySelector<HTMLElement>(
      '#settings-section-' + id,
    )
    if (!container || !section) return
    container.scrollTop +=
      section.getBoundingClientRect().top -
      container.getBoundingClientRect().top
    setActive(id as SettingsSectionId)
    if (focusHeading)
      section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
    if (!normalizedQuery) stateRef.current.scrollTop = container.scrollTop
  }
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
        <button
          type="button"
          className="settings-jump-button"
          aria-label="Jump to section"
          aria-haspopup="menu"
          aria-expanded={!!jumpAnchor}
          disabled={!panels.length}
          onClick={(event) => setJumpAnchor(event.currentTarget)}
        >
          Jump to…
        </button>
        <Menu
          open={!!jumpAnchor}
          anchorEl={jumpAnchor}
          restoreFocus={false}
          onClose={() => {
            jumpAnchor?.focus()
            setJumpAnchor(null)
          }}
        >
          {panels.map((panel) => (
            <MenuItem
              key={panel.props.sectionId}
              onClick={() => {
                setJumpAnchor(null)
                jump(panel.props.sectionId, true)
              }}
            >
              {panel.props.title}
              {active === panel.props.sectionId ? ' ✓' : ''}
            </MenuItem>
          ))}
        </Menu>
        {normalizedQuery && (
          <p className="settings-search-status" role="status">
            {count
              ? `${count} matching ${count === 1 ? 'setting' : 'settings'}`
              : 'No matching settings'}
          </p>
        )}
      </div>
      <div
        ref={scrollRef}
        className="settings-scroll"
        data-testid="settings-scroll"
        data-filtered={normalizedQuery ? 'true' : 'false'}
        role="region"
        aria-label="Settings sections"
        tabIndex={0}
        onScroll={updateSection}
      >
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
  )
}
