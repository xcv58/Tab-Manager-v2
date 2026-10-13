import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import SettingsNavigation, {
  SETTINGS_SECTIONS,
  type SettingsNavigationState,
  type SettingsSectionId,
} from '../SettingsNavigation'

const Panel = ({
  sectionId,
  title,
}: {
  sectionId: SettingsSectionId
  title: string
}) => (
  <section id={'settings-section-' + sectionId}>
    <h2>{title}</h2>
  </section>
)

const renderNavigation = () => {
  const stateRef = {
    current: { active: 'appearance', scrollTop: {} } as SettingsNavigationState,
  }
  render(
    <SettingsNavigation stateRef={stateRef}>
      {SETTINGS_SECTIONS.map(({ id, title }) => (
        <Panel key={id} sectionId={id} title={title} />
      ))}
    </SettingsNavigation>,
  )
  const panel = screen.getByRole('tabpanel')
  Object.defineProperties(panel, {
    clientHeight: { configurable: true, value: 300 },
    scrollHeight: { configurable: true, value: 900 },
  })
  return { panel, stateRef }
}

afterEach(() => jest.restoreAllMocks())

test('one wheel gesture can reach the edge but cannot jump until a fresh gesture', () => {
  let now = 100
  jest.spyOn(performance, 'now').mockImplementation(() => now)
  const { panel } = renderNavigation()
  fireEvent.wheel(panel, { deltaY: 120 })
  panel.scrollTop = 600
  now = 150
  fireEvent.wheel(panel, { deltaY: 120 })
  expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  now = 500
  fireEvent.wheel(panel, { deltaY: 120 })
  expect(screen.getByRole('tab', { name: 'Windows & layout' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(
    screen.queryByRole('heading', { name: 'Appearance' }),
  ).not.toBeInTheDocument()
})

test('navigation remembers each section scroll position and supports keyboard selection', () => {
  const { panel, stateRef } = renderNavigation()
  panel.scrollTop = 240
  fireEvent.scroll(panel)
  fireEvent.click(screen.getByRole('tab', { name: 'Search' }))
  expect(stateRef.current.scrollTop.appearance).toBe(240)
  fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }))
  expect(panel.scrollTop).toBe(240)
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Appearance' }), {
    key: 'ArrowDown',
  })
  expect(screen.getByRole('tab', { name: 'Windows & layout' })).toHaveFocus()
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Windows & layout')
})
