import type { DemoScenario, DemoScenarioId } from './scenarios'

type DemoLanguage = 'zh-Hans' | 'zh-Hant'
type ScenarioCopy = Pick<
  DemoScenario,
  'label' | 'title' | 'description' | 'hint'
>

const shellCopy: Record<DemoLanguage, Record<string, string>> = {
  'zh-Hans': {
    'Interactive demo': '交互演示',
    'Sample tabs. Your browser stays untouched.':
      '示例标签页，不影响你的浏览器。',
    'About this workspace': '关于此工作区',
    'Sample workspace': '示例工作区',
    'Add tab': '添加标签页',
    'Try before you install': '安装前先体验',
    'Explore your kind of workspace.': '体验适合你的工作区。',
    'Use the real extension interface with sample tabs. Your browser tabs stay untouched.':
      '使用真实的扩展界面整理示例标签页。你的浏览器标签页不会受到影响。',
    'Sample data only. No extension required.':
      '仅使用示例数据。无需安装扩展。',
    'Choose a workspace': '选择工作区',
    'Refreshing or switching workspaces restores sample tabs and keeps demo settings for this tab’s session. The demo theme is independent of the website theme. Start over also resets demo settings. Website theme and language stay saved.':
      '刷新或切换工作区会恢复示例标签页，并保留此标签页会话中的演示设置。演示主题与网站主题相互独立。“重新开始”也会重置演示设置。网站主题和语言仍会保存。',
    'Starts with': '初始配置',
    'In your workspace': '当前工作区',
    'Add sample tab': '添加示例标签页',
    'Start over': '重新开始',
    'Try this': '试试这些操作',
    'Preparing your sample workspace…': '正在准备示例工作区…',
    'Loading workspace…': '正在加载工作区…',
    'Skip to demo workspace': '跳到演示工作区',
    'That action could not complete. Check browser permissions or try another action.':
      '操作未能完成。请检查浏览器权限或尝试其他操作。',
    'A fresh sample workspace. All changes stay in this page.':
      '全新的示例工作区。所有更改仅保留在本页面中。',
    'The workspace has not loaded. Try Start over.':
      '工作区尚未加载。请尝试“重新开始”。',
    'The workspace could not load. Try Start over.':
      '工作区无法加载。请尝试“重新开始”。',
    'What can I try?': '可以体验哪些功能？',
    'Search titles, URLs, groups, and sample history. Select, pin, move, sort, reload, or close tabs; edit groups; clean duplicates; try commands, shortcuts, themes, and settings.':
      '搜索标题、网址、标签页组和示例历史记录。选择、固定、移动、排序、重新加载或关闭标签页；编辑标签页组；清理重复项；体验命令、快捷键、主题和设置。',
    'Activation, reloads, focus, and history are simulated. Copy actions copy sample URLs. The extension interface is shown in English.':
      '激活、重新加载、焦点和历史记录均为模拟。复制操作会复制示例网址。扩展界面以英文显示。',
    'Simulated scale, not a browser memory benchmark.':
      '这是模拟规模演示，不是浏览器内存基准测试。',
    Workflow: '常用流程',
    'Windows and groups': '窗口与标签页组',
    'Scale and edge cases': '规模与边界情况',
  },
  'zh-Hant': {
    'Interactive demo': '互動示範',
    'Sample tabs. Your browser stays untouched.':
      '範例分頁，不影響你的瀏覽器。',
    'About this workspace': '關於此工作區',
    'Sample workspace': '範例工作區',
    'Add tab': '新增分頁',
    'Try before you install': '安裝前先體驗',
    'Explore your kind of workspace.': '體驗適合你的工作區。',
    'Use the real extension interface with sample tabs. Your browser tabs stay untouched.':
      '使用真實的擴充功能介面整理範例分頁。你的瀏覽器分頁不會受到影響。',
    'Sample data only. No extension required.':
      '僅使用範例資料。無需安裝擴充功能。',
    'Choose a workspace': '選擇工作區',
    'Refreshing or switching workspaces restores sample tabs and keeps demo settings for this tab’s session. The demo theme is independent of the website theme. Start over also resets demo settings. Website theme and language stay saved.':
      '重新整理或切換工作區會還原範例分頁，並保留此分頁工作階段中的示範設定。示範主題與網站主題相互獨立。「重新開始」也會重設示範設定。網站主題和語言仍會儲存。',
    'Starts with': '初始配置',
    'In your workspace': '目前工作區',
    'Add sample tab': '新增範例分頁',
    'Start over': '重新開始',
    'Try this': '試試這些操作',
    'Preparing your sample workspace…': '正在準備範例工作區…',
    'Loading workspace…': '正在載入工作區…',
    'Skip to demo workspace': '跳到示範工作區',
    'That action could not complete. Check browser permissions or try another action.':
      '操作未能完成。請檢查瀏覽器權限或嘗試其他操作。',
    'A fresh sample workspace. All changes stay in this page.':
      '全新的範例工作區。所有變更僅保留在本頁面中。',
    'The workspace has not loaded. Try Start over.':
      '工作區尚未載入。請嘗試「重新開始」。',
    'The workspace could not load. Try Start over.':
      '工作區無法載入。請嘗試「重新開始」。',
    'What can I try?': '可以體驗哪些功能？',
    'Search titles, URLs, groups, and sample history. Select, pin, move, sort, reload, or close tabs; edit groups; clean duplicates; try commands, shortcuts, themes, and settings.':
      '搜尋標題、網址、分頁群組和範例歷史紀錄。選取、固定、移動、排序、重新載入或關閉分頁；編輯分頁群組；清理重複項目；體驗指令、快速鍵、主題和設定。',
    'Activation, reloads, focus, and history are simulated. Copy actions copy sample URLs. The extension interface is shown in English.':
      '啟用、重新載入、焦點和歷史紀錄均為模擬。複製操作會複製範例網址。擴充功能介面以英文顯示。',
    'Simulated scale, not a browser memory benchmark.':
      '這是模擬規模示範，不是瀏覽器記憶體基準測試。',
    Workflow: '常用流程',
    'Windows and groups': '視窗與分頁群組',
    'Scale and edge cases': '規模與邊界情況',
  },
}

const scenarioCopy: Record<
  DemoLanguage,
  Record<DemoScenarioId, ScenarioCopy>
> = {
  'zh-Hans': {
    workspace: {
      label: '日常工作区',
      title: '日常使用的工作区',
      description: '三个窗口，包含标签页组、固定标签页和少量重复项。',
      hint: '搜索“research”、编辑标签页组，或选择标签页并移到新窗口。在工作区内按 ? 查看快捷键。',
    },
    duplicates: {
      label: '清理重复项',
      title: '跨窗口的重复标签页',
      description: '固定标签页和标签页组中包含重复网址及不同网址片段。',
      hint: '搜索“Jenny”、查看重复标记，再使用工具栏中的 Clean duplicated tabs 清理重复标签页。选择匹配项来体验跨窗口批量操作。',
    },
    large: {
      label: '大型工作区',
      title: '拥挤的工作区',
      description: '六个窗口，用于体验搜索、批量操作和布局。',
      hint: '搜索标题或网址，调整列宽，并一起移动匹配的标签页。',
    },
    empty: {
      label: '空工作区',
      title: '全新开始',
      description: '从没有标签页、窗口或标签页组的状态开始。',
      hint: '添加示例标签页来创建窗口，然后体验搜索、选择和设置。',
    },
    'many-windows': {
      label: '多个窗口',
      title: '多个小窗口',
      description: '二十个窗口，每个包含一个、三个、五个、八个或十四个标签页。',
      hint: '折叠窗口、调整窗口顺序，或合并匹配的标签页。窗口大小和分组情况各不相同。',
    },
    'uneven-windows': {
      label: '大小不一的窗口',
      title: '一个大窗口，七个小窗口',
      description: '一个窗口包含一百个标签页，旁边还有七个较小的窗口。',
      hint: '体验列布局、滚动，以及将最大窗口中的标签页移入较小的窗口。',
    },
    'single-window': {
      label: '单个大型窗口',
      title: '一个大窗口',
      description:
        '一个窗口中有二百四十个标签页、十二个标签页组和固定标签页区域。',
      hint: '排序标签页、选择标签页组，或将所选标签页移入第二个窗口。',
    },
    'one-tab': {
      label: '仅一个标签页',
      title: '一个窗口，一个标签页',
      description: '最小的非空工作区。',
      hint: '关闭最后一个标签页，再添加示例标签页重建工作区。试试固定、选择和设置。',
    },
    'dense-groups': {
      label: '多个标签页组',
      title: '到处都是标签页组',
      description: '二十四个标签页组，包含未命名、已折叠和仅有一个标签页的组。',
      hint: '搜索“review”来显示已折叠组中的匹配项。为未命名组重命名、更改颜色，或取消单标签页组的分组。',
    },
    'sparse-groups': {
      label: '少量标签页组',
      title: '大部分标签页未分组',
      description: '八个窗口，只有两个小标签页组。',
      hint: '搜索已分组和未分组的标签页，再用同一窗口中的所选标签页创建新组。',
    },
    ungrouped: {
      label: '没有标签页组',
      title: '没有分组的工作区',
      description: '六个窗口中有一百二十个标签页，没有原生标签页组。',
      hint: '试试排序或按域名整理标签页，再选择同一窗口中的标签页并创建组。',
    },
    'mixed-states': {
      label: '不同类型的标签页',
      title: '应用、媒体、文档和阅读',
      description: '长标题和多语言标题、默认图标、固定标签页及典型标签页状态。',
      hint: '体验长标题和多语言标题、默认图标、固定标签页及标签页组。示例中的音频、加载和休眠标签描述模拟状态；这里的扩展界面没有播放或释放标签页内存的控制。',
    },
    stress: {
      label: '压力测试工作区',
      title: '更大的模拟工作区',
      description: '五十个窗口和一百五十个标签页组，用于体验大规模界面。',
      hint: '这个较大的示例仅在选择后加载。搜索全部 1,500 个标签页、跨窗口滚动并体验批量操作。这是使用模拟数据的界面演示。',
    },
  },
  'zh-Hant': {
    workspace: {
      label: '日常工作區',
      title: '日常使用的工作區',
      description: '三個視窗，包含分頁群組、固定分頁和少量重複項目。',
      hint: '搜尋「research」、編輯分頁群組，或選取分頁並移到新視窗。在工作區內按 ? 查看快速鍵。',
    },
    duplicates: {
      label: '清理重複項目',
      title: '跨視窗的重複分頁',
      description: '固定分頁和分頁群組中包含重複網址及不同網址片段。',
      hint: '搜尋「Jenny」、查看重複標記，再使用工具列中的 Clean duplicated tabs 清理重複分頁。選取符合項目來體驗跨視窗批次操作。',
    },
    large: {
      label: '大型工作區',
      title: '擁擠的工作區',
      description: '六個視窗，用於體驗搜尋、批次操作和版面配置。',
      hint: '搜尋標題或網址，調整欄寬，並一起移動符合的分頁。',
    },
    empty: {
      label: '空工作區',
      title: '全新開始',
      description: '從沒有分頁、視窗或分頁群組的狀態開始。',
      hint: '新增範例分頁來建立視窗，然後體驗搜尋、選取和設定。',
    },
    'many-windows': {
      label: '多個視窗',
      title: '多個小視窗',
      description: '二十個視窗，每個包含一個、三個、五個、八個或十四個分頁。',
      hint: '折疊視窗、調整視窗順序，或合併符合的分頁。視窗大小和分組情況各不相同。',
    },
    'uneven-windows': {
      label: '大小不一的視窗',
      title: '一個大視窗，七個小視窗',
      description: '一個視窗包含一百個分頁，旁邊還有七個較小的視窗。',
      hint: '體驗欄位配置、捲動，以及將最大視窗中的分頁移入較小的視窗。',
    },
    'single-window': {
      label: '單個大型視窗',
      title: '一個大視窗',
      description: '一個視窗中有二百四十個分頁、十二個分頁群組和固定分頁區域。',
      hint: '排序分頁、選取分頁群組，或將所選分頁移入第二個視窗。',
    },
    'one-tab': {
      label: '僅一個分頁',
      title: '一個視窗，一個分頁',
      description: '最小的非空工作區。',
      hint: '關閉最後一個分頁，再新增範例分頁重建工作區。試試固定、選取和設定。',
    },
    'dense-groups': {
      label: '多個分頁群組',
      title: '到處都是分頁群組',
      description: '二十四個分頁群組，包含未命名、已折疊和僅有一個分頁的群組。',
      hint: '搜尋「review」來顯示已折疊群組中的符合項目。為未命名群組重新命名、更改顏色，或取消單分頁群組的分組。',
    },
    'sparse-groups': {
      label: '少量分頁群組',
      title: '大部分分頁未分組',
      description: '八個視窗，只有兩個小分頁群組。',
      hint: '搜尋已分組和未分組的分頁，再用同一視窗中的所選分頁建立新群組。',
    },
    ungrouped: {
      label: '沒有分頁群組',
      title: '沒有分組的工作區',
      description: '六個視窗中有一百二十個分頁，沒有原生分頁群組。',
      hint: '試試排序或按網域整理分頁，再選取同一視窗中的分頁並建立群組。',
    },
    'mixed-states': {
      label: '不同類型的分頁',
      title: '應用程式、媒體、文件和閱讀',
      description: '長標題和多語言標題、預設圖示、固定分頁及典型分頁狀態。',
      hint: '體驗長標題和多語言標題、預設圖示、固定分頁及分頁群組。範例中的音訊、載入和休眠標籤描述模擬狀態；這裡的擴充功能介面沒有播放或釋放分頁記憶體的控制。',
    },
    stress: {
      label: '壓力測試工作區',
      title: '更大的模擬工作區',
      description: '五十個視窗和一百五十個分頁群組，用於體驗大規模介面。',
      hint: '這個較大的範例僅在選取後載入。搜尋全部 1,500 個分頁、跨視窗捲動並體驗批次操作。這是使用模擬資料的介面示範。',
    },
  },
}

const isDemoLanguage = (language: string): language is DemoLanguage =>
  language === 'zh-Hans' || language === 'zh-Hant'

export const demoText = (english: string, language: string): string =>
  isDemoLanguage(language) ? (shellCopy[language][english] ?? english) : english

export const localizeScenario = (
  scenario: DemoScenario,
  language: string,
): DemoScenario =>
  isDemoLanguage(language)
    ? { ...scenario, ...scenarioCopy[language][scenario.id] }
    : scenario
