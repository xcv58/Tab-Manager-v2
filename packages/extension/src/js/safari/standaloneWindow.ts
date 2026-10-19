import { getPopupWindowBounds } from 'libs/popupWindow'

const safari = (globalThis as any).browser
const managerURL = new URL(safari.runtime.getURL('popup.html'))
managerURL.searchParams.set('not_popup', '1')
let pending: Promise<unknown> | null = null

const isManager = (win: any) =>
  win.type === 'popup' &&
  win.tabs?.length === 1 &&
  [win.tabs[0].url, win.tabs[0].pendingUrl].includes(managerURL.href)

const toggle = async () => {
  const windows = (await safari.windows.getAll({ populate: true })).filter(
    (win: any) => !win.incognito,
  )
  const manager = windows.find(isManager)
  if (manager) {
    if (!manager.focused)
      return safari.windows.update(manager.id, { focused: true })
    const { lastFocusedWindowId } = await safari.storage.local.get(
      'lastFocusedWindowId',
    )
    const previous =
      windows.find(
        (win: any) => win.id === lastFocusedWindowId && !isManager(win),
      ) || windows.find((win: any) => !isManager(win))
    if (previous) return safari.windows.update(previous.id, { focused: true })
    return manager
  }
  const screen = await safari.storage.local.get([
    'availWidth',
    'availHeight',
    'availLeft',
    'availTop',
  ])
  return safari.windows.create({
    type: 'popup',
    url: managerURL.href,
    ...getPopupWindowBounds(screen),
  })
}

// Repeated shortcuts cannot create several windows while Safari is responding.
export const toggleStandaloneWindow = () => {
  if (!pending)
    pending = toggle().finally(() => {
      pending = null
    })
  return pending
}
