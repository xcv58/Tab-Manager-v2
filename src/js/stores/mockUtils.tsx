const getId = () => Math.round(Math.random() * 1000 * 1000)

type Input = { windowId: number; index: number }
const getMockedTab = ({ windowId, index }: Input) => {
  return {
    id: getId(),
    windowId,
    index,
    active: false,
    audible: false,
    autoDiscardable: true,
    discarded: false,
    favIconUrl: 'https://tailwindcss.com/favicon-32x32.png',
    height: 1080,
    highlighted: false,
    incognito: false,
    mutedInfo: {
      muted: false
    },
    pinned: false,
    selected: false,
    status: 'complete',
    title: 'Hover, Focus, and Active Styles - Tailwind CSS',
    url: 'https://tailwindcss.com/course/hover-focus-and-active-styles',
    width: 1920
  }
}

const getMockedWindow = (tabNum = 10) => {
  const windowId = getId()
  const tabs = [...Array(tabNum)].map((_, index) =>
    getMockedTab({ windowId, index })
  )
  const win = {
    id: windowId,
    tabs,
    alwaysOnTop: false,
    focused: false,
    height: 1080,
    incognito: false,
    left: 0,
    state: 'normal',
    top: 0,
    type: 'normal',
    width: 1920
  }
  return win
}

export const getMockedWindows = (num = 10) =>
  [...Array(num)].map((_) => getMockedWindow(Math.round(Math.random() * 50)))
