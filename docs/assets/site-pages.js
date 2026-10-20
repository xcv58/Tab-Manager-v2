;(function () {
  // Each pair is Simplified and Traditional Chinese. Markup comes only from
  // these checked-in strings, preserving inline code, keyboard keys, and links.
  const copy = {
    browserSupport: [
      'Chrome、Edge 和 Firefox 可从各自的扩展商店安装。Safari macOS 版已通过 <a href="https://testflight.apple.com/join/UKyc8DmK">TestFlight 开放公开测试</a>。请查看 <a href="#safari">Safari 设置</a>和<a href="#browser-features">浏览器对比</a>。',
      'Chrome、Edge 和 Firefox 可從各自的擴充功能商店安裝。Safari macOS 版已透過 <a href="https://testflight.apple.com/join/UKyc8DmK">TestFlight 開放公開測試</a>。請查看 <a href="#safari">Safari 設定</a>和<a href="#browser-features">瀏覽器比較</a>。',
    ],
    quickStartSelect: [
      '选择匹配的标签页，一起关闭、重新加载、固定、复制或导出。移动和分组取决于浏览器支持情况。',
      '選取符合的分頁，一起關閉、重新載入、釘選、複製或匯出。移動和分組取決於瀏覽器支援情況。',
    ],
    moveTabsTip: [
      '在 Chrome、Edge 和 Firefox 中，可通过窗口操作将所选标签页移至窗口开头或末尾，或拖到标题栏的放置区域。Safari 不支持移动标签页或调整顺序。',
      '在 Chrome、Edge 和 Firefox 中，可透過視窗操作將所選分頁移至視窗開頭或結尾，或拖到標題列的放置區域。Safari 不支援移動分頁或調整順序。',
    ],
    groupsBody: [
      '在 Chrome、Edge 和 Firefox 中，可对支持的标签页组命名、改色、折叠或取消分组。选择同一窗口中的标签页可创建分组。Safari 不提供分组编辑，只显示活动分组。',
      '在 Chrome、Edge 和 Firefox 中，可對支援的分頁群組命名、改色、收合或取消分組。選取同一視窗中的分頁可建立群組。Safari 不提供群組編輯，只顯示作用中的群組。',
    ],
    historyBody: [
      'Chrome、Edge 和 Firefox 默认搜索浏览器历史记录。关闭设置中的 <strong>Include browser history in results</strong> 后只搜索打开的标签页。Safari 只搜索打开的标签页。有关访问权限和数据存储，请阅读<a href="../privacy/">隐私政策</a>。',
      'Chrome、Edge 和 Firefox 預設搜尋瀏覽器歷史紀錄。關閉設定中的 <strong>Include browser history in results</strong> 後只搜尋開啟的分頁。Safari 只搜尋開啟的分頁。有關存取權限和資料儲存，請閱讀<a href="../privacy/">隱私政策</a>。',
    ],
    settingsBody: [
      '打开设置并搜索主题、对比度、布局、工具栏、标签页详情或搜索选项。预览展示变化。Safari 在本机保存设置；其他浏览器可在启用浏览器同步时同步设置。网站的主题和语言设置独立保存。',
      '開啟設定並搜尋主題、對比度、版面、工具列、分頁詳情或搜尋選項。預覽展示變化。Safari 在本機儲存設定；其他瀏覽器可在啟用瀏覽器同步時同步設定。網站的主題和語言設定獨立儲存。',
    ],
    liteModeBody: [
      '精简弹窗支持查找、切换、关闭、固定、重新加载、复制和查看标签页详情。打开完整视图可使用批量操作、导出、设置和快捷键帮助。移动和分组需要浏览器支持。Escape 重置普通搜索；菜单或对话框打开时则先关闭它。',
      '精簡彈出視窗支援尋找、切換、關閉、釘選、重新載入、複製和查看分頁詳情。開啟完整檢視可使用批次操作、匯出、設定和快速鍵說明。移動和分組需要瀏覽器支援。Escape 重設一般搜尋；選單或對話框開啟時則先關閉它。',
    ],
    privacyDate: [
      '生效日期：2026 年 10 月 19 日',
      '生效日期：2026 年 10 月 19 日',
    ],
    privacyAccessHistory: [
      'Chrome、Edge 和 Firefox 中启用“Include browser history in results”时的浏览器历史结果；该选项默认开启，可关闭。Safari 不搜索浏览历史',
      'Chrome、Edge 和 Firefox 中啟用「Include browser history in results」時的瀏覽器歷史結果；該選項預設開啟，可關閉。Safari 不搜尋瀏覽紀錄',
    ],
    privacyPermissionsIntro: [
      '权限因浏览器而异。所有版本需要访问打开的标签页、窗口和保存的设置。Safari 会请求网站访问权限以显示标题和网址，并为图标加载请求可选的网站访问权限。Chrome、Edge 和 Firefox 提供浏览历史搜索，可在设置中关闭。',
      '權限因瀏覽器而異。所有版本需要存取開啟的分頁、視窗和儲存的設定。Safari 會要求網站存取權限以顯示標題和網址，並為圖示載入要求可選的網站存取權限。Chrome、Edge 和 Firefox 提供瀏覽紀錄搜尋，可在設定中關閉。',
    ],
    privacyStorageSync: [
      'Safari 在本机保存设置。其他浏览器可在你启用浏览器同步时，按照其提供商的隐私政策同步设置。',
      'Safari 在本機儲存設定。其他瀏覽器可在你啟用瀏覽器同步時，按照其提供者的隱私政策同步設定。',
    ],
    safariTitle: ['Safari macOS 版', 'Safari macOS 版'],
    safariIntro: [
      'Safari 版本是适用于 macOS 的公开测试版。通过 <a href="https://testflight.apple.com/join/UKyc8DmK">TestFlight</a> 安装。',
      'Safari 版本是適用於 macOS 的公開測試版。透過 <a href="https://testflight.apple.com/join/UKyc8DmK">TestFlight</a> 安裝。',
    ],
    safariInstall: [
      '安装 TestFlight，接受测试邀请并安装 Tab Manager v2，然后打开已安装的应用。',
      '安裝 TestFlight，接受測試邀請並安裝 Tab Manager v2，然後開啟已安裝的 App。',
    ],
    safariEnable: [
      '打开 Safari 设置 → 扩展，为你要使用的个人资料启用 Tab Manager v2。',
      '開啟 Safari 設定 → 延伸功能，為你要使用的個人檔案啟用 Tab Manager v2。',
    ],
    safariAccess: [
      'Safari 询问时允许网站访问，以显示标签页标题和网址。如有标题或网址缺失，请检查 Safari 的网站访问设置并刷新管理器。',
      'Safari 詢問時允許網站存取，以顯示分頁標題和網址。如有標題或網址缺失，請檢查 Safari 的網站存取設定並重新整理管理器。',
    ],
    safariOpen: [
      '点击 Safari 工具栏图标打开弹窗。Control+O 打开完整浏览器标签页，Control+T 打开独立管理器窗口，Option+B 循环切换最近使用的标签页。',
      '點擊 Safari 工具列圖示開啟彈出視窗。Control+O 開啟完整瀏覽器分頁，Control+T 開啟獨立管理器視窗，Option+B 循環切換最近使用的分頁。',
    ],
    safariScope: [
      'Safari 显示当前个人资料中的普通窗口，以及 Safari 提供的活动标签页组。不包括非活动分组和隐私窗口。',
      'Safari 顯示目前個人檔案中的一般視窗，以及 Safari 提供的作用中分頁群組。不包括非作用中的群組和私密視窗。',
    ],
    safariIcons: [
      '网站标签页默认显示本机生成的首字母图标。“Load website icons”是可选功能；允许打开的网站后，直接从这些网站下载图标。缺失或无法访问的图标继续显示首字母。',
      '網站分頁預設顯示本機產生的首字母圖示。「Load website icons」是可選功能；允許開啟的網站後，直接從這些網站下載圖示。缺失或無法存取的圖示繼續顯示首字母。',
    ],
    browserComparison: ['浏览器对比', '瀏覽器比較'],
    comparisonFeature: ['功能', '功能'],
    safariBeta: ['Safari macOS 版 · 测试版', 'Safari macOS 版 · 測試版'],
    comparisonCommon: [
      '查找、关闭、重新加载、固定、复制和导出标签页',
      '尋找、關閉、重新載入、釘選、複製和匯出分頁',
    ],
    available: ['支持', '支援'],
    unavailable: ['不支持', '不支援'],
    whereSupported: ['浏览器支持时可用', '瀏覽器支援時可用'],
    comparisonMove: ['移动标签页或调整顺序', '移動分頁或調整順序'],
    comparisonGroups: ['编辑浏览器标签页组', '編輯瀏覽器分頁群組'],
    comparisonHistory: ['搜索浏览器历史记录', '搜尋瀏覽器歷史紀錄'],
    comparisonScope: ['工作区范围', '工作區範圍'],
    browserDependent: ['取决于浏览器权限', '取決於瀏覽器權限'],
    safariScopeShort: [
      '当前个人资料和活动标签页组；不包括隐私窗口',
      '目前個人檔案和作用中的分頁群組；不包括私密視窗',
    ],
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
    privacyIntro: [
      'Tab Manager v2 帮助你管理标签页和窗口。标签页、窗口、历史记录和设置数据留在你的浏览器中，不会发送到我们的服务器。无需账户，扩展也不包含使用情况分析或广告跟踪工具。',
      'Tab Manager v2 幫助你管理分頁和視窗。分頁、視窗、歷史紀錄和設定資料留在你的瀏覽器中，不會傳送到我們的伺服器。無需帳戶，擴充功能也不包含使用情況分析或廣告追蹤工具。',
    ],
    privacyAccessTitle: ['扩展会访问哪些信息', '擴充功能會存取哪些資訊'],
    privacyAccessIntro: [
      '为提供功能，扩展可能会访问：',
      '為提供功能，擴充功能可能會存取：',
    ],
    privacyAccessTabs: ['打开的标签页和窗口', '開啟的分頁和視窗'],
    privacyAccessGroups: [
      '浏览器的标签页组（如果支持）',
      '瀏覽器的分頁群組（如果支援）',
    ],
    privacyAccessContainers: [
      'Firefox 容器及用于区分其登录身份的相关信息',
      'Firefox 容器及用於區分其登入身分的相關資訊',
    ],
    privacyAccessExtensions: [
      '已安装扩展的信息，例如名称和图标，以便为这些扩展的页面显示正确图标',
      '已安裝擴充功能的資訊，例如名稱和圖示，以便為這些擴充功能的頁面顯示正確圖示',
    ],
    privacyStorageTitle: [
      '扩展会在浏览器中存储哪些数据',
      '擴充功能會在瀏覽器中儲存哪些資料',
    ],
    privacyStorageIntro: [
      '浏览器会保存你的设置，以及记住界面使用方式所需的信息。如果支持浏览器同步，设置也可以在设备间同步。',
      '瀏覽器會儲存你的設定，以及記住介面使用方式所需的資訊。如果支援瀏覽器同步，設定也可以在裝置間同步。',
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
    privacyPermissionsTitle: ['权限', '權限'],
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
      '<code>tabGroups</code>：在支持的浏览器中读取和管理浏览器标签页组',
      '<code>tabGroups</code>：在支援的瀏覽器中讀取和管理瀏覽器分頁群組',
    ],
    privacyPermissionContainers: [
      '<code>contextualIdentities</code> 和 <code>cookies</code>：支持 Firefox 容器相关功能',
      '<code>contextualIdentities</code> 和 <code>cookies</code>：支援 Firefox 容器相關功能',
    ],
    privacyNetworkTitle: ['网络和第三方服务', '網路和第三方服務'],
    privacyNetworkCore: [
      '我们不会在自己的服务器上接收你的标签页、窗口、浏览器历史记录或设置。',
      '我們不會在自己的伺服器上接收你的分頁、視窗、瀏覽器歷史紀錄或設定。',
    ],
    privacyNetworkSafariIcons: [
      'Safari 默认使用在本机生成的首字母图标。只有开启“Load website icons”（加载网站图标）并允许网站访问后，扩展才会读取这些页面的图标链接，直接从同一网站下载图标，不发送 Cookie 或来源页面信息。图标缓存在扩展内存中，不使用图标查询服务，也不访问隐私标签页。',
      'Safari 預設使用在本機產生的首字母圖示。只有開啟「Load website icons」（載入網站圖示）並允許網站存取後，擴充功能才會讀取這些頁面的圖示連結，直接從同一網站下載圖示，不傳送 Cookie 或來源頁面資訊。圖示快取儲存在擴充功能記憶體中，不使用圖示查詢服務，也不存取私密分頁。',
    ],
    privacyNetworkLinks: [
      '扩展和文档包含指向浏览器商店、GitHub 和支持页面等第三方网站的链接。如果你打开这些链接，你与这些网站的交互受其隐私政策约束。',
      '擴充功能和文件包含指向瀏覽器商店、GitHub 和支援頁面等第三方網站的連結。如果你開啟這些連結，你與這些網站的互動受其隱私政策約束。',
    ],
    privacyNetworkFonts: [
      'Chrome、Edge 和 Firefox 的弹出界面引用 Google Fonts。Safari 不加载 Google Fonts。当浏览器加载该样式表或相关字体资源时，这些请求会直接发送给 Google，并受 Google 的隐私政策约束。',
      'Chrome、Edge 和 Firefox 的彈出介面引用 Google Fonts。Safari 不載入 Google Fonts。當瀏覽器載入該樣式表或相關字型資源時，這些請求會直接傳送給 Google，並受 Google 的隱私政策約束。',
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
    permissionDetailsTitle: ['权限名称和技术详情', '權限名稱和技術詳情'],
    storageDetailsTitle: ['浏览器存储详情', '瀏覽器儲存詳情'],
    privacyStorageTechnical: [
      '可用时，设置和界面状态通过浏览器的 <code>storage.sync</code> 保存；否则使用 <code>storage.local</code>。',
      '可用時，設定和介面狀態透過瀏覽器的 <code>storage.sync</code> 儲存；否則使用 <code>storage.local</code>。',
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
    quickStartTitle: ['快速开始', '快速開始'],
    quickStartOpen: [
      '从浏览器工具栏打开扩展，或在独立标签页或窗口中打开，获得更大的视图。',
      '從瀏覽器工具列開啟擴充功能，或在獨立分頁或視窗中開啟，取得更大的檢視畫面。',
    ],
    quickStartSearch: [
      '按 <kbd>/</kbd> 搜索所有窗口中的打开标签页。在 macOS 上按 <kbd>Command</kbd> + <kbd>K</kbd>，在 Windows/Linux 上按 <kbd>Alt</kbd> + <kbd>K</kbd> 打开命令面板。<kbd>&gt;</kbd> 仍是别名；按 <kbd>?</kbd> 查看快捷键帮助。',
      '按 <kbd>/</kbd> 搜尋所有視窗中的開啟分頁。在 macOS 上按 <kbd>Command</kbd> + <kbd>K</kbd>，在 Windows/Linux 上按 <kbd>Alt</kbd> + <kbd>K</kbd> 開啟指令面板。<kbd>&gt;</kbd> 仍是別名；按 <kbd>?</kbd> 查看快速鍵說明。',
    ],
    shortcutsTitle: ['常用快捷键', '常用快速鍵'],
    shortcutAction: ['操作', '操作'],
    shortcutKeys: ['快捷键', '快速鍵'],
    shortcutFocus: ['聚焦标签页搜索', '聚焦分頁搜尋'],
    shortcutCommands: ['打开命令面板', '開啟指令面板'],
    shortcutSelectionActions: ['查找所选标签页的操作', '尋找所選分頁的操作'],
    shortcutSelect: ['选择聚焦的标签页', '選取聚焦的分頁'],
    shortcutWindow: ['将所选标签页移到新窗口', '將所選分頁移到新視窗'],
    shortcutGroup: ['为所选标签页创建组', '為所選分頁建立群組'],
    shortcutMoveEdges: [
      '将所选标签页移到聚焦窗口的开头 / 末尾',
      '將所選分頁移到聚焦視窗的開頭 / 結尾',
    ],
    shortcutMoveRelative: [
      '将所选标签页移到聚焦标签页之前 / 之后',
      '將所選分頁移到聚焦分頁之前 / 之後',
    ],
    shortcutSettings: ['打开设置', '開啟設定'],
    shortcutHelp: ['显示快捷键帮助', '顯示快速鍵說明'],
    shortcutNote: [
      '在 Mac 上，请用 Option 代替 Alt。移动快捷键要求焦点位于窗口卡片内。快捷键行为可能因平台和浏览器而有所不同。请使用应用内的快捷键帮助查看完整列表，包括 Vim 按键序列。',
      '在 Mac 上，請用 Option 代替 Alt。移動快速鍵要求焦點位於視窗卡片內。快速鍵行為可能因平台和瀏覽器而有所不同。請使用應用程式內的快速鍵說明查看完整列表，包括 Vim 按鍵序列。',
    ],
    browserFeaturesTitle: ['浏览器功能', '瀏覽器功能'],
    groupsTitle: ['浏览器的标签页组', '瀏覽器的分頁群組'],
    historyTitle: ['显示或隐藏浏览器历史记录', '顯示或隱藏瀏覽器歷史紀錄'],
    containersTitle: ['Firefox 容器', 'Firefox 容器'],
    containersBody: [
      'Firefox 容器可将不同的登录身份分开。功能可用时，Tab Manager v2 可以管理容器中的标签页。容器与标签页组不同，需要安装扩展才能使用。',
      'Firefox 容器可將不同的登入身分分開。功能可用時，Tab Manager v2 可以管理容器中的分頁。容器與分頁群組不同，需要安裝擴充功能才能使用。',
    ],
    settingsTitle: ['设置和外观', '設定和外觀'],
    tabActionsTitle: ['标签页操作与复制', '分頁操作與複製'],
    tabActionsBody: [
      '右键点击标签页、窗口标题栏或标签页组以查看操作。悬停标签页即可选择标题和网址文字，复制或展开长文本。在完整视图中，选中标签页并在角落的操作搜索中输入文字，即可一起移动、重新加载、复制或保存。按 Ctrl+Shift+F 聚焦操作搜索；未选择标签页时，该快捷键会聚焦工具栏。按 Esc 返回或收起操作。可复制标题、网址、两者、CSV、TSV、JSON 或 Markdown，也可下载 CSV、TSV、JSON 或 Markdown。复制和导出会保留所选标签页。',
      '在分頁、視窗標題列或分頁群組上按右鍵以查看操作。停留在分頁上即可選取標題和網址文字，複製或展開長文字。在完整檢視中，選取分頁並在角落的操作搜尋中輸入文字，即可一起移動、重新載入、複製或儲存。按 Ctrl+Shift+F 聚焦操作搜尋；未選取分頁時，此快速鍵會聚焦工具列。按 Esc 返回或收合操作。可複製標題、網址、兩者、CSV、TSV、JSON 或 Markdown，也可下載 CSV、TSV、JSON 或 Markdown。複製和匯出會保留所選分頁。',
    ],
    liteModeTitle: ['精简模式中的快捷操作', '精簡模式中的快捷操作'],
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
      '可选的 1,500 标签页工作区让你使用示例数据体验布局，不会测量浏览器的内存占用。',
      '選用的 1,500 分頁工作區讓你使用範例資料體驗版面配置，不會測量瀏覽器的記憶體用量。',
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
