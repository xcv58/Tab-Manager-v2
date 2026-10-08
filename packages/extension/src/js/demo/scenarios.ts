// Keep this catalog separate from fixture generation so the website shell can
// describe scenarios without bundling tab data or favicon SVG strings.
export type DemoScenarioId =
  | 'workspace'
  | 'duplicates'
  | 'large'
  | 'empty'
  | 'many-windows'
  | 'uneven-windows'
  | 'single-window'
  | 'one-tab'
  | 'dense-groups'
  | 'sparse-groups'
  | 'ungrouped'
  | 'mixed-states'
  | 'stress'

export type DemoScenarioCategory =
  | 'Workflow'
  | 'Windows and groups'
  | 'Scale and edge cases'

export type DemoScenario = {
  id: DemoScenarioId
  label: string
  title: string
  description: string
  hint: string
  category: DemoScenarioCategory
  // Counts describe the initial fixture. The live workspace reports its own
  // counts after tab, window, or group actions.
  tabCount: number
  windowCount: number
  groupCount: number
  workspaceUrl: string
  resetBehavior: string
  optIn: boolean
}

export const demoResetBehavior =
  'Switching workspaces or choosing Start over restores the sample tabs and demo preferences. Website theme and language stay unchanged.'

export const demoScenarios: ReadonlyArray<DemoScenario> = [
  {
    id: 'workspace',
    label: 'Everyday workspace',
    title: 'An everyday workspace',
    description:
      'Three windows with groups, pinned tabs, and a few duplicates.',
    hint: 'Search “research”, edit a group, or select tabs and move them into a new window. Press ? inside the workspace for shortcuts.',
    category: 'Workflow',
    tabCount: 30,
    windowCount: 3,
    groupCount: 6,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=workspace',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'duplicates',
    label: 'Duplicate cleanup',
    title: 'Duplicates across windows',
    description:
      'Repeated URLs and hash variants across pinned tabs and groups.',
    hint: 'Search “Jenny”, inspect duplicate markers, then use Clean duplicated tabs in the toolbar. Select matching tabs to try bulk actions across windows.',
    category: 'Workflow',
    tabCount: 24,
    windowCount: 3,
    groupCount: 6,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=duplicates',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'large',
    label: 'Large workspace',
    title: 'A crowded workspace',
    description:
      'Six windows for search, bulk actions, and layout exploration.',
    hint: 'Search titles or URLs, change column width, and move matching tabs together.',
    category: 'Scale and edge cases',
    tabCount: 120,
    windowCount: 6,
    groupCount: 12,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=large',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'empty',
    label: 'Empty workspace',
    title: 'A fresh start',
    description: 'Start without tabs, windows, or groups.',
    hint: 'Add a sample tab to create a window, then explore search, selection, and settings.',
    category: 'Scale and edge cases',
    tabCount: 0,
    windowCount: 0,
    groupCount: 0,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=empty',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'many-windows',
    label: 'Many windows',
    title: 'Many small windows',
    description:
      'Twenty windows with one, three, five, eight, or fourteen tabs.',
    hint: 'Collapse windows, change window order, or consolidate matching tabs. Window sizes and group coverage vary.',
    category: 'Windows and groups',
    tabCount: 124,
    windowCount: 20,
    groupCount: 16,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=many-windows',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'uneven-windows',
    label: 'Uneven windows',
    title: 'One large window, seven small ones',
    description: 'A hundred tabs in one window beside seven smaller windows.',
    hint: 'Explore column packing, scrolling, and moving tabs from the largest window into smaller ones.',
    category: 'Windows and groups',
    tabCount: 128,
    windowCount: 8,
    groupCount: 7,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=uneven-windows',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'single-window',
    label: 'One large window',
    title: 'A single large window',
    description:
      'Two hundred and forty tabs, twelve groups, and a pinned section in one window.',
    hint: 'Sort tabs, select a group, or move selected tabs into a second window.',
    category: 'Scale and edge cases',
    tabCount: 240,
    windowCount: 1,
    groupCount: 12,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=single-window',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'one-tab',
    label: 'Just one tab',
    title: 'One window, one tab',
    description: 'The smallest nonempty workspace.',
    hint: 'Close the last tab, then add a sample tab to recreate the workspace. Try pinning, selection, and settings.',
    category: 'Scale and edge cases',
    tabCount: 1,
    windowCount: 1,
    groupCount: 0,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=one-tab',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'dense-groups',
    label: 'Many groups',
    title: 'Groups everywhere',
    description:
      'Twenty-four groups, including unnamed, collapsed, and single-tab groups.',
    hint: 'Search “review” to reveal matches in collapsed groups. Rename unnamed groups, recolor them, or ungroup a single-tab group.',
    category: 'Windows and groups',
    tabCount: 96,
    windowCount: 4,
    groupCount: 24,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=dense-groups',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'sparse-groups',
    label: 'Few groups',
    title: 'Mostly ungrouped tabs',
    description: 'Eight windows and just two small groups.',
    hint: 'Search across grouped and ungrouped tabs, then create new groups from selected tabs in the same window.',
    category: 'Windows and groups',
    tabCount: 112,
    windowCount: 8,
    groupCount: 2,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=sparse-groups',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'ungrouped',
    label: 'No groups',
    title: 'A workspace without groups',
    description:
      'A hundred and twenty tabs across six windows, without native groups.',
    hint: 'Try sorting or clustering tabs by domain, then select tabs in one window and create a group.',
    category: 'Windows and groups',
    tabCount: 120,
    windowCount: 6,
    groupCount: 0,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=ungrouped',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'mixed-states',
    label: 'Different tab types',
    title: 'Apps, media, docs, and reading',
    description:
      'Long and multilingual titles, fallback icons, pins, and representative tab states.',
    hint: 'Explore long and multilingual titles, fallback icons, pins, and groups. Sample audio, loading, and sleeping labels describe simulated states; the extension has no playback or discard controls here.',
    category: 'Workflow',
    tabCount: 42,
    windowCount: 3,
    groupCount: 6,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=mixed-states',
    resetBehavior: demoResetBehavior,
    optIn: false,
  },
  {
    id: 'stress',
    label: 'Stress workspace',
    title: 'A larger simulated workspace',
    description:
      'Fifty windows and a hundred and fifty groups for exploring UI scale.',
    hint: 'This larger sample loads only when selected. Search all 1,500 tabs, scroll across windows, and try bulk actions. It measures the demo UI with simulated data.',
    category: 'Scale and edge cases',
    tabCount: 1500,
    windowCount: 50,
    groupCount: 150,
    workspaceUrl: 'workspace.html?not_popup=1#scenario=stress',
    resetBehavior: demoResetBehavior,
    optIn: true,
  },
]
