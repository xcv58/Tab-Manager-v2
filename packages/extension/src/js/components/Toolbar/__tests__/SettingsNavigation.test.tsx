import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import SettingsNavigation, {
  type SettingsNavigationState,
} from '../SettingsNavigation'

const Control = ({ title }: { title: string }) => (
  <label>
    {title}
    <input aria-label={title} />
  </label>
)
const Panel = ({ sectionId, title, children }: any) => (
  <section
    className="settings-section"
    data-section-id={sectionId}
    id={'settings-section-' + sectionId}
  >
    <h2>{title}</h2>
    {children}
  </section>
)
const setup = () => {
  const stateRef = { current: { scrollTop: 0 } as SettingsNavigationState }
  const view = render(
    <SettingsNavigation stateRef={stateRef} uiPreset="modern">
      {[
        <Panel key="appearance" sectionId="appearance" title="Appearance">
          <Control title="Theme" />
          <Control title="Font size" />
        </Panel>,
        <Panel key="tab-details" sectionId="tab-details" title="Tab details">
          <Control title="Show tab icons" />
        </Panel>,
      ]}
    </SettingsNavigation>,
  )
  return {
    ...view,
    stateRef,
    scroll: screen.getByRole('region', { name: 'Settings sections' }),
  }
}

test('all sections share one ordinary scroll surface', () => {
  const { scroll, stateRef } = setup()
  expect(
    screen.getByRole('heading', { name: 'Appearance' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Tab details' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  scroll.scrollTop = 240
  fireEvent.scroll(scroll)
  expect(stateRef.current.scrollTop).toBe(240)
  const wheel = new WheelEvent('wheel', {
    deltaY: 120,
    cancelable: true,
    bubbles: true,
  })
  scroll.dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(false)
})

test('search matches aliases, leaves real controls editable and restores scroll', () => {
  const { scroll } = setup()
  scroll.scrollTop = 240
  fireEvent.scroll(scroll)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search settings' }), {
    target: { value: 'favicon' },
  })
  expect(
    screen.queryByRole('heading', { name: 'Appearance' }),
  ).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: 'Show tab icons' }), {
    target: { value: 'changed' },
  })
  expect(screen.getByRole('textbox', { name: 'Show tab icons' })).toHaveValue(
    'changed',
  )
  expect(scroll.scrollTop).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Clear settings search' }))
  expect(scroll.scrollTop).toBe(240)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search settings' }), {
    target: { value: 'nothingmatches' },
  })
  expect(screen.getByRole('status')).toHaveTextContent('No matching settings')
  expect(
    screen.queryByRole('combobox', { name: 'Jump to section' }),
  ).not.toBeInTheDocument()
})
