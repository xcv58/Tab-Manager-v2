;(function () {
  // Each pair is Simplified and Traditional Chinese. Markup comes only from
  // these checked-in strings, preserving inline code, keyboard keys, and links.
  const copy = {
    skip: ['跳到主要内容', '跳到主要內容'],
    overview: ['总览', '總覽'],
    demo: ['试用演示', '試用示範'],
    privacy: ['隐私', '隱私'],
    support: ['支持', '支援'],
    footerNav: ['页脚导航', '頁尾導覽'],
    contentsNav: ['本页内容', '本頁內容'],
    privacyDocumentTitle: [
      '隐私政策 · Tab Manager v2',
      '隱私政策 · Tab Manager v2',
    ],
    supportDocumentTitle: ['支持 · Tab Manager v2', '支援 · Tab Manager v2'],
    privacyDescription: [
      'Tab Manager v2 隐私政策：浏览器访问、存储的数据、权限和第三方服务。',
      'Tab Manager v2 隱私政策：瀏覽器存取、儲存的資料、權限和第三方服務。',
    ],
    supportDescription: [
      '安装 Tab Manager v2，了解快捷键和浏览器功能，获取帮助或报告问题。',
      '安裝 Tab Manager v2，了解快速鍵和瀏覽器功能，取得協助或回報問題。',
    ],
    privacyTitle: ['隐私政策', '隱私政策'],
    privacyDate: [
      '生效日期：2026 年 3 月 11 日',
      '生效日期：2026 年 3 月 11 日',
    ],
    privacyIntro: [
      'Tab Manager v2 是用于管理标签页和窗口的浏览器扩展。其核心功能在你的浏览器中本地运行。我们不运营账户系统，不会将你的标签页、窗口、历史记录或设置数据发送到我们自己的服务器，也不包含分析或广告跟踪器。',
      'Tab Manager v2 是用於管理分頁和視窗的瀏覽器擴充功能。其核心功能在你的瀏覽器中本機執行。我們不營運帳戶系統，不會將你的分頁、視窗、歷史紀錄或設定資料傳送到我們自己的伺服器，也不包含分析或廣告追蹤器。',
    ],
    privacyAccessTitle: ['扩展会访问哪些信息', '擴充功能會存取哪些資訊'],
    privacyAccessIntro: [
      '为提供功能，扩展可能会访问：',
      '為提供功能，擴充功能可能會存取：',
    ],
    privacyAccessTabs: ['打开的标签页和窗口', '開啟的分頁和視窗'],
    privacyAccessGroups: [
      '支持原生标签页组的浏览器中的标签页组',
      '支援原生分頁群組的瀏覽器中的分頁群組',
    ],
    privacyAccessHistory: [
      '启用“Include browser history in results”（在结果中包含浏览器历史记录）设置时的浏览器历史记录结果',
      '啟用「Include browser history in results」（在結果中包含瀏覽器歷史紀錄）設定時的瀏覽器歷史紀錄結果',
    ],
    privacyAccessContainers: [
      '用于容器相关功能的 Firefox 容器身份及相关 Cookie 存储信息',
      '用於容器相關功能的 Firefox 容器身分及相關 Cookie 儲存資訊',
    ],
    privacyAccessExtensions: [
      '已安装扩展的元数据，用于为 <code>chrome-extension://</code> 页面显示正确的图标',
      '已安裝擴充功能的中繼資料，用於為 <code>chrome-extension://</code> 頁面顯示正確的圖示',
    ],
    privacyStorageTitle: [
      '扩展会在浏览器中存储哪些数据',
      '擴充功能會在瀏覽器中儲存哪些資料',
    ],
    privacyStorageIntro: [
      'Tab Manager v2 在可用时使用浏览器的 <code>storage.sync</code> 存储数据，并以 <code>storage.local</code> 作为备用方案。',
      'Tab Manager v2 在可用時使用瀏覽器的 <code>storage.sync</code> 儲存資料，並以 <code>storage.local</code> 作為備用方案。',
    ],
    privacyStorageListIntro: ['存储的数据可能包括：', '儲存的資料可能包括：'],
    privacyStorageSettings: [
      '主题、字体大小、标签页宽度、工具栏行为和搜索偏好等用户设置',
      '主題、字型大小、分頁寬度、工具列行為和搜尋偏好等使用者設定',
    ],
    privacyStorageState: [
      '隐藏的窗口、弹出窗口位置、上次聚焦的窗口和弹出窗口活动状态等本地界面状态',
      '隱藏的視窗、彈出視窗位置、上次聚焦的視窗和彈出視窗活動狀態等本機介面狀態',
    ],
    privacyStorageSearch: [
      '在启用相应功能时保留的搜索文本和上一次命令',
      '在啟用相應功能時保留的搜尋文字和上一次指令',
    ],
    privacyStorageHistory: [
      '用于“上一个活动标签页”快捷键的近期标签页历史记录',
      '用於「上一個使用中的分頁」快速鍵的近期分頁歷史紀錄',
    ],
    privacyStorageDisplay: [
      '屏幕边界和检测到的系统主题等显示信息，用于调整弹出窗口的大小和位置',
      '螢幕邊界和偵測到的系統主題等顯示資訊，用於調整彈出視窗的大小和位置',
    ],
    privacyStorageSync: [
      '如果启用了浏览器同步服务，通过 <code>storage.sync</code> 保存的设置可能由浏览器供应商根据其隐私政策进行同步。',
      '如果啟用了瀏覽器同步服務，透過 <code>storage.sync</code> 儲存的設定可能由瀏覽器供應商根據其隱私政策進行同步。',
    ],
    privacyPermissionsTitle: ['权限', '權限'],
    privacyPermissionsIntro: [
      '扩展请求以下权限来支持其功能：',
      '擴充功能要求以下權限來支援其功能：',
    ],
    privacyPermissionTabs: [
      '<code>tabs</code>：读取和管理打开的标签页和窗口',
      '<code>tabs</code>：讀取和管理開啟的分頁和視窗',
    ],
    privacyPermissionStorage: [
      '<code>storage</code>：保存设置和界面状态',
      '<code>storage</code>：儲存設定和介面狀態',
    ],
    privacyPermissionManagement: [
      '<code>management</code>：查询 <code>chrome-extension://</code> 标签页所对应的已安装扩展元数据',
      '<code>management</code>：查詢 <code>chrome-extension://</code> 分頁所對應的已安裝擴充功能中繼資料',
    ],
    privacyPermissionHistory: [
      '<code>history</code>：支持可选的浏览器历史记录搜索功能',
      '<code>history</code>：支援選用的瀏覽器歷史紀錄搜尋功能',
    ],
    privacyPermissionGroups: [
      '<code>tabGroups</code>：在支持的浏览器中读取和管理原生标签页组',
      '<code>tabGroups</code>：在支援的瀏覽器中讀取和管理原生分頁群組',
    ],
    privacyPermissionContainers: [
      '<code>contextualIdentities</code> 和 <code>cookies</code>：支持 Firefox 容器相关功能',
      '<code>contextualIdentities</code> 和 <code>cookies</code>：支援 Firefox 容器相關功能',
    ],
    privacyNetworkTitle: ['网络和第三方服务', '網路和第三方服務'],
    privacyNetworkCore: [
      'Tab Manager v2 不会将你的浏览数据发送到 Tab Manager v2 服务器，因为核心功能不使用这样的服务。',
      'Tab Manager v2 不會將你的瀏覽資料傳送到 Tab Manager v2 伺服器，因為核心功能不使用這樣的服務。',
    ],
    privacyNetworkLinks: [
      '扩展和文档包含指向浏览器商店、GitHub 和支持页面等第三方网站的链接。如果你打开这些链接，你与这些网站的交互受其隐私政策约束。',
      '擴充功能和文件包含指向瀏覽器商店、GitHub 和支援頁面等第三方網站的連結。如果你開啟這些連結，你與這些網站的互動受其隱私政策約束。',
    ],
    privacyNetworkFonts: [
      '扩展的弹出界面目前引用 Google Fonts。当浏览器加载该样式表或相关字体资源时，这些请求会直接发送给 Google，并受 Google 的隐私政策约束。',
      '擴充功能的彈出介面目前引用 Google Fonts。當瀏覽器載入該樣式表或相關字型資源時，這些請求會直接傳送給 Google，並受 Google 的隱私政策約束。',
    ],
    privacyRetentionTitle: ['数据保留和控制', '資料保留和控制'],
    privacyRetentionStorage: [
      '扩展存储的数据会保留在浏览器存储中，直到你修改数据、清除扩展或浏览器存储，或卸载扩展。',
      '擴充功能儲存的資料會保留在瀏覽器儲存空間中，直到你修改資料、清除擴充功能或瀏覽器儲存空間，或解除安裝擴充功能。',
    ],
    privacyRetentionHistory: [
      '如果不希望搜索结果包含历史记录，可以在设置中禁用浏览器历史记录搜索功能。',
      '如果不希望搜尋結果包含歷史紀錄，可以在設定中停用瀏覽器歷史紀錄搜尋功能。',
    ],
    privacyContactTitle: ['联系', '聯絡'],
    privacyContact: [
      '如果你有隐私问题或想报告问题，请在 <a href="https://github.com/xcv58/Tab-Manager-v2/issues">https://github.com/xcv58/Tab-Manager-v2/issues</a> 提交 issue。',
      '如果你有隱私問題或想回報問題，請在 <a href="https://github.com/xcv58/Tab-Manager-v2/issues">https://github.com/xcv58/Tab-Manager-v2/issues</a> 提交 issue。',
    ],
    privacySource: [
      '政策源文件：<a href="https://github.com/xcv58/Tab-Manager-v2/blob/master/privacy_policy.md">GitHub 上的 privacy_policy.md</a>。',
      '政策來源檔案：<a href="https://github.com/xcv58/Tab-Manager-v2/blob/master/privacy_policy.md">GitHub 上的 privacy_policy.md</a>。',
    ],
    websitePreferencesTitle: ['网站和演示偏好设置', '網站和示範偏好設定'],
    websitePreferences: [
      '本网站将你选择的主题和语言保存在浏览器的本地存储中。这些网站偏好设置与已安装扩展的设置相互独立。',
      '本網站將你選擇的主題和語言儲存在瀏覽器的本機儲存空間中。這些網站偏好設定與已安裝擴充功能的設定相互獨立。',
    ],
    websiteDemoMemory: [
      '交互演示将示例标签页、标签页组和历史记录保存在页面内存中。刷新页面、切换工作区或选择“重新开始”会丢弃这些示例更改。演示设置（包括独立的演示主题）保存在当前浏览器标签页的会话存储中，在刷新、页面导航和工作区切换后仍会保留。“重新开始”也会清除演示设置。保存的网站主题和语言保持不变。',
      '互動示範將範例分頁、分頁群組和歷史紀錄保存在頁面記憶體中。重新整理頁面、切換工作區或選擇「重新開始」會捨棄這些範例變更。示範設定（包括獨立的示範主題）儲存在目前瀏覽器分頁的工作階段儲存空間中，在重新整理、頁面導覽和工作區切換後仍會保留。「重新開始」也會清除示範設定。儲存的網站主題和語言保持不變。',
    ],
    supportTitle: ['支持', '支援'],
    supportLead: [
      '开始使用，了解适合的浏览器功能，或报告问题。',
      '開始使用，了解適合的瀏覽器功能，或回報問題。',
    ],
    installTitle: ['安装', '安裝'],
    installIntro: [
      '选择与你的浏览器对应的商店。安装后，从浏览器工具栏打开 Tab Manager v2。',
      '選擇與你的瀏覽器對應的商店。安裝後，從瀏覽器工具列開啟 Tab Manager v2。',
    ],
    browserSupport: [
      '支持 Chrome、Edge 和 Firefox。功能是否可用取决于浏览器提供的 API。本项目不支持 Safari；相关限制记录在 <a href="https://github.com/xcv58/Tab-Manager-v2/issues/2545">issue #2545</a> 中。',
      '支援 Chrome、Edge 和 Firefox。功能是否可用取決於瀏覽器提供的 API。本專案不支援 Safari；相關限制記錄在 <a href="https://github.com/xcv58/Tab-Manager-v2/issues/2545">issue #2545</a> 中。',
    ],
    quickStartTitle: ['快速开始', '快速開始'],
    quickStartOpen: [
      '从浏览器工具栏打开扩展，或在独立标签页或窗口中打开，获得更大的视图。',
      '從瀏覽器工具列開啟擴充功能，或在獨立分頁或視窗中開啟，取得更大的檢視畫面。',
    ],
    quickStartSearch: [
      '按 <kbd>/</kbd> 搜索所有窗口中的打开标签页。按 <kbd>&gt;</kbd> 打开命令面板，或按 <kbd>?</kbd> 查看快捷键帮助。',
      '按 <kbd>/</kbd> 搜尋所有視窗中的開啟分頁。按 <kbd>&gt;</kbd> 開啟指令面板，或按 <kbd>?</kbd> 查看快速鍵說明。',
    ],
    quickStartSelect: [
      '选择匹配的标签页，然后批量移动、分组或关闭。',
      '選取符合的分頁，然後批次移動、分組或關閉。',
    ],
    shortcutsTitle: ['常用快捷键', '常用快速鍵'],
    shortcutAction: ['操作', '操作'],
    shortcutKeys: ['快捷键', '快速鍵'],
    shortcutFocus: ['聚焦标签页搜索', '聚焦分頁搜尋'],
    shortcutCommands: ['打开命令面板', '開啟指令面板'],
    shortcutSelect: ['选择聚焦的标签页', '選取聚焦的分頁'],
    shortcutWindow: ['将所选标签页移到新窗口', '將所選分頁移到新視窗'],
    shortcutGroup: ['为所选标签页创建组', '為所選分頁建立群組'],
    shortcutSettings: ['打开设置', '開啟設定'],
    shortcutHelp: ['显示快捷键帮助', '顯示快速鍵說明'],
    shortcutNote: [
      '快捷键行为可能因平台和浏览器而有所不同。请使用应用内的快捷键帮助查看完整列表。',
      '快速鍵行為可能因平台和瀏覽器而有所不同。請使用應用程式內的快速鍵說明查看完整列表。',
    ],
    browserFeaturesTitle: ['浏览器功能', '瀏覽器功能'],
    groupsTitle: ['原生标签页组', '原生分頁群組'],
    groupsBody: [
      '如果浏览器支持原生标签页组，你可以在 Tab Manager v2 中重命名、更改颜色、折叠或取消分组。创建组时，请选择同一窗口中的标签页。不提供自定义窗口名称功能；请使用标签页组为一组标签页命名。',
      '如果瀏覽器支援原生分頁群組，你可以在 Tab Manager v2 中重新命名、更改顏色、摺疊或取消分組。建立群組時，請選取同一視窗中的分頁。不提供自訂視窗名稱功能；請使用分頁群組為一組分頁命名。',
    ],
    historyTitle: ['可选的浏览器历史记录搜索', '選用的瀏覽器歷史紀錄搜尋'],
    historyBody: [
      '在设置中启用“Include browser history in results”（在结果中包含浏览器历史记录），可将浏览器历史记录包含在搜索中。关闭该设置后，搜索结果不包含历史记录。此功能使用浏览器的 <code>history</code> 权限。有关浏览器访问和存储数据的详情，请阅读<a href="../privacy/">隐私政策</a>。',
      '在設定中啟用「Include browser history in results」（在結果中包含瀏覽器歷史紀錄），可將瀏覽器歷史紀錄包含在搜尋中。關閉該設定後，搜尋結果不包含歷史紀錄。此功能使用瀏覽器的 <code>history</code> 權限。有關瀏覽器存取和儲存資料的詳情，請閱讀<a href="../privacy/">隱私政策</a>。',
    ],
    containersTitle: ['Firefox 容器', 'Firefox 容器'],
    containersBody: [
      '当 Firefox 提供所需 API 时，可以使用容器相关流程。这些功能使用容器身份及相关 Cookie 存储信息。Firefox 容器与原生标签页组不同，并且需要安装扩展。',
      '當 Firefox 提供所需 API 時，可以使用容器相關流程。這些功能使用容器身分及相關 Cookie 儲存資訊。Firefox 容器與原生分頁群組不同，並且需要安裝擴充功能。',
    ],
    settingsTitle: ['设置和外观', '設定和外觀'],
    settingsBody: [
      '在扩展设置中调整主题、标签页宽度、字体大小、工具栏可见性、网址显示和搜索偏好。设置在可用时使用浏览器同步存储，并以本地存储作为备用方案。网站的主题和语言控件适用于本网站；已安装的扩展有自己的设置。',
      '在擴充功能設定中調整主題、分頁寬度、字型大小、工具列可見性、網址顯示和搜尋偏好。設定在可用時使用瀏覽器同步儲存，並以本機儲存作為備用方案。網站的主題和語言控制項適用於本網站；已安裝的擴充功能有自己的設定。',
    ],
    demoTitle: ['使用演示', '使用示範'],
    demoBody: [
      '<a href="../demo/">交互演示</a>使用真实的扩展界面和示例标签页、标签页组及历史记录。更改仅保留在演示中，不会影响你的真实浏览器标签页。',
      '<a href="../demo/">互動示範</a>使用真實的擴充功能介面和範例分頁、分頁群組及歷史紀錄。變更僅保留在示範中，不會影響你的真實瀏覽器分頁。',
    ],
    demoReset: [
      '刷新或切换工作区会恢复示例标签页，并保留当前浏览器标签页会话中的演示设置（包括独立的演示主题）。“重新开始”也会重置演示设置。保存的网站主题和语言保持不变。',
      '重新整理或切換工作區會還原範例分頁，並保留目前瀏覽器分頁工作階段中的示範設定（包括獨立的示範主題）。「重新開始」也會重設示範設定。儲存的網站主題和語言保持不變。',
    ],
    demoSimulation: [
      '标签页激活、重新加载、窗口焦点和浏览器历史记录均为模拟。Firefox 容器和浏览器工具栏集成需要安装扩展。',
      '分頁啟用、重新載入、視窗焦點和瀏覽器歷史紀錄均為模擬。Firefox 容器和瀏覽器工具列整合需要安裝擴充功能。',
    ],
    demoClipboard: [
      '复制操作会将示例网址复制到剪贴板，并取决于浏览器的剪贴板访问权限。',
      '複製操作會將範例網址複製到剪貼簿，並取決於瀏覽器的剪貼簿存取權限。',
    ],
    demoScale: [
      '可选的 1,500 标签页工作区用于体验模拟数据下的界面，并非原生浏览器内存基准测试。',
      '選用的 1,500 分頁工作區用於體驗模擬資料下的介面，並非原生瀏覽器記憶體基準測試。',
    ],
    demoLanguage: [
      '嵌入的扩展界面以英文显示。网站文本支持英文、简体中文和繁体中文。',
      '嵌入的擴充功能介面以英文顯示。網站文字支援英文、簡體中文和繁體中文。',
    ],
    getHelpTitle: ['获取帮助', '取得協助'],
    getHelpIntro: [
      '在现有 GitHub issues 中搜索你遇到的情况。如果找不到对应问题，可以提交错误报告或功能请求。',
      '在現有 GitHub issues 中搜尋你遇到的情況。如果找不到對應問題，可以提交錯誤報告或功能請求。',
    ],
    browseIssues: ['浏览现有 issues', '瀏覽現有 issues'],
    openIssue: ['提交 issue', '提交 issue'],
    reportTitle: ['让报告容易复现', '讓報告容易重現'],
    reportVersion: [
      '提供浏览器名称和版本、操作系统，以及 Tab Manager v2 版本。',
      '提供瀏覽器名稱和版本、作業系統，以及 Tab Manager v2 版本。',
    ],
    reportSteps: [
      '描述操作步骤、预期结果和实际结果。如果截图有助于说明问题，请附上截图。',
      '描述操作步驟、預期結果和實際結果。如果螢幕擷取畫面有助於說明問題，請附上圖片。',
    ],
    reportEnvironment: [
      '说明问题发生在已安装的扩展还是网站演示中。对于演示问题，请提供工作区预设和页面网址。',
      '說明問題發生在已安裝的擴充功能還是網站示範中。對於示範問題，請提供工作區預設和頁面網址。',
    ],
    reportSource: [
      '<a href="https://github.com/xcv58/Tab-Manager-v2">GitHub 仓库</a>还提供开发说明和项目 README。',
      '<a href="https://github.com/xcv58/Tab-Manager-v2">GitHub 儲存庫</a>還提供開發說明和專案 README。',
    ],
  }
  const originals = new WeakMap()
  const originalLabels = new WeakMap()
  const originalTitle = document.title
  const description = document.querySelector('meta[name="description"]')
  const originalDescription = description?.getAttribute('content')

  function applyTranslations() {
    const language = window.TabManagerSite?.getLanguage() || 'en'
    const index = language === 'zh-Hans' ? 0 : language === 'zh-Hant' ? 1 : -1
    const translated = (key) => copy[key]?.[index]
    document.querySelectorAll('[data-page-copy]').forEach((element) => {
      if (!originals.has(element)) originals.set(element, element.innerHTML)
      element.innerHTML =
        translated(element.dataset.pageCopy) || originals.get(element)
    })
    document.querySelectorAll('[data-page-label]').forEach((element) => {
      if (!originalLabels.has(element)) {
        originalLabels.set(element, element.getAttribute('aria-label'))
      }
      element.setAttribute(
        'aria-label',
        translated(element.dataset.pageLabel) || originalLabels.get(element),
      )
    })
    const page = document.body.dataset.sitePage
    document.title = translated(page + 'DocumentTitle') || originalTitle
    if (description) {
      description.setAttribute(
        'content',
        translated(page + 'Description') || originalDescription,
      )
    }
  }

  document.addEventListener('site:language-change', applyTranslations)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations, {
      once: true,
    })
  } else {
    applyTranslations()
  }
})()
