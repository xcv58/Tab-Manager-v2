document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement
  const body = document.body
  const prefersDarkMedia = window.matchMedia('(prefers-color-scheme: dark)')
  const themeAnnouncement = document.getElementById('theme-announcement')
  const languageAnnouncement = document.getElementById('language-announcement')
  const languageSelector = document.getElementById('language-selector')
  const themeButtons = {
    system: document.getElementById('btn-system'),
    light: document.getElementById('btn-light'),
    dark: document.getElementById('btn-dark'),
  }
  const screenshotThemeButtons = {
    light: document.getElementById('screenshot-btn-light'),
    dark: document.getElementById('screenshot-btn-dark'),
  }
  const screenshotThemeAnnouncement = document.getElementById(
    'screenshot-theme-announcement',
  )
  const screenshotVariantFrames = Array.from(
    document.querySelectorAll('.screenshot-variant'),
  )
  const promoVideo = document.querySelector('.promo-video')
  const disclosureVideos = Array.from(
    document.querySelectorAll('.scale-demo-disclosure'),
  )
  const videoChapterButtons = Array.from(
    document.querySelectorAll('.video-tour-chapter'),
  )
  const supportedThemes = new Set(Object.keys(themeButtons))
  const languageStorageKey = 'site-language'
  const fallbackLanguage = 'en'
  const languageOptions = {
    en: {
      htmlLang: 'en',
      announcement: 'English selected',
    },
    'zh-Hans': {
      htmlLang: 'zh-Hans',
      announcement: '已切换为简体中文',
    },
    'zh-Hant': {
      htmlLang: 'zh-Hant',
      announcement: '已切換為繁體中文',
    },
  }
  const localizedAnnouncements = {
    en: {
      theme: {
        system: 'System theme selected',
        light: 'Light theme selected',
        dark: 'Dark theme selected',
      },
      screenshotTheme: {
        light: 'Light screenshots selected',
        dark: 'Dark screenshots selected',
      },
    },
    'zh-Hans': {
      theme: {
        system: '已选择跟随系统主题',
        light: '已选择浅色主题',
        dark: '已选择深色主题',
      },
      screenshotTheme: {
        light: '已选择浅色截图',
        dark: '已选择深色截图',
      },
    },
    'zh-Hant': {
      theme: {
        system: '已選擇跟隨系統主題',
        light: '已選擇淺色主題',
        dark: '已選擇深色主題',
      },
      screenshotTheme: {
        light: '已選擇淺色截圖',
        dark: '已選擇深色截圖',
      },
    },
  }
  const supportedLanguages = new Set(Object.keys(languageOptions))
  const localizedCopy = {
    'zh-Hans': {
      'Tab Manager v2 - See every tab across every window.':
        'Tab Manager v2 - 一次看清所有窗口里的标签页。',
      'Turn crowded browser sessions into a searchable workspace. Find tabs fast, move matches in bulk, manage native tab groups where supported by the browser, and clean up duplicates.':
        '把拥挤的浏览器会话整理成可搜索的工作区。快速找到标签页，批量移动匹配项，在浏览器支持时管理原生标签页组，并清理重复标签页。',
      'tab manager, browser extension, chrome extension, firefox add-on, edge extension, tab groups, duplicate tabs, keyboard shortcuts':
        '标签页管理器, 浏览器扩展, Chrome 扩展, Firefox 附加组件, Edge 扩展, 标签页组, 重复标签页, 快捷键',
      'See every tab across every window, then search, group, move, and clean up tabs without window hopping, including native tab groups where supported by the browser.':
        '一次看清所有窗口里的标签页，然后无需来回切换窗口，就能搜索、分组、移动并清理标签页；在浏览器支持时也能管理原生标签页组。',
      'Turn crowded browser sessions into a searchable workspace with fast search, bulk actions, duplicate cleanup, and native tab groups where supported by the browser.':
        '把拥挤的浏览器会话变成可搜索的工作区，支持快速搜索、批量操作、重复标签页清理，并可在浏览器支持时管理原生标签页组。',
      'Skip to main content': '跳到主要内容',
      Language: '语言',
      'Choose language': '选择语言',
      'Main navigation': '主导航',
      Privacy: '隐私',
      Support: '支持',
      'Theme Toggle': '主题切换',
      'System Theme': '跟随系统主题',
      'Light Theme': '浅色主题',
      'Dark Theme': '深色主题',
      'Match System': '跟随系统',
      'Light Mode': '浅色模式',
      'Dark Mode': '深色模式',
      'Too many tabs, handled.': '标签页再多，也能理清。',
      'See every tab across every window in one searchable workspace.':
        '在一个可搜索的工作区里查看所有窗口中的标签页。',
      'Find tabs fast, move matching tabs in bulk, manage native tab groups where supported by the browser, and clean up duplicates without window hopping.':
        '快速找到标签页，批量移动匹配结果，在浏览器支持时管理原生标签页组，并清理重复标签页，不用在窗口之间来回切换。',
      'Free, open source, with core functionality running locally in your browser.':
        '免费、开源，核心功能都在你的浏览器本地运行。',
      'Get Tab Manager v2 for Chrome': '获取 Chrome 版 Tab Manager v2',
      'Get Tab Manager v2 for Firefox': '获取 Firefox 版 Tab Manager v2',
      'Get Tab Manager v2 for Edge': '获取 Edge 版 Tab Manager v2',
      'Open Tab Manager v2 overview screenshot': '打开 Tab Manager v2 总览截图',
      'Cross-window overview': '跨窗口总览',
      'Overview screenshot in light theme with grouped tabs across multiple windows':
        '浅色主题下跨多个窗口显示标签页组的总览截图',
      'Overview screenshot in dark theme with grouped tabs across multiple windows':
        '深色主题下跨多个窗口显示标签页组的总览截图',
      Screenshots: '截图',
      'Preview light and dark screenshots.': '预览浅色和深色截图。',
      'Screenshot Theme Toggle': '截图主题切换',
      Light: '浅色',
      Dark: '深色',
      'Show light screenshots': '显示浅色截图',
      'Show dark screenshots': '显示深色截图',
      'Open tab group editing screenshot': '打开标签页组编辑截图',
      'Edit native tab groups': '编辑原生标签页组',
      'Tab group editing screenshot in light theme':
        '浅色主题下的标签页组编辑截图',
      'Tab group editing screenshot in dark theme':
        '深色主题下的标签页组编辑截图',
      'Edit native tab groups where supported by the browser.':
        '在浏览器支持时，直接编辑原生标签页组。',
      'Open search with tab groups screenshot': '打开标签页组搜索截图',
      'Search across windows and groups': '跨窗口和标签页组搜索',
      'Search across grouped tabs in light theme':
        '浅色主题下跨已分组标签页搜索的截图',
      'Search across grouped tabs in dark theme':
        '深色主题下跨已分组标签页搜索的截图',
      'Search across windows and grouped tabs from one place.':
        '从一个地方搜索多个窗口和已分组的标签页。',
      'Open duplicate cleanup screenshot': '打开重复标签页清理截图',
      'Duplicate cleanup': '重复标签页清理',
      'Duplicate tab cleanup screenshot in light theme':
        '浅色主题下的重复标签页清理截图',
      'Duplicate tab cleanup screenshot in dark theme':
        '深色主题下的重复标签页清理截图',
      'Spot duplicate tabs fast and close them in bulk.':
        '快速找出重复标签页，并批量关闭。',
      'Open keyboard shortcuts screenshot': '打开快捷键截图',
      'Keyboard shortcuts': '快捷键',
      'Keyboard shortcuts screenshot in light theme': '浅色主题下的快捷键截图',
      'Keyboard shortcuts screenshot in dark theme': '深色主题下的快捷键截图',
      'Learn the shortcut map without leaving the interface.':
        '不用离开界面，就能查看快捷键说明。',
      'Open grouped tabs support screenshot': '打开标签页组聚焦截图',
      'Focused group view': '聚焦标签页组视图',
      'Grouped tabs support screenshot in light theme':
        '浅色主题下的标签页组聚焦截图',
      'Grouped tabs support screenshot in dark theme':
        '深色主题下的标签页组聚焦截图',
      'Stay oriented inside large native tab groups where supported by the browser.':
        '在浏览器支持时，即使原生标签页组很大，也能保持清楚。',
      'Open settings screenshot': '打开设置截图',
      'Customize the view': '自定义视图',
      'Settings screenshot in light theme': '浅色主题下的设置截图',
      'Settings screenshot in dark theme': '深色主题下的设置截图',
      'Adjust the view to match your workflow.': '按照你的使用习惯调整视图。',
      'See It In Motion': '看看实际操作',
      'Watch Tab Manager v2 in action.': '看看 Tab Manager v2 怎么工作。',
      'Search, clean up, organize, and customize tabs in one quick walkthrough, then see how it handles a crowded workspace.':
        '用一段快速导览了解如何搜索、清理、整理和自定义标签页，再看看它如何处理拥挤的工作区。',
      Scenes: '场景',
      'Your browser does not support embedded videos. You can download the promo video directly instead.':
        '你的浏览器不支持嵌入式视频。你可以改为直接下载宣传视频。',
      'Jump To A Scene': '跳到片段',
      'Find tabs across windows fast.': '快速找到不同窗口里的标签页。',
      'Clear duplicates before they pile up.': '趁重复标签页堆起来前先清理。',
      'Rename and organize groups.': '重命名并整理标签页组。',
      'Stay oriented in large workspaces.': '在大型工作区里保持清楚。',
      'Move faster with shortcuts.': '用快捷键更快操作。',
      'Customize the view.': '自定义视图。',
      Performance: '性能',
      '1,000+ tabs, still smooth.': '1,000 多个标签页，依然流畅。',
      'Your browser does not support embedded videos. You can download the scale demo video directly instead.':
        '你的浏览器不支持嵌入式视频。你可以改为直接下载规模演示视频。',
      'Synthetic local-fixture demo focused on UI behavior at scale.':
        '使用本地模拟数据，重点展示大规模标签页下的界面表现。',
      Testing: '测试',
      'Every change, fully tested.': '每次改动，都完整测试。',
      'A 10x capture of the Playwright-based extension suite running end to end. It exercises search, grouping, cleanup, keyboard workflows, settings, and snapshot-sensitive UI behavior.':
        '这是一段以 10 倍速播放的 Playwright 扩展端到端测试录屏，覆盖搜索、分组、清理、键盘流程、设置，以及对界面快照敏感的 UI 行为。',
      'Your browser does not support embedded videos. You can download the integration test video directly instead.':
        '你的浏览器不支持嵌入式视频。你可以改为直接下载集成测试视频。',
      'Why People Switch': '为什么会换用它',
      'Stop hunting through tabs one window at a time.':
        '别再一个窗口一个窗口找标签页。',
      'When your browser turns into a working set, the hard part is no longer opening tabs. It is finding, comparing, and cleaning them up quickly.':
        '当浏览器变成你的工作台，难的已经不是打开标签页，而是快速找到、比较和整理它们。',
      'The Old Way': '旧方式',
      'Native tab strips and window hopping': '原生标签栏和来回切换窗口',
      'Manual Scanning': '手动查找',
      'Scan tiny favicons and truncated titles across multiple windows just to find one tab.':
        '为了找一个标签页，只能在多个窗口里扫视小小的网站图标和被截断的标题。',
      'One at a Time': '一个一个处理',
      'Move, close, or regroup tabs individually with no fast way to act on a set.':
        '移动、关闭或重新分组都得逐个操作，无法快速处理一整组相关标签页。',
      'Duplicates Pile Up': '重复标签页越积越多',
      'Duplicate tabs stay scattered across windows until you notice them manually.':
        '重复标签页散落在各个窗口里，除非你手动发现它们。',
      'Window Hopping': '来回切换窗口',
      'Jump between windows just to understand what is open and where it lives.':
        '想弄清楚打开了什么、在哪里，只能在窗口之间跳来跳去。',
      'The Better Way': '更好的方式',
      'One searchable workspace': '一个可搜索的工作区',
      'Find Tabs Fast': '快速找标签页',
      'Search every open tab by title or URL from one place.':
        '在一个地方按标题或网址搜索所有打开的标签页。',
      'Act on Matches at Once': '一次处理所有匹配项',
      'Select related tabs and move, group, or close them together.':
        '选中相关标签页，一起移动、分组或关闭。',
      'Clear Clutter Quickly': '快速清理杂乱',
      'Spot duplicate tabs and clean them up before they pile up.':
        '在重复标签页越积越多前，先找出来并清理掉。',
      'See the Whole Session': '看清整个会话',
      'Keep windows and native tab groups in a single focused view where supported by the browser.':
        '把窗口和原生标签页组集中在一个清晰视图中；是否支持取决于浏览器。',
      'Common Workflows': '常用场景',
      'The jobs people open it for.': '大家打开它，通常就是为了这些事。',
      'Use it when you need to find something fast, clean something up, or reshape a crowded browsing session.':
        '当你需要快速找到东西、清理杂乱，或重整拥挤的浏览器会话时，就用它。',
      'Find Tabs Across Windows': '跨窗口查找标签页',
      'Search open tabs by title or URL, with optional browser history results in the same search box.':
        '按标题或网址搜索打开的标签页，也可以在同一个搜索框里加入浏览器历史记录结果。',
      'Stay on the Keyboard': '键盘操作不中断',
      'Navigate windows, tabs, and actions from the keyboard, with shortcut help and a command palette built in.':
        '用键盘浏览窗口、标签页和操作，内置快捷键帮助和命令面板。',
      'Move Matching Tabs in Bulk': '批量移动匹配的标签页',
      'Select search matches and move them to another window, group them, or open them in a new window in one step.':
        '选中搜索结果，一步移动到另一个窗口、组成标签页组，或打开到新窗口。',
      'Clean Up Duplicates': '清理重复标签页',
      'Highlight duplicate tabs and remove them quickly to reduce clutter and wasted memory.':
        '高亮重复标签页并快速移除，减少混乱和内存浪费。',
      'Manage Native Tab Groups': '管理原生标签页组',
      'Rename, recolor, collapse, and reorganize browser-native groups without leaving the extension where supported by the browser.':
        '在浏览器支持时，无需离开扩展就能重命名、换颜色、折叠并重新整理原生标签页组。',
      'Tune the View to Fit You': '把视图调成适合你的样子',
      'Adjust theme, tab width, font size, toolbar behavior, URL visibility, and related display preferences.':
        '调整主题、标签页宽度、字号、工具栏行为、网址显示和其他显示偏好。',
      'Before You Install': '安装前常见问题',
      'Common questions before you add it.': '添加扩展前，先看这些常见问题。',
      'Why is Safari not supported?': '为什么不支持 Safari？',
      'Where are my settings stored?': '我的设置存在哪里？',
      'Settings are stored in browser sync storage when the browser supports it. If sync storage is unavailable, the extension falls back to local storage so everything still works.':
        '浏览器支持同步存储时，设置会保存在浏览器同步存储中。如果同步存储不可用，扩展会回退到本地存储，功能照常可用。',
      'What permissions does the extension need?': '扩展需要哪些权限？',
      'Does it work with browser tab groups?': '它支持浏览器标签页组吗？',
      'Yes, where supported by the browser. Tab Manager v2 lets you manage native tab groups directly without leaving the extension.':
        '支持，前提是浏览器本身支持。Tab Manager v2 让你不用离开扩展，就能直接管理原生标签页组。',
      'Can I rename windows?': '我可以重命名窗口吗？',
      "No. If you want labels for related tabs, use your browser's native tab groups instead. Tab Manager v2 can rename and recolor those groups where supported by the browser.":
        '不可以。如果你想给相关标签页加标签，请改用浏览器原生标签页组。只要浏览器支持，Tab Manager v2 可以重命名这些组并修改颜色。',
      Issues: '问题反馈',
      'Privacy Policy': '隐私政策',
      'Back to Top': '返回顶部',
    },
    'zh-Hant': {
      'Tab Manager v2 - See every tab across every window.':
        'Tab Manager v2 - 一次看清所有視窗裡的分頁。',
      'Turn crowded browser sessions into a searchable workspace. Find tabs fast, move matches in bulk, manage native tab groups where supported by the browser, and clean up duplicates.':
        '把擁擠的瀏覽器工作階段整理成可搜尋的工作區。快速找到分頁，批次移動符合項目，在瀏覽器支援時管理原生分頁群組，並清理重複分頁。',
      'tab manager, browser extension, chrome extension, firefox add-on, edge extension, tab groups, duplicate tabs, keyboard shortcuts':
        '分頁管理器, 瀏覽器擴充功能, Chrome 擴充功能, Firefox 附加元件, Edge 擴充功能, 分頁群組, 重複分頁, 快速鍵',
      'See every tab across every window, then search, group, move, and clean up tabs without window hopping, including native tab groups where supported by the browser.':
        '一次看清所有視窗裡的分頁，接著搜尋、分組、移動並清理分頁，不用在視窗之間來回切換；在瀏覽器支援時也能管理原生分頁群組。',
      'Turn crowded browser sessions into a searchable workspace with fast search, bulk actions, duplicate cleanup, and native tab groups where supported by the browser.':
        '把擁擠的瀏覽器工作階段變成可搜尋的工作區，支援快速搜尋、批次操作、重複分頁清理，並可在瀏覽器支援時管理原生分頁群組。',
      'Skip to main content': '跳到主要內容',
      Language: '語言',
      'Choose language': '選擇語言',
      'Main navigation': '主導覽',
      Privacy: '隱私',
      Support: '支援',
      'Theme Toggle': '主題切換',
      'System Theme': '跟隨系統主題',
      'Light Theme': '淺色主題',
      'Dark Theme': '深色主題',
      'Match System': '跟隨系統',
      'Light Mode': '淺色模式',
      'Dark Mode': '深色模式',
      'Too many tabs, handled.': '分頁再多，也能理清。',
      'See every tab across every window in one searchable workspace.':
        '在一個可搜尋的工作區裡查看所有視窗中的分頁。',
      'Find tabs fast, move matching tabs in bulk, manage native tab groups where supported by the browser, and clean up duplicates without window hopping.':
        '快速找到分頁，批次移動符合結果，在瀏覽器支援時管理原生分頁群組，並清理重複分頁，不用在視窗之間來回切換。',
      'Free, open source, with core functionality running locally in your browser.':
        '免費、開源，核心功能都在你的瀏覽器本機執行。',
      'Get Tab Manager v2 for Chrome': '取得 Chrome 版 Tab Manager v2',
      'Get Tab Manager v2 for Firefox': '取得 Firefox 版 Tab Manager v2',
      'Get Tab Manager v2 for Edge': '取得 Edge 版 Tab Manager v2',
      'Open Tab Manager v2 overview screenshot': '開啟 Tab Manager v2 總覽截圖',
      'Cross-window overview': '跨視窗總覽',
      'Overview screenshot in light theme with grouped tabs across multiple windows':
        '淺色主題下跨多個視窗顯示分頁群組的總覽截圖',
      'Overview screenshot in dark theme with grouped tabs across multiple windows':
        '深色主題下跨多個視窗顯示分頁群組的總覽截圖',
      Screenshots: '截圖',
      'Preview light and dark screenshots.': '預覽淺色與深色截圖。',
      'Screenshot Theme Toggle': '截圖主題切換',
      Light: '淺色',
      Dark: '深色',
      'Show light screenshots': '顯示淺色截圖',
      'Show dark screenshots': '顯示深色截圖',
      'Open tab group editing screenshot': '開啟分頁群組編輯截圖',
      'Edit native tab groups': '編輯原生分頁群組',
      'Tab group editing screenshot in light theme':
        '淺色主題下的分頁群組編輯截圖',
      'Tab group editing screenshot in dark theme':
        '深色主題下的分頁群組編輯截圖',
      'Edit native tab groups where supported by the browser.':
        '在瀏覽器支援時，直接編輯原生分頁群組。',
      'Open search with tab groups screenshot': '開啟分頁群組搜尋截圖',
      'Search across windows and groups': '跨視窗與群組搜尋',
      'Search across grouped tabs in light theme':
        '淺色主題下跨已分組分頁搜尋的截圖',
      'Search across grouped tabs in dark theme':
        '深色主題下跨已分組分頁搜尋的截圖',
      'Search across windows and grouped tabs from one place.':
        '從一個地方搜尋多個視窗和已分組的分頁。',
      'Open duplicate cleanup screenshot': '開啟重複分頁清理截圖',
      'Duplicate cleanup': '重複分頁清理',
      'Duplicate tab cleanup screenshot in light theme':
        '淺色主題下的重複分頁清理截圖',
      'Duplicate tab cleanup screenshot in dark theme':
        '深色主題下的重複分頁清理截圖',
      'Spot duplicate tabs fast and close them in bulk.':
        '快速找出重複分頁，並批次關閉。',
      'Open keyboard shortcuts screenshot': '開啟快速鍵截圖',
      'Keyboard shortcuts': '快速鍵',
      'Keyboard shortcuts screenshot in light theme': '淺色主題下的快速鍵截圖',
      'Keyboard shortcuts screenshot in dark theme': '深色主題下的快速鍵截圖',
      'Learn the shortcut map without leaving the interface.':
        '不用離開介面，就能查看快速鍵說明。',
      'Open grouped tabs support screenshot': '開啟分頁群組聚焦截圖',
      'Focused group view': '聚焦分頁群組檢視',
      'Grouped tabs support screenshot in light theme':
        '淺色主題下的分頁群組聚焦截圖',
      'Grouped tabs support screenshot in dark theme':
        '深色主題下的分頁群組聚焦截圖',
      'Stay oriented inside large native tab groups where supported by the browser.':
        '在瀏覽器支援時，即使原生分頁群組很大，也能保持清楚。',
      'Open settings screenshot': '開啟設定截圖',
      'Customize the view': '自訂檢視',
      'Settings screenshot in light theme': '淺色主題下的設定截圖',
      'Settings screenshot in dark theme': '深色主題下的設定截圖',
      'Adjust the view to match your workflow.': '按照你的使用習慣調整檢視。',
      'See It In Motion': '看看實際操作',
      'Watch Tab Manager v2 in action.': '看看 Tab Manager v2 如何運作。',
      'Search, clean up, organize, and customize tabs in one quick walkthrough, then see how it handles a crowded workspace.':
        '用一段快速導覽了解如何搜尋、清理、整理和自訂分頁，再看看它如何處理擁擠的工作區。',
      Scenes: '場景',
      'Your browser does not support embedded videos. You can download the promo video directly instead.':
        '你的瀏覽器不支援嵌入式影片。你可以改為直接下載宣傳影片。',
      'Jump To A Scene': '跳到片段',
      'Find tabs across windows fast.': '快速找到不同視窗裡的分頁。',
      'Clear duplicates before they pile up.': '趁重複分頁堆起來前先清理。',
      'Rename and organize groups.': '重新命名並整理分頁群組。',
      'Stay oriented in large workspaces.': '在大型工作區裡保持清楚。',
      'Move faster with shortcuts.': '用快速鍵更快操作。',
      'Customize the view.': '自訂檢視。',
      Performance: '效能',
      '1,000+ tabs, still smooth.': '1,000 多個分頁，依然順暢。',
      'Your browser does not support embedded videos. You can download the scale demo video directly instead.':
        '你的瀏覽器不支援嵌入式影片。你可以改為直接下載規模演示影片。',
      'Synthetic local-fixture demo focused on UI behavior at scale.':
        '使用本機模擬資料，重點展示大量分頁下的介面表現。',
      Testing: '測試',
      'Every change, fully tested.': '每次變更，都完整測試。',
      'A 10x capture of the Playwright-based extension suite running end to end. It exercises search, grouping, cleanup, keyboard workflows, settings, and snapshot-sensitive UI behavior.':
        '這是一段以 10 倍速播放的 Playwright 擴充功能端對端測試錄影，涵蓋搜尋、群組、清理、鍵盤流程、設定，以及對畫面快照敏感的 UI 行為。',
      'Your browser does not support embedded videos. You can download the integration test video directly instead.':
        '你的瀏覽器不支援嵌入式影片。你可以改為直接下載整合測試影片。',
      'Why People Switch': '為什麼會換用它',
      'Stop hunting through tabs one window at a time.':
        '別再一個視窗一個視窗找分頁。',
      'When your browser turns into a working set, the hard part is no longer opening tabs. It is finding, comparing, and cleaning them up quickly.':
        '當瀏覽器變成你的工作台，難的已經不是開啟分頁，而是快速找到、比較和整理它們。',
      'The Old Way': '舊方式',
      'Native tab strips and window hopping': '原生分頁列和來回切換視窗',
      'Manual Scanning': '手動查找',
      'Scan tiny favicons and truncated titles across multiple windows just to find one tab.':
        '為了找一個分頁，只能在多個視窗裡掃視小小的網站圖示和被截斷的標題。',
      'One at a Time': '一個一個處理',
      'Move, close, or regroup tabs individually with no fast way to act on a set.':
        '移動、關閉或重新分組都得逐個操作，無法快速處理一整組相關分頁。',
      'Duplicates Pile Up': '重複分頁越積越多',
      'Duplicate tabs stay scattered across windows until you notice them manually.':
        '重複分頁散落在各個視窗裡，除非你手動發現它們。',
      'Window Hopping': '來回切換視窗',
      'Jump between windows just to understand what is open and where it lives.':
        '想弄清楚開了什麼、在哪裡，只能在視窗之間跳來跳去。',
      'The Better Way': '更好的方式',
      'One searchable workspace': '一個可搜尋的工作區',
      'Find Tabs Fast': '快速找分頁',
      'Search every open tab by title or URL from one place.':
        '在一個地方按標題或網址搜尋所有開啟的分頁。',
      'Act on Matches at Once': '一次處理所有符合項目',
      'Select related tabs and move, group, or close them together.':
        '選取相關分頁，一起移動、分組或關閉。',
      'Clear Clutter Quickly': '快速清理雜亂',
      'Spot duplicate tabs and clean them up before they pile up.':
        '在重複分頁越積越多前，先找出來並清理掉。',
      'See the Whole Session': '看清整個工作階段',
      'Keep windows and native tab groups in a single focused view where supported by the browser.':
        '把視窗和原生分頁群組集中在一個清晰檢視中；是否支援取決於瀏覽器。',
      'Common Workflows': '常用情境',
      'The jobs people open it for.': '大家打開它，通常就是為了這些事。',
      'Use it when you need to find something fast, clean something up, or reshape a crowded browsing session.':
        '當你需要快速找到東西、清理雜亂，或重整擁擠的瀏覽器工作階段時，就用它。',
      'Find Tabs Across Windows': '跨視窗尋找分頁',
      'Search open tabs by title or URL, with optional browser history results in the same search box.':
        '按標題或網址搜尋開啟的分頁，也可以在同一個搜尋框裡加入瀏覽器歷史記錄結果。',
      'Stay on the Keyboard': '鍵盤操作不中斷',
      'Navigate windows, tabs, and actions from the keyboard, with shortcut help and a command palette built in.':
        '用鍵盤瀏覽視窗、分頁和操作，內建快速鍵說明和命令面板。',
      'Move Matching Tabs in Bulk': '批次移動符合的分頁',
      'Select search matches and move them to another window, group them, or open them in a new window in one step.':
        '選取搜尋結果，一步移動到另一個視窗、組成分頁群組，或開到新視窗。',
      'Clean Up Duplicates': '清理重複分頁',
      'Highlight duplicate tabs and remove them quickly to reduce clutter and wasted memory.':
        '醒目標示重複分頁並快速移除，減少混亂和記憶體浪費。',
      'Manage Native Tab Groups': '管理原生分頁群組',
      'Rename, recolor, collapse, and reorganize browser-native groups without leaving the extension where supported by the browser.':
        '在瀏覽器支援時，無需離開擴充功能就能重新命名、換顏色、收合並重新整理原生分頁群組。',
      'Tune the View to Fit You': '把檢視調成適合你的樣子',
      'Adjust theme, tab width, font size, toolbar behavior, URL visibility, and related display preferences.':
        '調整主題、分頁寬度、字級、工具列行為、網址顯示和其他顯示偏好。',
      'Before You Install': '安裝前常見問題',
      'Common questions before you add it.':
        '新增擴充功能前，先看這些常見問題。',
      'Why is Safari not supported?': '為什麼不支援 Safari？',
      'Where are my settings stored?': '我的設定存在哪裡？',
      'Settings are stored in browser sync storage when the browser supports it. If sync storage is unavailable, the extension falls back to local storage so everything still works.':
        '瀏覽器支援同步儲存時，設定會保存在瀏覽器同步儲存中。如果同步儲存不可用，擴充功能會改用本機儲存，功能照常可用。',
      'What permissions does the extension need?': '擴充功能需要哪些權限？',
      'Does it work with browser tab groups?': '它支援瀏覽器分頁群組嗎？',
      'Yes, where supported by the browser. Tab Manager v2 lets you manage native tab groups directly without leaving the extension.':
        '支援，前提是瀏覽器本身支援。Tab Manager v2 讓你不用離開擴充功能，就能直接管理原生分頁群組。',
      'Can I rename windows?': '我可以重新命名視窗嗎？',
      "No. If you want labels for related tabs, use your browser's native tab groups instead. Tab Manager v2 can rename and recolor those groups where supported by the browser.":
        '不可以。如果你想替相關分頁加標籤，請改用瀏覽器原生分頁群組。只要瀏覽器支援，Tab Manager v2 可以重新命名這些群組並修改顏色。',
      Issues: '問題回報',
      'Privacy Policy': '隱私權政策',
      'Back to Top': '回到頂端',
    },
  }
  const localizedHtml = {
    'zh-Hans': {
      'faq.safariUnsupportedBody':
        'Safari 不支持 <code>tabs.move()</code> 这个 WebExtension API，而 Tab Manager v2 需要它来拖放排序并在窗口之间移动标签页，所以体验会不完整。',
      'faq.permissionsBody':
        'Tab Manager v2 使用 <code>tabs</code>、<code>storage</code> 和 <code>management</code> 来完成核心的标签页和窗口管理。它还会使用 <code>history</code> 来支持可选的浏览器历史记录搜索设置；在支持的浏览器上使用 <code>tabGroups</code> 来支持原生标签页组功能；并在 Firefox 上使用 <code>contextualIdentities</code> 和 <code>cookies</code> 来支持容器相关功能。你的标签页数据会留在浏览器里，扩展不会加入分析或跟踪。',
    },
    'zh-Hant': {
      'faq.safariUnsupportedBody':
        'Safari 不支援 <code>tabs.move()</code> 這個 WebExtension API，而 Tab Manager v2 需要它來拖放排序並在視窗之間移動分頁，所以體驗會不完整。',
      'faq.permissionsBody':
        'Tab Manager v2 使用 <code>tabs</code>、<code>storage</code> 和 <code>management</code> 來完成核心的分頁和視窗管理。它還會使用 <code>history</code> 來支援可選的瀏覽器歷史記錄搜尋設定；在支援的瀏覽器上使用 <code>tabGroups</code> 來支援原生分頁群組功能；並在 Firefox 上使用 <code>contextualIdentities</code> 和 <code>cookies</code> 來支援容器相關功能。你的分頁資料會留在瀏覽器裡，擴充功能不會加入分析或追蹤。',
    },
  }
  const translatableAttributes = [
    'aria-label',
    'title',
    'alt',
    'data-title',
    'data-light-title',
    'data-dark-title',
    'data-light-alt',
    'data-dark-alt',
    'content',
    'label',
  ]
  const originalTextNodes = new WeakMap()
  const originalAttributes = new WeakMap()
  const originalHtmlBlocks = new WeakMap()
  let originalStructuredData = null
  let lightbox = null
  let selectedScreenshotTheme = null
  let promoVideoPlayer = null
  let promoVideoPrimed = false
  const disclosureVideoPlayers = new WeakMap()

  function pauseDisclosureVideo(disclosure) {
    const video = disclosure.querySelector('.scale-demo-video')
    if (!video) {
      return
    }

    const existingPlayer = disclosureVideoPlayers.get(video)
    if (existingPlayer && typeof existingPlayer.pause === 'function') {
      existingPlayer.pause()
      return
    }

    if (typeof video.pause === 'function') {
      video.pause()
    }
  }

  function normalizeTheme(theme) {
    return supportedThemes.has(theme) ? theme : 'system'
  }

  function getStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem('theme'))
    } catch {
      return 'system'
    }
  }

  function normalizeLanguage(language) {
    if (supportedLanguages.has(language)) {
      return language
    }

    const normalizedLanguage = String(language || '').toLowerCase()
    if (!normalizedLanguage) {
      return fallbackLanguage
    }

    if (
      normalizedLanguage.includes('hant') ||
      normalizedLanguage === 'zh-tw' ||
      normalizedLanguage === 'zh-hk' ||
      normalizedLanguage === 'zh-mo'
    ) {
      return 'zh-Hant'
    }

    if (normalizedLanguage.startsWith('zh')) {
      return 'zh-Hans'
    }

    return fallbackLanguage
  }

  function getCurrentLanguage() {
    return normalizeLanguage(html.getAttribute('data-language'))
  }

  function getDeviceLanguage() {
    const languages = Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language]

    for (const language of languages) {
      const normalizedLanguage = String(language || '').toLowerCase()
      if (normalizedLanguage.startsWith('zh')) {
        return normalizeLanguage(normalizedLanguage)
      }
      if (normalizedLanguage.startsWith('en')) {
        return fallbackLanguage
      }
    }

    return fallbackLanguage
  }

  function getStoredLanguage() {
    try {
      const storedLanguage = localStorage.getItem(languageStorageKey)
      return storedLanguage ? normalizeLanguage(storedLanguage) : ''
    } catch {
      return ''
    }
  }

  function getInitialLanguage() {
    return getStoredLanguage() || getDeviceLanguage()
  }

  function normalizeCopy(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function getLocalizedCopy(language, englishCopy) {
    if (language === fallbackLanguage) {
      return englishCopy
    }

    return localizedCopy[language]?.[englishCopy] || englishCopy
  }

  function translateTextNodes(language) {
    const textWalker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parentElement = node.parentElement
          if (!parentElement || !normalizeCopy(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT
          }

          if (
            parentElement.closest('[data-i18n-html], code, script, style, svg')
          ) {
            return NodeFilter.FILTER_REJECT
          }

          return NodeFilter.FILTER_ACCEPT
        },
      },
    )

    const textNodes = []
    while (textWalker.nextNode()) {
      textNodes.push(textWalker.currentNode)
    }

    textNodes.forEach((node) => {
      if (!originalTextNodes.has(node)) {
        originalTextNodes.set(node, node.nodeValue)
      }

      const originalText = originalTextNodes.get(node)
      const normalizedText = normalizeCopy(originalText)
      const localizedText = getLocalizedCopy(language, normalizedText)

      if (localizedText === normalizedText) {
        node.nodeValue = originalText
        return
      }

      const leadingWhitespace = originalText.match(/^\s*/)?.[0] || ''
      const trailingWhitespace = originalText.match(/\s*$/)?.[0] || ''
      node.nodeValue = `${leadingWhitespace}${localizedText}${trailingWhitespace}`
    })
  }

  function translateAttributes(language) {
    const attributeSelector = translatableAttributes
      .map((attribute) => `[${attribute}]`)
      .join(',')

    document.querySelectorAll(attributeSelector).forEach((element) => {
      if (!originalAttributes.has(element)) {
        originalAttributes.set(element, {})
      }

      const originals = originalAttributes.get(element)
      translatableAttributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) {
          return
        }

        if (!Object.prototype.hasOwnProperty.call(originals, attribute)) {
          originals[attribute] = element.getAttribute(attribute)
        }

        const originalAttribute = originals[attribute]
        const normalizedAttribute = normalizeCopy(originalAttribute)
        const localizedAttribute = getLocalizedCopy(
          language,
          normalizedAttribute,
        )

        element.setAttribute(attribute, localizedAttribute)
      })
    })
  }

  function translateHtmlBlocks(language) {
    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      if (!originalHtmlBlocks.has(element)) {
        originalHtmlBlocks.set(element, element.innerHTML)
      }

      const key = element.getAttribute('data-i18n-html')
      element.innerHTML =
        language === fallbackLanguage
          ? originalHtmlBlocks.get(element)
          : localizedHtml[language]?.[key] || originalHtmlBlocks.get(element)
    })
  }

  function updateStructuredData(language) {
    const structuredData = document.querySelector(
      'script[type="application/ld+json"]',
    )
    if (!structuredData) {
      return
    }

    if (originalStructuredData === null) {
      originalStructuredData = structuredData.textContent
    }

    try {
      const data = JSON.parse(originalStructuredData)
      if (typeof data.description === 'string') {
        data.description = getLocalizedCopy(language, data.description)
      }
      structuredData.textContent = JSON.stringify(data, null, 8)
    } catch {
      structuredData.textContent = originalStructuredData
    }
  }

  function applyTranslations(language) {
    translateHtmlBlocks(language)
    translateTextNodes(language)
    translateAttributes(language)
    updateStructuredData(language)
    document.title = getLocalizedCopy(
      language,
      'Tab Manager v2 - See every tab across every window.',
    )
  }

  function announceLanguage(language) {
    if (!languageAnnouncement) {
      return
    }
    languageAnnouncement.textContent =
      languageOptions[language]?.announcement ||
      languageOptions[fallbackLanguage].announcement
  }

  function setLanguage(language, options = {}) {
    const nextLanguage = normalizeLanguage(language)
    const {
      persist = false,
      announce = true,
      updateScreenshotContent = true,
    } = options

    html.lang = languageOptions[nextLanguage].htmlLang
    html.setAttribute('data-language', nextLanguage)

    if (languageSelector) {
      languageSelector.value = nextLanguage
    }

    if (persist) {
      try {
        localStorage.setItem(languageStorageKey, nextLanguage)
      } catch {
        // Ignore storage failures and keep the in-memory selection.
      }
    }

    applyTranslations(nextLanguage)

    if (updateScreenshotContent) {
      syncScreenshotThemeWithPage()
    }

    if (announce) {
      announceLanguage(nextLanguage)
    }
  }

  function getResolvedTheme(
    theme = html.getAttribute('data-theme') || 'system',
  ) {
    const normalizedTheme = normalizeTheme(theme)
    if (normalizedTheme === 'light' || normalizedTheme === 'dark') {
      return normalizedTheme
    }
    return prefersDarkMedia.matches ? 'dark' : 'light'
  }

  function announceTheme(theme) {
    if (!themeAnnouncement) {
      return
    }
    const language = getCurrentLanguage()
    themeAnnouncement.textContent =
      localizedAnnouncements[language]?.theme[theme] ||
      localizedAnnouncements[fallbackLanguage].theme[theme]
  }

  function announceScreenshotTheme(theme) {
    if (!screenshotThemeAnnouncement) {
      return
    }
    const language = getCurrentLanguage()
    screenshotThemeAnnouncement.textContent =
      localizedAnnouncements[language]?.screenshotTheme[theme] ||
      localizedAnnouncements[fallbackLanguage].screenshotTheme[theme]
  }

  function updateControls(activeTheme) {
    Object.entries(themeButtons).forEach(([theme, button]) => {
      if (!button) {
        return
      }
      const isActive = theme === activeTheme
      button.classList.toggle('active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  function updateScreenshotControls(activeTheme) {
    Object.entries(screenshotThemeButtons).forEach(([theme, button]) => {
      if (!button) {
        return
      }
      const isActive = theme === activeTheme
      button.classList.toggle('active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  function applyScreenshotTheme(theme, options = {}) {
    if (theme !== 'light' && theme !== 'dark') {
      return
    }

    const { announce = false } = options

    screenshotVariantFrames.forEach((frame) => {
      const image = frame.querySelector('img')
      const href = frame.dataset[`${theme}Href`]
      const src = frame.dataset[`${theme}Src`]
      const srcset = frame.dataset[`${theme}Srcset`]
      const title = frame.dataset[`${theme}Title`]
      const alt = frame.dataset[`${theme}Alt`]

      frame.setAttribute('data-screenshot-theme', theme)

      if (href) {
        frame.setAttribute('href', href)
      }
      if (title) {
        frame.setAttribute('data-title', title)
      }
      if (image && src) {
        image.setAttribute('src', src)
      }
      if (image && srcset) {
        image.setAttribute('srcset', srcset)
      }
      if (image && alt) {
        image.setAttribute('alt', alt)
      }
    })

    updateScreenshotControls(theme)

    if (announce) {
      announceScreenshotTheme(theme)
    }

    document.dispatchEvent(new CustomEvent('screenshots-theme-updated'))
  }

  function getActiveScreenshotTheme() {
    return selectedScreenshotTheme || getResolvedTheme()
  }

  function syncScreenshotThemeWithPage(options = {}) {
    applyScreenshotTheme(getActiveScreenshotTheme(), options)
  }

  function selectScreenshotTheme(theme, announce = true) {
    selectedScreenshotTheme = theme
    syncScreenshotThemeWithPage({ announce })
  }

  function setTheme(theme, shouldAnnounce = true) {
    const nextTheme = normalizeTheme(theme)
    html.setAttribute('data-theme', nextTheme)
    try {
      localStorage.setItem('theme', nextTheme)
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
    selectedScreenshotTheme = null
    updateControls(nextTheme)
    syncScreenshotThemeWithPage()
    if (shouldAnnounce) {
      announceTheme(nextTheme)
    }
  }

  Object.entries(themeButtons).forEach(([theme, button]) => {
    if (!button) {
      return
    }
    button.addEventListener('click', () => {
      setTheme(theme)
    })
  })

  if (languageSelector) {
    languageSelector.addEventListener('change', () => {
      setLanguage(languageSelector.value, {
        persist: true,
        announce: true,
      })
    })
  }

  Object.entries(screenshotThemeButtons).forEach(([theme, button]) => {
    if (!button) {
      return
    }

    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') {
        return
      }
      selectScreenshotTheme(theme)
    })

    button.addEventListener('click', (event) => {
      event.preventDefault()
      selectScreenshotTheme(theme)
    })
  })

  const handleSystemThemeChange = () => {
    if (
      normalizeTheme(html.getAttribute('data-theme')) !== 'system' ||
      selectedScreenshotTheme
    ) {
      return
    }
    syncScreenshotThemeWithPage()
  }

  if (typeof prefersDarkMedia.addEventListener === 'function') {
    prefersDarkMedia.addEventListener('change', handleSystemThemeChange)
  } else if (typeof prefersDarkMedia.addListener === 'function') {
    prefersDarkMedia.addListener(handleSystemThemeChange)
  }

  function getLightboxSkin() {
    return getResolvedTheme()
  }

  function createLightbox() {
    if (typeof window.GLightbox !== 'function') {
      return null
    }
    return window.GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      autoplayVideos: false,
      skin: getLightboxSkin(),
    })
  }

  function refreshLightbox() {
    if (!lightbox) {
      lightbox = createLightbox()
      return
    }
    lightbox.destroy()
    lightbox = createLightbox()
  }

  setLanguage(getInitialLanguage(), {
    announce: false,
    updateScreenshotContent: false,
  })
  setTheme(getStoredTheme(), false)
  refreshLightbox()

  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        refreshLightbox()
      }
    })
  })

  themeObserver.observe(html, { attributes: true })

  document.addEventListener('screenshots-theme-updated', () => {
    refreshLightbox()
  })

  function setActiveVideoChapter(currentTime) {
    if (!videoChapterButtons.length) {
      return
    }

    let activeIndex = 0
    videoChapterButtons.forEach((button, index) => {
      const seekTime = Number(button.dataset.videoSeek || '0')
      if (currentTime >= seekTime) {
        activeIndex = index
      }
    })

    videoChapterButtons.forEach((button, index) => {
      const isActive = index === activeIndex
      button.classList.toggle('active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  function getVideoRangeEnd(timeRanges) {
    if (!timeRanges || timeRanges.length === 0) {
      return 0
    }

    return timeRanges.end(timeRanges.length - 1)
  }

  function canSeekPromoVideoTo(nextTime) {
    if (!promoVideo || Number.isNaN(nextTime)) {
      return false
    }

    const seekableEnd = getVideoRangeEnd(promoVideo.seekable)
    const bufferedEnd = getVideoRangeEnd(promoVideo.buffered)

    return (
      seekableEnd >= nextTime - 0.1 ||
      bufferedEnd >= nextTime - 0.1 ||
      promoVideo.readyState >= 4
    )
  }

  function primePromoVideo() {
    if (!promoVideo || promoVideoPrimed) {
      return
    }

    promoVideoPrimed = true
    promoVideo.preload = 'auto'
    if (promoVideoPlayer && typeof promoVideoPlayer.load === 'function') {
      promoVideoPlayer.load()
      return
    }
    promoVideo.load()
  }

  function waitForPromoVideoSeekTarget(nextTime, timeoutMs = 6000) {
    if (!promoVideo) {
      return Promise.resolve()
    }

    if (canSeekPromoVideoTo(nextTime)) {
      return Promise.resolve()
    }

    primePromoVideo()

    return new Promise((resolve) => {
      let finished = false
      let timeoutId = null

      const cleanup = () => {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
        }
        ;[
          'progress',
          'loadeddata',
          'loadedmetadata',
          'canplay',
          'canplaythrough',
          'suspend',
        ].forEach((eventName) => {
          promoVideo.removeEventListener(eventName, checkReady)
        })
      }

      const finish = () => {
        if (finished) {
          return
        }
        finished = true
        cleanup()
        resolve()
      }

      const checkReady = () => {
        if (canSeekPromoVideoTo(nextTime)) {
          finish()
        }
      }

      timeoutId = window.setTimeout(finish, timeoutMs)
      ;[
        'progress',
        'loadeddata',
        'loadedmetadata',
        'canplay',
        'canplaythrough',
        'suspend',
      ].forEach((eventName) => {
        promoVideo.addEventListener(eventName, checkReady)
      })
      checkReady()
    })
  }

  async function seekPromoVideo(nextTime) {
    if (!promoVideo || Number.isNaN(nextTime)) {
      return
    }

    const applySeek = () => {
      if (
        promoVideoPlayer &&
        typeof promoVideoPlayer.currentTime === 'function'
      ) {
        promoVideoPlayer.currentTime(nextTime)
      } else {
        promoVideo.currentTime = nextTime
      }
      setActiveVideoChapter(nextTime)
      const playPromise =
        promoVideoPlayer && typeof promoVideoPlayer.play === 'function'
          ? promoVideoPlayer.play()
          : promoVideo.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }
    }

    if (promoVideo.readyState >= 1) {
      await waitForPromoVideoSeekTarget(nextTime)
      applySeek()
      return
    }

    promoVideo.addEventListener(
      'loadedmetadata',
      async () => {
        await waitForPromoVideoSeekTarget(nextTime)
        applySeek()
      },
      { once: true },
    )
    primePromoVideo()
  }

  function initializeDisclosureVideoPlayer(video) {
    if (!video) {
      return null
    }

    const existingPlayer = disclosureVideoPlayers.get(video)
    if (existingPlayer) {
      return existingPlayer
    }

    if (typeof window.videojs !== 'function') {
      return null
    }

    const nextPlayer = window.videojs(video, {
      fluid: true,
      preload: video.getAttribute('preload') || 'none',
      aspectRatio: video.dataset.aspectRatio || '1282:839',
    })
    disclosureVideoPlayers.set(video, nextPlayer)

    return nextPlayer
  }

  if (promoVideo && videoChapterButtons.length) {
    if (typeof window.videojs === 'function') {
      promoVideoPlayer = window.videojs(promoVideo, {
        fluid: true,
        preload: 'auto',
      })
    }

    setActiveVideoChapter(0)

    const videoTourSection = promoVideo.closest('#video-tour')
    if (videoTourSection && 'IntersectionObserver' in window) {
      const promoVideoObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return
            }
            primePromoVideo()
            observer.disconnect()
          })
        },
        {
          root: null,
          rootMargin: '240px 0px',
          threshold: 0.1,
        },
      )

      promoVideoObserver.observe(videoTourSection)
    }

    videoChapterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        void seekPromoVideo(Number(button.dataset.videoSeek || '0'))
      })
    })

    if (promoVideoPlayer) {
      promoVideoPlayer.ready(() => {
        setActiveVideoChapter(promoVideoPlayer.currentTime() || 0)
      })
      promoVideoPlayer.on('loadedmetadata', () => {
        setActiveVideoChapter(promoVideoPlayer.currentTime() || 0)
      })
      promoVideoPlayer.on('timeupdate', () => {
        setActiveVideoChapter(promoVideoPlayer.currentTime() || 0)
      })
    } else {
      promoVideo.addEventListener('loadedmetadata', () => {
        setActiveVideoChapter(promoVideo.currentTime)
      })

      promoVideo.addEventListener('timeupdate', () => {
        setActiveVideoChapter(promoVideo.currentTime)
      })
    }
  }

  disclosureVideos.forEach((disclosure) => {
    const video = disclosure.querySelector('.scale-demo-video')
    if (!video) {
      return
    }

    if (disclosure.open) {
      initializeDisclosureVideoPlayer(video)
    }

    disclosure.addEventListener('toggle', () => {
      if (disclosure.open) {
        initializeDisclosureVideoPlayer(video)
        return
      }

      pauseDisclosureVideo(disclosure)
    })
  })

  // Enable :active states on iOS Safari
  document.addEventListener('touchstart', () => {}, { passive: true })

  requestAnimationFrame(() => {
    body.classList.remove('preload')
  })

  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }
        entry.target.classList.add('visible')
        instance.unobserve(entry.target)
      })
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: 0.12,
    },
  )

  document.querySelectorAll('.fade-in').forEach((element) => {
    observer.observe(element)
  })

  const backToTopBtn = document.getElementById('backToTop')

  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible')
      } else {
        backToTopBtn.classList.remove('visible')
      }
    })

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    })
  }
})
