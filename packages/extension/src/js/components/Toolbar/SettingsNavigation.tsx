import React, { useEffect, useRef, useState } from 'react'
import { DesktopWindowsRoundedIcon, ViewColumnIcon } from 'icons/materialIcons'
import { RevealInListIcon, SearchIcon } from 'icons/actionIcons'
import useReduceMotion from 'libs/useReduceMotion'

const sections = [
  { id: 'search', title: 'Search', icon: SearchIcon },
  { id: 'appearance', title: 'Appearance', icon: DesktopWindowsRoundedIcon },
  { id: 'view', title: 'View', icon: ViewColumnIcon },
  { id: 'tab-display', title: 'Tab display', icon: RevealInListIcon },
] as const

type SectionId = (typeof sections)[number]['id']

export default function SettingsNavigation({
  children,
  preview,
}: {
  children: React.ReactNode
  preview: React.ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('search')
  const reduceMotion = useReduceMotion()

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const panels = sections.map(({ id }) =>
      container.querySelector<HTMLElement>(`#settings-section-${id}`),
    )
    let frame: number | null = null
    const update = () => {
      frame = null
      const viewport = container.getBoundingClientRect()
      const visible = panels.map((panel) => {
        if (!panel) return 0
        const rect = panel.getBoundingClientRect()
        return Math.max(
          0,
          Math.min(rect.bottom, viewport.bottom) -
            Math.max(rect.top, viewport.top),
        )
      })
      let index = 0
      visible.forEach((height, candidate) => {
        if (height > visible[index]) index = candidate
      })
      let current = sections[index].id
      let atBottom = false
      if (
        container.scrollTop > 0 &&
        container.scrollHeight - container.scrollTop - container.clientHeight <=
          2
      ) {
        current = 'tab-display'
        atBottom = true
      }
      setActiveSection((previous) => {
        const previousIndex = sections.findIndex(
          (section) => section.id === previous,
        )
        // A small margin keeps the navigation steady at section boundaries.
        return atBottom || visible[index] > visible[previousIndex] + 24
          ? current
          : previous
      })
    }
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update)
    }
    container.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(schedule)
        : null
    observer?.observe(container)
    panels.forEach((panel) => {
      if (panel) observer?.observe(panel)
    })
    schedule()
    return () => {
      container.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const navigation = navigationRef.current
    const link = navigation?.querySelector<HTMLElement>(
      '[aria-current="location"]',
    )
    if (
      !navigation ||
      !link ||
      navigation.scrollWidth <= navigation.clientWidth
    )
      return
    const left = link.offsetLeft - navigation.offsetLeft
    if (left < navigation.scrollLeft) navigation.scrollLeft = left
    else if (
      left + link.offsetWidth >
      navigation.scrollLeft + navigation.clientWidth
    ) {
      navigation.scrollLeft = left + link.offsetWidth - navigation.clientWidth
    }
  }, [activeSection])

  const jumpToSection = (id: SectionId) => {
    const container = scrollRef.current
    const panel = container?.querySelector<HTMLElement>(
      `#settings-section-${id}`,
    )
    if (!container || !panel) return
    const top =
      panel.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      16
    panel.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
    container.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <div className="settings-layout">
      <nav
        ref={navigationRef}
        className="settings-navigation"
        aria-label="Settings sections"
      >
        {sections.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeSection === id ? 'location' : undefined}
            aria-controls={`settings-section-${id}`}
            onClick={() => jumpToSection(id)}
            className="settings-navigation-link"
          >
            <Icon fontSize={20} /> {title}
          </button>
        ))}
      </nav>
      <div
        ref={scrollRef}
        className="settings-scroll"
        data-testid="settings-scroll"
      >
        {children}
      </div>
      <aside className="settings-live-preview" aria-label="Settings preview">
        {preview}
      </aside>
    </div>
  )
}
