import '../css/demo.css'
import { demoScenarios, type DemoScenario } from './demo/scenarios'
import { demoText, localizeScenario } from './demo/copy'
import { clearDemoPreferences } from './demo/preferences'

type SitePreferences = {
  getLanguage: () => string
  getTheme: () => string
  setTheme: (theme: string) => void
}
const site = (window as Window & { TabManagerSite?: SitePreferences })
  .TabManagerSite
const language = () => site?.getLanguage() || 'en'
const theme = () => site?.getTheme() || 'system'
const text = (english: string) => demoText(english, language())
let frame = document.querySelector<HTMLIFrameElement>('#demo-frame')!
const scenario = document.querySelector<HTMLSelectElement>('#scenario')!
const loading = document.querySelector<HTMLElement>('#demo-loading')!
const counts = document.querySelector<HTMLElement>('#demo-counts')!
const activity = document.querySelector<HTMLElement>('#demo-activity')!
const hint = document.querySelector<HTMLElement>('#scenario-hint')!
const title = document.querySelector<HTMLElement>('#scenario-title')!
const description = document.querySelector<HTMLElement>(
  '#scenario-description',
)!
const size = document.querySelector<HTMLElement>('#scenario-size')!
const stress = document.querySelector<HTMLElement>('#scenario-stress')!
const addTab = document.querySelector<HTMLButtonElement>('#add-tab')!
const reset = document.querySelector<HTMLButtonElement>('#reset-demo')!
const about = document.querySelector<HTMLDetailsElement>('#demo-about')!
const guide = about.querySelector<HTMLElement>('.demo-guide')!
const fitGuide = () => {
  if (!about.open) return
  const trigger = about.querySelector('summary')!.getBoundingClientRect()
  if (trigger.bottom < 0 || trigger.top > window.innerHeight) {
    about.open = false
    return
  }
  const below = window.innerHeight - trigger.bottom - 28
  const above = trigger.top - 28
  const opensAbove = below < 160 && above > below
  guide.style.top = opensAbove ? 'auto' : 'calc(100% + 12px)'
  guide.style.bottom = opensAbove ? 'calc(100% + 12px)' : 'auto'
  guide.style.maxHeight = `${Math.min(520, Math.max(0, opensAbove ? above : below))}px`
}

const requested = new URL(window.location.href).searchParams.get('scenario')
let selected: DemoScenario =
  demoScenarios.find((item) => item.id === requested) || demoScenarios[0]
let loadingTimer: ReturnType<typeof setTimeout>
let awaitingReady = true
let failed = false
let loadingCopy = 'Preparing your sample workspace…'
let activityCopy = 'A fresh sample workspace. All changes stay in this page.'
let currentCounts: {
  tabCount: number
  windowCount: number
  groupCount: number
} | null = null

const formatCounts = (state: NonNullable<typeof currentCounts>) => {
  const number = new Intl.NumberFormat(language())
  if (language() === 'zh-Hans')
    return `${number.format(state.tabCount)} 个标签页 · ${number.format(state.windowCount)} 个窗口 · ${number.format(state.groupCount)} 个组`
  if (language() === 'zh-Hant')
    return `${number.format(state.tabCount)} 個分頁 · ${number.format(state.windowCount)} 個視窗 · ${number.format(state.groupCount)} 個群組`
  return [
    `${number.format(state.tabCount)} ${state.tabCount === 1 ? 'tab' : 'tabs'}`,
    `${number.format(state.windowCount)} ${state.windowCount === 1 ? 'window' : 'windows'}`,
    `${number.format(state.groupCount)} ${state.groupCount === 1 ? 'group' : 'groups'}`,
  ].join(' · ')
}
const formatTabs = (tabCount: number) => {
  const count = new Intl.NumberFormat(language()).format(tabCount)
  if (language() === 'zh-Hans') return `${count} 个标签页`
  if (language() === 'zh-Hant') return `${count} 個分頁`
  return `${count} ${tabCount === 1 ? 'tab' : 'tabs'}`
}

const renderCopy = () => {
  document.querySelectorAll<HTMLElement>('[data-demo-copy]').forEach((node) => {
    node.textContent = text(node.dataset.demoCopy!)
  })
  about.querySelector('summary')!.title = text('About this workspace')
  const groups = new Map<string, HTMLOptGroupElement>()
  scenario.replaceChildren()
  ;['Workflow', 'Windows and groups', 'Scale and edge cases'].forEach(
    (category) => {
      const group = document.createElement('optgroup')
      group.label = text(category)
      groups.set(category, group)
      scenario.append(group)
    },
  )
  demoScenarios.forEach((item) => {
    let group = groups.get(item.category)
    if (!group) {
      group = document.createElement('optgroup')
      group.label = text(item.category)
      groups.set(item.category, group)
      scenario.append(group)
    }
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = `${localizeScenario(item, language()).label} · ${formatTabs(item.tabCount)}`
    group.append(option)
  })
  scenario.value = selected.id
  const copy = localizeScenario(selected, language())
  title.textContent = copy.title
  description.textContent = copy.description
  hint.textContent = `${text('Try this')}: ${copy.hint}`
  size.textContent = `${text('Starts with')}: ${formatCounts(selected)}`
  stress.hidden = !selected.optIn
  counts.textContent = currentCounts
    ? formatCounts(currentCounts)
    : text('Loading workspace…')
  loading.textContent = text(loadingCopy)
  activity.textContent = text(activityCopy)
  document.title =
    site?.getLanguage() === 'zh-Hans'
      ? '试用 Tab Manager v2 · 交互演示'
      : site?.getLanguage() === 'zh-Hant'
        ? '試用 Tab Manager v2 · 互動示範'
        : 'Try Tab Manager v2 · Interactive demo'
  fitGuide()
}

const sendTheme = () =>
  frame.contentWindow?.postMessage(
    { type: 'demo:theme', theme: theme() },
    window.location.origin,
  )

const loadWorkspace = () => {
  clearTimeout(loadingTimer)
  selected =
    demoScenarios.find((item) => item.id === scenario.value) || demoScenarios[0]
  const url = new URL(window.location.href)
  url.searchParams.set('scenario', selected.id)
  window.history.replaceState(null, '', url.href)
  awaitingReady = true
  failed = false
  currentCounts = null
  loading.hidden = false
  loadingCopy = 'Preparing your sample workspace…'
  activityCopy = 'A fresh sample workspace. All changes stay in this page.'
  addTab.disabled = true
  renderCopy()
  // Fixed catalog URLs keep DOM text out of the iframe URL. Replacing the frame
  // discards sample stores while session configuration and website preferences
  // remain available to the fresh frame.
  const nextFrame = frame.cloneNode(false) as HTMLIFrameElement
  nextFrame.src = `${selected.workspaceUrl}&theme=${theme()}`
  frame.replaceWith(nextFrame)
  frame = nextFrame
  loadingTimer = setTimeout(() => {
    loadingCopy = 'The workspace has not loaded. Try Start over.'
    loading.textContent = text(loadingCopy)
  }, 20000)
}

window.addEventListener('message', (event) => {
  if (
    event.origin !== window.location.origin ||
    event.source !== frame.contentWindow
  )
    return
  if (event.data?.type === 'demo:state' && !failed) {
    clearTimeout(loadingTimer)
    loading.hidden = true
    addTab.disabled = false
    currentCounts = event.data.state
    counts.textContent = formatCounts(currentCounts!)
    if (event.data.state.activity) activityCopy = event.data.state.activity
    activity.textContent = text(activityCopy)
    if (awaitingReady) {
      awaitingReady = false
      sendTheme()
    }
  }
  if (event.data?.type === 'demo:theme-selection' && !failed) {
    const nextTheme = event.data.theme
    if (
      ['system', 'light', 'dark'].includes(nextTheme) &&
      site?.getTheme() !== nextTheme
    )
      site?.setTheme(nextTheme)
  }
  if (event.data?.type === 'demo:error') {
    failed = true
    addTab.disabled = true
    clearTimeout(loadingTimer)
    loading.hidden = false
    loadingCopy = 'The workspace could not load. Try Start over.'
    loading.textContent = text(loadingCopy)
  }
  if (event.data?.type === 'demo:operation-error' && !failed) {
    activityCopy =
      'That action could not complete. Check browser permissions or try another action.'
    activity.textContent = text(activityCopy)
  }
})
scenario.addEventListener('change', loadWorkspace)
reset.addEventListener('click', () => {
  clearDemoPreferences()
  loadWorkspace()
})
about.addEventListener('toggle', fitGuide)
window.addEventListener('resize', fitGuide)
window.addEventListener('scroll', fitGuide, { passive: true })
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !about.contains(event.target))
    about.open = false
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && about.open) {
    about.open = false
    about.querySelector('summary')!.focus()
  }
})
window.addEventListener('blur', () => {
  if (document.activeElement === frame) about.open = false
})
addTab.addEventListener('click', () => {
  frame.contentWindow?.postMessage(
    { type: 'demo:add-tab' },
    window.location.origin,
  )
})
document.addEventListener('site:theme-change', sendTheme)
document.addEventListener('site:language-change', renderCopy)
document
  .querySelector('#workspace')!
  .addEventListener('focus', () => frame.focus())
renderCopy()
loadWorkspace()
