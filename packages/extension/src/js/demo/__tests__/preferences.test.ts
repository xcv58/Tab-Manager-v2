import {
  readDemoPreferences,
  saveDemoPreferences,
  sanitizePreferences,
} from '../preferences'

afterEach(() => window.sessionStorage.clear())

it.each([1, 3, 5, 'full'])(
  'retains a valid title limit of %s independently from URL limits',
  (titleLimit) => {
    expect(
      sanitizePreferences({
        tabTooltipTitleLines: titleLimit,
        tabTooltipUrlLines: 'full',
        tabs: [{ title: 'Private browser state' }],
      }),
    ).toEqual({ tabTooltipTitleLines: titleLimit, tabTooltipUrlLines: 'full' })
  },
)

it('drops invalid limits and restores only allowed preferences from storage', () => {
  expect(
    sanitizePreferences({ tabTooltipTitleLines: '5', tabTooltipUrlLines: 99 }),
  ).toEqual({})
  saveDemoPreferences({
    tabTooltipTitleLines: 1,
    tabTooltipUrlLines: 5,
    showTabTooltip: true,
    history: ['private'],
  })
  expect(readDemoPreferences()).toEqual({
    tabTooltipTitleLines: 1,
    tabTooltipUrlLines: 5,
    showTabTooltip: true,
  })
})

it('restores simulated icon access and the shared preference without saving website access or tab data', () => {
  saveDemoPreferences({
    demoWebsiteIconAccess: true,
    showTabIcon: true,
    loadWebsiteIcons: true,
    origins: ['https://private.example/*'],
    tabs: [{ url: 'https://private.example' }],
  })
  expect(readDemoPreferences()).toEqual({
    demoWebsiteIconAccess: true,
    showTabIcon: true,
  })
  saveDemoPreferences({ demoWebsiteIconAccess: false, showTabIcon: false })
  expect(readDemoPreferences()).toEqual({
    demoWebsiteIconAccess: false,
    showTabIcon: false,
  })
  expect(sanitizePreferences({ demoWebsiteIconAccess: 'true' })).toEqual({})
})
