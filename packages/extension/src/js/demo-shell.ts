import '../css/demo.css'

let frame = document.querySelector<HTMLIFrameElement>('#demo-frame')!
const scenario = document.querySelector<HTMLSelectElement>('#scenario')!
const loading = document.querySelector<HTMLElement>('#demo-loading')!
const counts = document.querySelector<HTMLElement>('#demo-counts')!
const activity = document.querySelector<HTMLElement>('#demo-activity')!
const hint = document.querySelector<HTMLElement>('#scenario-hint')!
const addTab = document.querySelector<HTMLButtonElement>('#add-tab')!
const reset = document.querySelector<HTMLButtonElement>('#reset-demo')!

const hints: Record<string, string> = {
  workspace:
    'Try searching “research”, editing a group, or selecting tabs and moving them into a new window. Press ? inside the workspace for shortcuts.',
  duplicates:
    'Find duplicate markers, then use “Clean duplicated tabs” in the toolbar. Select matching tabs to try bulk actions.',
  large:
    'Explore a crowded workspace: search, change the column width, and move matching tabs together.',
  empty:
    'Start with a clean workspace. Add a sample tab, then explore search, selection, and settings.',
}

let loadingTimer: ReturnType<typeof setTimeout>
const workspaceUrl = (selectedScenario: string) => {
  // Keep DOM-controlled text out of iframe URLs, including unexpected values.
  switch (selectedScenario) {
    case 'duplicates':
      return 'workspace.html?not_popup=1#scenario=duplicates'
    case 'large':
      return 'workspace.html?not_popup=1#scenario=large'
    case 'empty':
      return 'workspace.html?not_popup=1#scenario=empty'
    default:
      return 'workspace.html?not_popup=1#scenario=workspace'
  }
}

const loadWorkspace = () => {
  clearTimeout(loadingTimer)
  hint.textContent = hints[scenario.value]
  loading.hidden = false
  loading.textContent = 'Preparing your sample workspace…'
  counts.textContent = 'Loading workspace…'
  activity.textContent =
    'A fresh sample workspace. All changes stay in this page.'
  addTab.disabled = true
  // A hash-only navigation keeps the old document and its stores alive. A new
  // browsing context guarantees that reset/scenario changes discard all state.
  const nextFrame = frame.cloneNode(false) as HTMLIFrameElement
  nextFrame.src = workspaceUrl(scenario.value)
  frame.replaceWith(nextFrame)
  frame = nextFrame
  loadingTimer = setTimeout(() => {
    loading.textContent =
      'The workspace has not loaded. Try Start over, or check the local server output.'
  }, 20000)
}

window.addEventListener('message', (event) => {
  if (
    event.origin !== window.location.origin ||
    event.source !== frame.contentWindow
  )
    return
  if (event.data?.type === 'demo:state') {
    clearTimeout(loadingTimer)
    loading.hidden = true
    addTab.disabled = false
    const state = event.data.state
    counts.textContent = [
      `${state.tabCount} ${state.tabCount === 1 ? 'tab' : 'tabs'}`,
      `${state.windowCount} ${state.windowCount === 1 ? 'window' : 'windows'}`,
      `${state.groupCount} ${state.groupCount === 1 ? 'group' : 'groups'}`,
    ].join(' · ')
    if (state.activity) activity.textContent = state.activity
  }
  if (event.data?.type === 'demo:error') {
    clearTimeout(loadingTimer)
    loading.hidden = false
    loading.textContent =
      'The workspace could not load. Try Start over, or check the local server output.'
  }
})
scenario.addEventListener('change', loadWorkspace)
reset.addEventListener('click', loadWorkspace)
addTab.addEventListener('click', () => {
  frame.contentWindow?.postMessage(
    { type: 'demo:add-tab' },
    window.location.origin,
  )
})
document
  .querySelector('#workspace')!
  .addEventListener('focus', () => frame.focus())
loadWorkspace()
