import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  DesktopWindowsRoundedIcon,
  ViewColumnIcon,
  SettingsSharpIcon,
  KeyboardArrowLeftIcon,
  KeyboardArrowRightIcon,
} from 'icons/materialIcons'
import { RevealInListIcon, SearchIcon } from 'icons/actionIcons'

export const SETTINGS_SECTIONS = [
  { id: 'appearance', title: 'Appearance', icon: DesktopWindowsRoundedIcon },
  { id: 'windows-layout', title: 'Windows & layout', icon: ViewColumnIcon },
  { id: 'tab-details', title: 'Tab details', icon: RevealInListIcon },
  { id: 'search', title: 'Search', icon: SearchIcon },
  { id: 'popup-controls', title: 'Popup & controls', icon: SettingsSharpIcon },
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id']
export type SettingsNavigationState = {
  active: SettingsSectionId
  scrollTop: Partial<Record<SettingsSectionId, number>>
}

// Browsers do not expose wheel-gesture boundaries. A quiet interval separates
// intentional continuation from the events and momentum that reached an edge.
const GESTURE_GAP = 250
const EDGE_DISTANCE = 40

export default function SettingsNavigation({
  children,
  stateRef,
}: {
  children: React.ReactElement<{ sectionId: SettingsSectionId }>[]
  stateRef: React.MutableRefObject<SettingsNavigationState>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const [activeSection, setActiveSection] = useState(stateRef.current.active)
  const entryRef = useRef<'saved' | 'start' | 'end'>('saved')
  const focusPanelRef = useRef(false)
  const gestureRef = useRef({ time: 0, used: false, distance: 0, direction: 0 })
  const activeIndex = SETTINGS_SECTIONS.findIndex(
    ({ id }) => id === activeSection,
  )
  const previous = SETTINGS_SECTIONS[activeIndex - 1]
  const next = SETTINGS_SECTIONS[activeIndex + 1]

  const changeSection = useCallback(
    (
      id: SettingsSectionId,
      entry: 'saved' | 'start' | 'end' = 'saved',
      focusPanel = false,
    ) => {
      if (id === activeSection) return
      if (scrollRef.current)
        stateRef.current.scrollTop[activeSection] = scrollRef.current.scrollTop
      stateRef.current.active = id
      entryRef.current = entry
      focusPanelRef.current = focusPanel
      gestureRef.current.used = true
      gestureRef.current.time = performance.now()
      setActiveSection(id)
    },
    [activeSection, stateRef],
  )

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop =
      entryRef.current === 'end'
        ? container.scrollHeight
        : entryRef.current === 'start'
          ? 0
          : stateRef.current.scrollTop[activeSection] || 0
    entryRef.current = 'saved'
    if (focusPanelRef.current) container.focus({ preventScroll: true })
    focusPanelRef.current = false
  }, [activeSection, stateRef])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onWheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        !event.deltaY
      )
        return
      const target = event.target as HTMLElement
      // Examples can contain their own scrollable details; controls must keep
      // their normal wheel behavior, including select menus and numeric inputs.
      if (target.closest('input, select, textarea, [role="slider"]')) return
      const direction = Math.sign(event.deltaY)
      const now = performance.now()
      const gesture = gestureRef.current
      if (now - gesture.time > GESTURE_GAP || gesture.direction !== direction) {
        gesture.used = false
        gesture.distance = 0
      }
      gesture.time = now
      gesture.direction = direction
      for (
        let node: HTMLElement | null = target;
        node && node !== container;
        node = node.parentElement
      ) {
        if (
          node.scrollHeight > node.clientHeight + 2 &&
          ['auto', 'scroll'].includes(getComputedStyle(node).overflowY) &&
          (direction < 0
            ? node.scrollTop > 2
            : node.scrollHeight - node.scrollTop - node.clientHeight > 2)
        ) {
          gesture.used = true
          gesture.distance = 0
          return
        }
      }
      const atEdge =
        direction < 0
          ? container.scrollTop <= 2
          : container.scrollHeight -
              container.scrollTop -
              container.clientHeight <=
            2
      if (!atEdge) {
        gesture.used = true
        gesture.distance = 0
        return
      }
      const destination = SETTINGS_SECTIONS[activeIndex + direction]
      if (!destination) return
      if (event.cancelable) event.preventDefault()
      if (gesture.used) return
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container.clientHeight
            : 1
      gesture.distance += Math.abs(event.deltaY) * unit
      if (gesture.distance < EDGE_DISTANCE) return
      changeSection(
        destination.id,
        direction > 0 ? 'start' : 'end',
        container.contains(document.activeElement),
      )
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [activeIndex, changeSection])

  const navigateTabs = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const offset =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? SETTINGS_SECTIONS.length - 1
          : offset
            ? (activeIndex + offset + SETTINGS_SECTIONS.length) %
              SETTINGS_SECTIONS.length
            : -1
    if (index < 0) return
    event.preventDefault()
    const destination = SETTINGS_SECTIONS[index]
    changeSection(destination.id)
    navigationRef.current
      ?.querySelector<HTMLButtonElement>('#settings-tab-' + destination.id)
      ?.focus()
  }

  return (
    <div className="settings-layout">
      <nav
        ref={navigationRef}
        className="settings-navigation"
        role="tablist"
        aria-label="Settings sections"
        aria-orientation="vertical"
      >
        {SETTINGS_SECTIONS.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            id={'settings-tab-' + id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            tabIndex={activeSection === id ? 0 : -1}
            aria-controls={'settings-panel-' + id}
            onClick={() => changeSection(id)}
            onKeyDown={navigateTabs}
            className="settings-navigation-link"
          >
            <Icon fontSize={20} aria-hidden="true" /> {title}
          </button>
        ))}
      </nav>
      <div
        ref={scrollRef}
        className="settings-scroll"
        data-testid="settings-scroll"
        tabIndex={0}
        id={'settings-panel-' + activeSection}
        role="tabpanel"
        aria-labelledby={'settings-tab-' + activeSection}
        onScroll={() => {
          if (scrollRef.current)
            stateRef.current.scrollTop[activeSection] =
              scrollRef.current.scrollTop
        }}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
          )
            return
          const container = event.currentTarget
          const forward =
            event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)
          const backward =
            event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)
          if (
            forward &&
            next &&
            container.scrollHeight -
              container.scrollTop -
              container.clientHeight <=
              2
          ) {
            event.preventDefault()
            changeSection(next.id, 'start', true)
          } else if (backward && previous && container.scrollTop <= 2) {
            event.preventDefault()
            changeSection(previous.id, 'end', true)
          }
        }}
      >
        {children.find((child) => child.props.sectionId === activeSection)}
        <div className="settings-section-steps">
          {previous ? (
            <button
              type="button"
              onClick={() => changeSection(previous.id, 'start', true)}
            >
              <KeyboardArrowLeftIcon fontSize={16} /> {previous.title}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              type="button"
              onClick={() => changeSection(next.id, 'start', true)}
            >
              {next.title} <KeyboardArrowRightIcon fontSize={16} />
            </button>
          )}
        </div>
        {(previous || next) && (
          <p className="settings-scroll-hint">
            Scroll again at an edge to switch sections.
          </p>
        )}
      </div>
    </div>
  )
}
