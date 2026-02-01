;(() => {
  var e = {
      2470(e, t, n) {
        var s, r
        !(function () {
          'use strict'
          ;((s = function () {
            var e = function () {},
              t = 'undefined',
              n =
                typeof window !== t &&
                typeof window.navigator !== t &&
                /Trident\/|MSIE /.test(window.navigator.userAgent),
              s = ['trace', 'debug', 'info', 'warn', 'error'],
              r = {},
              o = null
            function i(e, t) {
              var n = e[t]
              if ('function' == typeof n.bind) return n.bind(e)
              try {
                return Function.prototype.bind.call(n, e)
              } catch (t) {
                return function () {
                  return Function.prototype.apply.apply(n, [e, arguments])
                }
              }
            }
            function a() {
              ;(console.log &&
                (console.log.apply
                  ? console.log.apply(console, arguments)
                  : Function.prototype.apply.apply(console.log, [
                      console,
                      arguments,
                    ])),
                console.trace && console.trace())
            }
            function g(s) {
              return (
                'debug' === s && (s = 'log'),
                typeof console !== t &&
                  ('trace' === s && n
                    ? a
                    : void 0 !== console[s]
                      ? i(console, s)
                      : void 0 !== console.log
                        ? i(console, 'log')
                        : e)
              )
            }
            function l() {
              for (var n = this.getLevel(), r = 0; r < s.length; r++) {
                var o = s[r]
                this[o] = r < n ? e : this.methodFactory(o, n, this.name)
              }
              if (
                ((this.log = this.debug),
                typeof console === t && n < this.levels.SILENT)
              )
                return 'No console available for logging'
            }
            function c(e) {
              return function () {
                typeof console !== t &&
                  (l.call(this), this[e].apply(this, arguments))
              }
            }
            function m(e, t, n) {
              return g(e) || c.apply(this, arguments)
            }
            function d(e, n) {
              var i,
                a,
                g,
                c = this,
                d = 'loglevel'
              function A(e) {
                var n = (s[e] || 'silent').toUpperCase()
                if (typeof window !== t && d) {
                  try {
                    return void (window.localStorage[d] = n)
                  } catch (e) {}
                  try {
                    window.document.cookie =
                      encodeURIComponent(d) + '=' + n + ';'
                  } catch (e) {}
                }
              }
              function u() {
                var e
                if (typeof window !== t && d) {
                  try {
                    e = window.localStorage[d]
                  } catch (e) {}
                  if (typeof e === t)
                    try {
                      var n = window.document.cookie,
                        s = encodeURIComponent(d),
                        r = n.indexOf(s + '=')
                      ;-1 !== r &&
                        (e = /^([^;]+)/.exec(n.slice(r + s.length + 1))[1])
                    } catch (e) {}
                  return (void 0 === c.levels[e] && (e = void 0), e)
                }
              }
              function f() {
                if (typeof window !== t && d) {
                  try {
                    window.localStorage.removeItem(d)
                  } catch (e) {}
                  try {
                    window.document.cookie =
                      encodeURIComponent(d) +
                      '=; expires=Thu, 01 Jan 1970 00:00:00 UTC'
                  } catch (e) {}
                }
              }
              function p(e) {
                var t = e
                if (
                  ('string' == typeof t &&
                    void 0 !== c.levels[t.toUpperCase()] &&
                    (t = c.levels[t.toUpperCase()]),
                  'number' == typeof t && t >= 0 && t <= c.levels.SILENT)
                )
                  return t
                throw new TypeError(
                  'log.setLevel() called with invalid level: ' + e,
                )
              }
              ;('string' == typeof e
                ? (d += ':' + e)
                : 'symbol' == typeof e && (d = void 0),
                (c.name = e),
                (c.levels = {
                  TRACE: 0,
                  DEBUG: 1,
                  INFO: 2,
                  WARN: 3,
                  ERROR: 4,
                  SILENT: 5,
                }),
                (c.methodFactory = n || m),
                (c.getLevel = function () {
                  return null != g ? g : null != a ? a : i
                }),
                (c.setLevel = function (e, t) {
                  return ((g = p(e)), !1 !== t && A(g), l.call(c))
                }),
                (c.setDefaultLevel = function (e) {
                  ;((a = p(e)), u() || c.setLevel(e, !1))
                }),
                (c.resetLevel = function () {
                  ;((g = null), f(), l.call(c))
                }),
                (c.enableAll = function (e) {
                  c.setLevel(c.levels.TRACE, e)
                }),
                (c.disableAll = function (e) {
                  c.setLevel(c.levels.SILENT, e)
                }),
                (c.rebuild = function () {
                  if ((o !== c && (i = p(o.getLevel())), l.call(c), o === c))
                    for (var e in r) r[e].rebuild()
                }),
                (i = p(o ? o.getLevel() : 'WARN')))
              var h = u()
              ;(null != h && (g = p(h)), l.call(c))
            }
            ;(o = new d()).getLogger = function (e) {
              if (('symbol' != typeof e && 'string' != typeof e) || '' === e)
                throw new TypeError(
                  'You must supply a name when creating a logger.',
                )
              var t = r[e]
              return (t || (t = r[e] = new d(e, o.methodFactory)), t)
            }
            var A = typeof window !== t ? window.log : void 0
            return (
              (o.noConflict = function () {
                return (
                  typeof window !== t && window.log === o && (window.log = A),
                  o
                )
              }),
              (o.getLoggers = function () {
                return r
              }),
              (o.default = o),
              o
            )
          }),
            void 0 === (r = 'function' == typeof s ? s.call(t, n, t, e) : s) ||
              (e.exports = r))
        })()
      },
      3346(e, t) {
        var n, s, r
        ;('undefined' != typeof globalThis
          ? globalThis
          : 'undefined' != typeof self && self,
          (s = [e]),
          (n = function (e) {
            'use strict'
            if (
              !(
                globalThis.chrome &&
                globalThis.chrome.runtime &&
                globalThis.chrome.runtime.id
              )
            )
              throw new Error(
                'This script should only be loaded in a browser extension.',
              )
            if (
              globalThis.browser &&
              globalThis.browser.runtime &&
              globalThis.browser.runtime.id
            )
              e.exports = globalThis.browser
            else {
              const t =
                  'The message port closed before a response was received.',
                n = (e) => {
                  const n = {
                    alarms: {
                      clear: { minArgs: 0, maxArgs: 1 },
                      clearAll: { minArgs: 0, maxArgs: 0 },
                      get: { minArgs: 0, maxArgs: 1 },
                      getAll: { minArgs: 0, maxArgs: 0 },
                    },
                    bookmarks: {
                      create: { minArgs: 1, maxArgs: 1 },
                      get: { minArgs: 1, maxArgs: 1 },
                      getChildren: { minArgs: 1, maxArgs: 1 },
                      getRecent: { minArgs: 1, maxArgs: 1 },
                      getSubTree: { minArgs: 1, maxArgs: 1 },
                      getTree: { minArgs: 0, maxArgs: 0 },
                      move: { minArgs: 2, maxArgs: 2 },
                      remove: { minArgs: 1, maxArgs: 1 },
                      removeTree: { minArgs: 1, maxArgs: 1 },
                      search: { minArgs: 1, maxArgs: 1 },
                      update: { minArgs: 2, maxArgs: 2 },
                    },
                    browserAction: {
                      disable: {
                        minArgs: 0,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      enable: {
                        minArgs: 0,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      getBadgeBackgroundColor: { minArgs: 1, maxArgs: 1 },
                      getBadgeText: { minArgs: 1, maxArgs: 1 },
                      getPopup: { minArgs: 1, maxArgs: 1 },
                      getTitle: { minArgs: 1, maxArgs: 1 },
                      openPopup: { minArgs: 0, maxArgs: 0 },
                      setBadgeBackgroundColor: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      setBadgeText: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      setIcon: { minArgs: 1, maxArgs: 1 },
                      setPopup: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      setTitle: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                    },
                    browsingData: {
                      remove: { minArgs: 2, maxArgs: 2 },
                      removeCache: { minArgs: 1, maxArgs: 1 },
                      removeCookies: { minArgs: 1, maxArgs: 1 },
                      removeDownloads: { minArgs: 1, maxArgs: 1 },
                      removeFormData: { minArgs: 1, maxArgs: 1 },
                      removeHistory: { minArgs: 1, maxArgs: 1 },
                      removeLocalStorage: { minArgs: 1, maxArgs: 1 },
                      removePasswords: { minArgs: 1, maxArgs: 1 },
                      removePluginData: { minArgs: 1, maxArgs: 1 },
                      settings: { minArgs: 0, maxArgs: 0 },
                    },
                    commands: { getAll: { minArgs: 0, maxArgs: 0 } },
                    contextMenus: {
                      remove: { minArgs: 1, maxArgs: 1 },
                      removeAll: { minArgs: 0, maxArgs: 0 },
                      update: { minArgs: 2, maxArgs: 2 },
                    },
                    cookies: {
                      get: { minArgs: 1, maxArgs: 1 },
                      getAll: { minArgs: 1, maxArgs: 1 },
                      getAllCookieStores: { minArgs: 0, maxArgs: 0 },
                      remove: { minArgs: 1, maxArgs: 1 },
                      set: { minArgs: 1, maxArgs: 1 },
                    },
                    devtools: {
                      inspectedWindow: {
                        eval: { minArgs: 1, maxArgs: 2, singleCallbackArg: !1 },
                      },
                      panels: {
                        create: {
                          minArgs: 3,
                          maxArgs: 3,
                          singleCallbackArg: !0,
                        },
                        elements: {
                          createSidebarPane: { minArgs: 1, maxArgs: 1 },
                        },
                      },
                    },
                    downloads: {
                      cancel: { minArgs: 1, maxArgs: 1 },
                      download: { minArgs: 1, maxArgs: 1 },
                      erase: { minArgs: 1, maxArgs: 1 },
                      getFileIcon: { minArgs: 1, maxArgs: 2 },
                      open: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      pause: { minArgs: 1, maxArgs: 1 },
                      removeFile: { minArgs: 1, maxArgs: 1 },
                      resume: { minArgs: 1, maxArgs: 1 },
                      search: { minArgs: 1, maxArgs: 1 },
                      show: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                    },
                    extension: {
                      isAllowedFileSchemeAccess: { minArgs: 0, maxArgs: 0 },
                      isAllowedIncognitoAccess: { minArgs: 0, maxArgs: 0 },
                    },
                    history: {
                      addUrl: { minArgs: 1, maxArgs: 1 },
                      deleteAll: { minArgs: 0, maxArgs: 0 },
                      deleteRange: { minArgs: 1, maxArgs: 1 },
                      deleteUrl: { minArgs: 1, maxArgs: 1 },
                      getVisits: { minArgs: 1, maxArgs: 1 },
                      search: { minArgs: 1, maxArgs: 1 },
                    },
                    i18n: {
                      detectLanguage: { minArgs: 1, maxArgs: 1 },
                      getAcceptLanguages: { minArgs: 0, maxArgs: 0 },
                    },
                    identity: { launchWebAuthFlow: { minArgs: 1, maxArgs: 1 } },
                    idle: { queryState: { minArgs: 1, maxArgs: 1 } },
                    management: {
                      get: { minArgs: 1, maxArgs: 1 },
                      getAll: { minArgs: 0, maxArgs: 0 },
                      getSelf: { minArgs: 0, maxArgs: 0 },
                      setEnabled: { minArgs: 2, maxArgs: 2 },
                      uninstallSelf: { minArgs: 0, maxArgs: 1 },
                    },
                    notifications: {
                      clear: { minArgs: 1, maxArgs: 1 },
                      create: { minArgs: 1, maxArgs: 2 },
                      getAll: { minArgs: 0, maxArgs: 0 },
                      getPermissionLevel: { minArgs: 0, maxArgs: 0 },
                      update: { minArgs: 2, maxArgs: 2 },
                    },
                    pageAction: {
                      getPopup: { minArgs: 1, maxArgs: 1 },
                      getTitle: { minArgs: 1, maxArgs: 1 },
                      hide: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      setIcon: { minArgs: 1, maxArgs: 1 },
                      setPopup: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      setTitle: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                      show: {
                        minArgs: 1,
                        maxArgs: 1,
                        fallbackToNoCallback: !0,
                      },
                    },
                    permissions: {
                      contains: { minArgs: 1, maxArgs: 1 },
                      getAll: { minArgs: 0, maxArgs: 0 },
                      remove: { minArgs: 1, maxArgs: 1 },
                      request: { minArgs: 1, maxArgs: 1 },
                    },
                    runtime: {
                      getBackgroundPage: { minArgs: 0, maxArgs: 0 },
                      getPlatformInfo: { minArgs: 0, maxArgs: 0 },
                      openOptionsPage: { minArgs: 0, maxArgs: 0 },
                      requestUpdateCheck: { minArgs: 0, maxArgs: 0 },
                      sendMessage: { minArgs: 1, maxArgs: 3 },
                      sendNativeMessage: { minArgs: 2, maxArgs: 2 },
                      setUninstallURL: { minArgs: 1, maxArgs: 1 },
                    },
                    sessions: {
                      getDevices: { minArgs: 0, maxArgs: 1 },
                      getRecentlyClosed: { minArgs: 0, maxArgs: 1 },
                      restore: { minArgs: 0, maxArgs: 1 },
                    },
                    storage: {
                      local: {
                        clear: { minArgs: 0, maxArgs: 0 },
                        get: { minArgs: 0, maxArgs: 1 },
                        getBytesInUse: { minArgs: 0, maxArgs: 1 },
                        remove: { minArgs: 1, maxArgs: 1 },
                        set: { minArgs: 1, maxArgs: 1 },
                      },
                      managed: {
                        get: { minArgs: 0, maxArgs: 1 },
                        getBytesInUse: { minArgs: 0, maxArgs: 1 },
                      },
                      sync: {
                        clear: { minArgs: 0, maxArgs: 0 },
                        get: { minArgs: 0, maxArgs: 1 },
                        getBytesInUse: { minArgs: 0, maxArgs: 1 },
                        remove: { minArgs: 1, maxArgs: 1 },
                        set: { minArgs: 1, maxArgs: 1 },
                      },
                    },
                    tabs: {
                      captureVisibleTab: { minArgs: 0, maxArgs: 2 },
                      create: { minArgs: 1, maxArgs: 1 },
                      detectLanguage: { minArgs: 0, maxArgs: 1 },
                      discard: { minArgs: 0, maxArgs: 1 },
                      duplicate: { minArgs: 1, maxArgs: 1 },
                      executeScript: { minArgs: 1, maxArgs: 2 },
                      get: { minArgs: 1, maxArgs: 1 },
                      getCurrent: { minArgs: 0, maxArgs: 0 },
                      getZoom: { minArgs: 0, maxArgs: 1 },
                      getZoomSettings: { minArgs: 0, maxArgs: 1 },
                      goBack: { minArgs: 0, maxArgs: 1 },
                      goForward: { minArgs: 0, maxArgs: 1 },
                      highlight: { minArgs: 1, maxArgs: 1 },
                      insertCSS: { minArgs: 1, maxArgs: 2 },
                      move: { minArgs: 2, maxArgs: 2 },
                      query: { minArgs: 1, maxArgs: 1 },
                      reload: { minArgs: 0, maxArgs: 2 },
                      remove: { minArgs: 1, maxArgs: 1 },
                      removeCSS: { minArgs: 1, maxArgs: 2 },
                      sendMessage: { minArgs: 2, maxArgs: 3 },
                      setZoom: { minArgs: 1, maxArgs: 2 },
                      setZoomSettings: { minArgs: 1, maxArgs: 2 },
                      update: { minArgs: 1, maxArgs: 2 },
                    },
                    topSites: { get: { minArgs: 0, maxArgs: 0 } },
                    webNavigation: {
                      getAllFrames: { minArgs: 1, maxArgs: 1 },
                      getFrame: { minArgs: 1, maxArgs: 1 },
                    },
                    webRequest: {
                      handlerBehaviorChanged: { minArgs: 0, maxArgs: 0 },
                    },
                    windows: {
                      create: { minArgs: 0, maxArgs: 1 },
                      get: { minArgs: 1, maxArgs: 2 },
                      getAll: { minArgs: 0, maxArgs: 1 },
                      getCurrent: { minArgs: 0, maxArgs: 1 },
                      getLastFocused: { minArgs: 0, maxArgs: 1 },
                      remove: { minArgs: 1, maxArgs: 1 },
                      update: { minArgs: 2, maxArgs: 2 },
                    },
                  }
                  if (0 === Object.keys(n).length)
                    throw new Error(
                      'api-metadata.json has not been included in browser-polyfill',
                    )
                  class s extends WeakMap {
                    constructor(e, t = void 0) {
                      ;(super(t), (this.createItem = e))
                    }
                    get(e) {
                      return (
                        this.has(e) || this.set(e, this.createItem(e)),
                        super.get(e)
                      )
                    }
                  }
                  const r = (e) =>
                      e && 'object' == typeof e && 'function' == typeof e.then,
                    o =
                      (t, n) =>
                      (...s) => {
                        e.runtime.lastError
                          ? t.reject(new Error(e.runtime.lastError.message))
                          : n.singleCallbackArg ||
                              (s.length <= 1 && !1 !== n.singleCallbackArg)
                            ? t.resolve(s[0])
                            : t.resolve(s)
                      },
                    i = (e) => (1 == e ? 'argument' : 'arguments'),
                    a = (e, t) =>
                      function (n, ...s) {
                        if (s.length < t.minArgs)
                          throw new Error(
                            `Expected at least ${t.minArgs} ${i(t.minArgs)} for ${e}(), got ${s.length}`,
                          )
                        if (s.length > t.maxArgs)
                          throw new Error(
                            `Expected at most ${t.maxArgs} ${i(t.maxArgs)} for ${e}(), got ${s.length}`,
                          )
                        return new Promise((r, i) => {
                          if (t.fallbackToNoCallback)
                            try {
                              n[e](...s, o({ resolve: r, reject: i }, t))
                            } catch (o) {
                              ;(console.warn(
                                `${e} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,
                                o,
                              ),
                                n[e](...s),
                                (t.fallbackToNoCallback = !1),
                                (t.noCallback = !0),
                                r())
                            }
                          else
                            t.noCallback
                              ? (n[e](...s), r())
                              : n[e](...s, o({ resolve: r, reject: i }, t))
                        })
                      },
                    g = (e, t, n) =>
                      new Proxy(t, { apply: (t, s, r) => n.call(s, e, ...r) })
                  let l = Function.call.bind(Object.prototype.hasOwnProperty)
                  const c = (e, t = {}, n = {}) => {
                      let s = Object.create(null),
                        r = {
                          has: (t, n) => n in e || n in s,
                          get(r, o, i) {
                            if (o in s) return s[o]
                            if (!(o in e)) return
                            let m = e[o]
                            if ('function' == typeof m)
                              if ('function' == typeof t[o])
                                m = g(e, e[o], t[o])
                              else if (l(n, o)) {
                                let t = a(o, n[o])
                                m = g(e, e[o], t)
                              } else m = m.bind(e)
                            else if (
                              'object' == typeof m &&
                              null !== m &&
                              (l(t, o) || l(n, o))
                            )
                              m = c(m, t[o], n[o])
                            else {
                              if (!l(n, '*'))
                                return (
                                  Object.defineProperty(s, o, {
                                    configurable: !0,
                                    enumerable: !0,
                                    get: () => e[o],
                                    set(t) {
                                      e[o] = t
                                    },
                                  }),
                                  m
                                )
                              m = c(m, t[o], n['*'])
                            }
                            return ((s[o] = m), m)
                          },
                          set: (t, n, r, o) => (
                            n in s ? (s[n] = r) : (e[n] = r),
                            !0
                          ),
                          defineProperty: (e, t, n) =>
                            Reflect.defineProperty(s, t, n),
                          deleteProperty: (e, t) =>
                            Reflect.deleteProperty(s, t),
                        },
                        o = Object.create(e)
                      return new Proxy(o, r)
                    },
                    m = (e) => ({
                      addListener(t, n, ...s) {
                        t.addListener(e.get(n), ...s)
                      },
                      hasListener: (t, n) => t.hasListener(e.get(n)),
                      removeListener(t, n) {
                        t.removeListener(e.get(n))
                      },
                    }),
                    d = new s((e) =>
                      'function' != typeof e
                        ? e
                        : function (t) {
                            const n = c(
                              t,
                              {},
                              { getContent: { minArgs: 0, maxArgs: 0 } },
                            )
                            e(n)
                          },
                    ),
                    A = new s((e) =>
                      'function' != typeof e
                        ? e
                        : function (t, n, s) {
                            let o,
                              i,
                              a = !1,
                              g = new Promise((e) => {
                                o = function (t) {
                                  ;((a = !0), e(t))
                                }
                              })
                            try {
                              i = e(t, n, o)
                            } catch (e) {
                              i = Promise.reject(e)
                            }
                            const l = !0 !== i && r(i)
                            if (!0 !== i && !l && !a) return !1
                            const c = (e) => {
                              e.then(
                                (e) => {
                                  s(e)
                                },
                                (e) => {
                                  let t
                                  ;((t =
                                    e &&
                                    (e instanceof Error ||
                                      'string' == typeof e.message)
                                      ? e.message
                                      : 'An unexpected error occurred'),
                                    s({
                                      __mozWebExtensionPolyfillReject__: !0,
                                      message: t,
                                    }))
                                },
                              ).catch((e) => {
                                console.error(
                                  'Failed to send onMessage rejected reply',
                                  e,
                                )
                              })
                            }
                            return (c(l ? i : g), !0)
                          },
                    ),
                    u = ({ reject: n, resolve: s }, r) => {
                      e.runtime.lastError
                        ? e.runtime.lastError.message === t
                          ? s()
                          : n(new Error(e.runtime.lastError.message))
                        : r && r.__mozWebExtensionPolyfillReject__
                          ? n(new Error(r.message))
                          : s(r)
                    },
                    f = (e, t, n, ...s) => {
                      if (s.length < t.minArgs)
                        throw new Error(
                          `Expected at least ${t.minArgs} ${i(t.minArgs)} for ${e}(), got ${s.length}`,
                        )
                      if (s.length > t.maxArgs)
                        throw new Error(
                          `Expected at most ${t.maxArgs} ${i(t.maxArgs)} for ${e}(), got ${s.length}`,
                        )
                      return new Promise((e, t) => {
                        const r = u.bind(null, { resolve: e, reject: t })
                        ;(s.push(r), n.sendMessage(...s))
                      })
                    },
                    p = {
                      devtools: { network: { onRequestFinished: m(d) } },
                      runtime: {
                        onMessage: m(A),
                        onMessageExternal: m(A),
                        sendMessage: f.bind(null, 'sendMessage', {
                          minArgs: 1,
                          maxArgs: 3,
                        }),
                      },
                      tabs: {
                        sendMessage: f.bind(null, 'sendMessage', {
                          minArgs: 2,
                          maxArgs: 3,
                        }),
                      },
                    },
                    h = {
                      clear: { minArgs: 1, maxArgs: 1 },
                      get: { minArgs: 1, maxArgs: 1 },
                      set: { minArgs: 1, maxArgs: 1 },
                    }
                  return (
                    (n.privacy = {
                      network: { '*': h },
                      services: { '*': h },
                      websites: { '*': h },
                    }),
                    c(e, p, n)
                  )
                }
              e.exports = n(chrome)
            }
          }),
          void 0 === (r = 'function' == typeof n ? n.apply(t, s) : n) ||
            (e.exports = r))
      },
    },
    t = {}
  function n(s) {
    var r = t[s]
    if (void 0 !== r) return r.exports
    var o = (t[s] = { exports: {} })
    return (e[s].call(o.exports, o, o.exports, n), o.exports)
  }
  ;((n.n = (e) => {
    var t = e && e.__esModule ? () => e.default : () => e
    return (n.d(t, { a: t }), t)
  }),
    (n.d = (e, t) => {
      for (var s in t)
        n.o(t, s) &&
          !n.o(e, s) &&
          Object.defineProperty(e, s, { enumerable: !0, get: t[s] })
    }),
    (n.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
    (() => {
      'use strict'
      var e = n(3346),
        t = n.n(e),
        s = n(2470),
        r = n.n(s)
      r().setLevel('INFO')
      const o = r()
      var i = function (e, t, n, s) {
        return new (n || (n = Promise))(function (r, o) {
          function i(e) {
            try {
              g(s.next(e))
            } catch (e) {
              o(e)
            }
          }
          function a(e) {
            try {
              g(s.throw(e))
            } catch (e) {
              o(e)
            }
          }
          function g(e) {
            var t
            e.done
              ? r(e.value)
              : ((t = e.value),
                t instanceof n
                  ? t
                  : new n(function (e) {
                      e(t)
                    })).then(i, a)
          }
          g((s = s.apply(e, t || [])).next())
        })
      }
      const a = t().runtime.getURL('popup.html') + '?not_popup=1',
        g = () => {
          'undefined' != typeof window &&
            window.location.href !== a &&
            window.close()
        },
        l = (e) =>
          i(void 0, void 0, void 0, function* () {
            const [n, ...s] = e,
              r = n.id,
              o = yield t().windows.create({ tabId: r })
            ;(yield ((e, n, ...s) =>
              i(void 0, [e, n, ...s], void 0, function* (e, n, s = 0) {
                'true' !== process.env.IS_SAFARI
                  ? yield Promise.all(
                      e.map((e, r) =>
                        i(
                          void 0,
                          [e, r],
                          void 0,
                          function* ({ id: e, pinned: r }, o) {
                            const i = s + (-1 !== s ? o : 0)
                            ;(yield t().tabs.update(e, { pinned: r }),
                              yield t().tabs.move(e, { windowId: n, index: i }))
                          },
                        ),
                      ),
                    )
                  : yield Promise.all(
                      e.map((e) =>
                        i(
                          void 0,
                          [e],
                          void 0,
                          function* ({ id: e, pinned: n }) {
                            yield t().tabs.update(e, { pinned: n })
                          },
                        ),
                      ),
                    )
              }))(s, o.id, -1),
              yield t().windows.update(o.id, { focused: !0 }))
          }),
        c = () =>
          i(void 0, void 0, void 0, function* () {
            o.debug('openOrTogglePopup')
            const { _selfPopupActive: e } = yield t().storage.local.get({
              _selfPopupActive: !1,
            })
            if (e)
              return i(void 0, void 0, void 0, function* () {
                o.debug('focusOnLastFocusedWin')
                const e = yield t().windows.getAll({ populate: !0 }),
                  n = yield h()
                if (e.find((e) => e.id === n))
                  return (
                    o.debug(
                      'focusOnLastFocusedWin focus on valid lastFocusedWindowId:',
                      n,
                    ),
                    t().windows.update(n, { focused: !0 })
                  )
                const s = e.find((e) => !f(e))
                if (s)
                  return (
                    o.debug(
                      'focusOnLastFocusedWin lastFocusedWindowId is invalid, focused on the first window',
                      { win: s, lastFocusedWindowId: n },
                    ),
                    t().windows.update(s.id, { focused: !0 })
                  )
                o.error(
                  'focusOnLastFocusedWin lastFocusedWindowId is invalid, and no active window to focus',
                )
              })
            const n = (yield t().windows.getAll({ populate: !0 })).find(f)
            if ((o.debug('openOrTogglePopup win:', { win: n }), !n)) return d()
            ;(o.debug('openOrTogglePopup focus popup window:', { win: n }),
              t().windows.update(n.id, { focused: !0 }))
          }),
        m = (e) => Math.floor(e),
        d = () =>
          i(void 0, void 0, void 0, function* () {
            o.debug('openPopup')
            const {
              availHeight: e = 500,
              availLeft: n = 0,
              availTop: s = 0,
              availWidth: r = 500,
            } = yield t().storage.local.get([
              'availHeight',
              'availLeft',
              'availTop',
              'availWidth',
            ])
            o.debug('openPopup', {
              availHeight: e,
              availLeft: n,
              availTop: s,
              availWidth: r,
            })
            const i = m(Math.max(1024, r / 2)),
              g = m(Math.max(768, e / 2)),
              l = m(s + (e - g) / 2),
              c = m(n + (r - i) / 2)
            t().windows.create({
              top: l,
              left: c,
              height: g,
              width: i,
              url: a,
              type: 'popup',
            })
          }),
        A = () => {
          ;(t().tabs.create({ url: a }), g())
        },
        u = (e) => e.url === a || e.pendingUrl === a,
        f = ({ type: e, tabs: t = [] }) =>
          'popup' === e && 1 === t.length && u(t[0]),
        p = (e) => (
          o.debug('setSelfPopupActive:', { _selfPopupActive: e }),
          t().storage.local.set({ _selfPopupActive: e })
        ),
        h = () =>
          i(void 0, void 0, void 0, function* () {
            try {
              const { lastFocusedWindowId: e } = yield t().storage.local.get({
                lastFocusedWindowId: null,
              })
              return e
            } catch (e) {
              return null
            }
          }),
        x = 'TOGGLE-POPUP',
        v = 'OPEN-IN-NEW-TAB',
        b = 'LAST-ACTIVE-TAB',
        w = 'CREATE-WINDOW'
      var y = function (e, t, n, s) {
        return new (n || (n = Promise))(function (r, o) {
          function i(e) {
            try {
              g(s.next(e))
            } catch (e) {
              o(e)
            }
          }
          function a(e) {
            try {
              g(s.throw(e))
            } catch (e) {
              o(e)
            }
          }
          function g(e) {
            var t
            e.done
              ? r(e.value)
              : ((t = e.value),
                t instanceof n
                  ? t
                  : new n(function (e) {
                      e(t)
                    })).then(i, a)
          }
          g((s = s.apply(e, t || [])).next())
        })
      }
      const T = () =>
        y(void 0, void 0, void 0, function* () {
          const { systemTheme: e } = yield t().storage.local.get('systemTheme'),
            n = 'dark' === e
          ;[t().browserAction, t().action].forEach((e) => {
            e &&
              e.setIcon &&
              e.setIcon({ path: `icon-128${n ? '-dark' : ''}.png` })
          })
        })
      var I = function (e, t, n, s) {
          return new (n || (n = Promise))(function (r, o) {
            function i(e) {
              try {
                g(s.next(e))
              } catch (e) {
                o(e)
              }
            }
            function a(e) {
              try {
                g(s.throw(e))
              } catch (e) {
                o(e)
              }
            }
            function g(e) {
              var t
              e.done
                ? r(e.value)
                : ((t = e.value),
                  t instanceof n
                    ? t
                    : new n(function (e) {
                        e(t)
                      })).then(i, a)
            }
            g((s = s.apply(e, t || [])).next())
          })
        },
        C = function (e, t) {
          var n = {}
          for (var s in e)
            Object.prototype.hasOwnProperty.call(e, s) &&
              t.indexOf(s) < 0 &&
              (n[s] = e[s])
          if (null != e && 'function' == typeof Object.getOwnPropertySymbols) {
            var r = 0
            for (s = Object.getOwnPropertySymbols(e); r < s.length; r++)
              t.indexOf(s[r]) < 0 &&
                Object.prototype.propertyIsEnumerable.call(e, s[r]) &&
                (n[s[r]] = e[s[r]])
          }
          return n
        }
      const k = 'tabHistory'
      ;(function (e, t, n, s) {
        new (n || (n = Promise))(function (r, o) {
          function i(e) {
            try {
              g(s.next(e))
            } catch (e) {
              o(e)
            }
          }
          function a(e) {
            try {
              g(s.throw(e))
            } catch (e) {
              o(e)
            }
          }
          function g(e) {
            var t
            e.done
              ? r(e.value)
              : ((t = e.value),
                t instanceof n
                  ? t
                  : new n(function (e) {
                      e(t)
                    })).then(i, a)
          }
          g((s = s.apply(e, t || [])).next())
        })
      })(void 0, void 0, void 0, function* () {
        if (t().omnibox) {
          try {
            t().omnibox.setDefaultSuggestion({
              description: 'Open tab manager window',
            })
          } catch (e) {
            console.log(e)
          }
          t().omnibox.onInputEntered.addListener(() => {
            c()
          })
        }
        ;(t().storage.onChanged.addListener((e, t) => {
          'local' === t && e.systemTheme && T()
        }),
          T())
      })
      const P = new (class {
          constructor() {
            ;((this.tabHistory = []),
              (this.count = 0),
              (this.resetCountHandler = null),
              (this.expectedTabId = null),
              (this.loaded = !1),
              (this.init = () =>
                I(this, void 0, void 0, function* () {
                  try {
                    const e = yield t().storage.local.get({ [k]: [] })
                    ;(0 === this.tabHistory.length &&
                      (this.tabHistory = e[k] || []),
                      (this.loaded = !0),
                      o.debug(
                        'TabHistory loaded from storage:',
                        this.tabHistory,
                      ))
                  } catch (e) {
                    ;(o.error('Failed to load TabHistory from storage:', e),
                      (this.loaded = !0))
                  }
                })),
              (this.save = () =>
                I(this, void 0, void 0, function* () {
                  if (this.loaded)
                    try {
                      const e = 100,
                        n = this.tabHistory.slice(-e)
                      yield t().storage.local.set({ [k]: n })
                    } catch (e) {
                      o.error('Failed to save TabHistory to storage:', e)
                    }
                })),
              (this.resetCount = () => {
                ;(null != this.resetCountHandler &&
                  clearTimeout(this.resetCountHandler),
                  (this.resetCountHandler = setTimeout(this.reset, 1e3)))
              }),
              (this.reset = () => {
                const { length: e } = this.tabHistory,
                  t = this.tabHistory.slice(0, this.nextTabIndex),
                  n = this.tabHistory.slice(this.nextTabIndex, e - 1).reverse(),
                  s = this.tabHistory[e - 1]
                ;((this.tabHistory = [...t, ...n, s]),
                  (this.count = 0),
                  (this.resetCountHandler = null),
                  this.save())
              }),
              (this.add = (e) => {
                var { tabId: t, windowId: n } = e,
                  s = C(e, ['tabId', 'windowId'])
                t &&
                  -1 !== n &&
                  (this.remove(t, !1),
                  this.tabHistory.push(
                    Object.assign({ tabId: t, windowId: n }, s),
                  ),
                  this.save())
              }),
              (this.remove = (e, t = !0) => {
                const n = this.tabHistory.findIndex((t) => t.tabId === e)
                ;-1 !== n && (this.tabHistory.splice(n, 1), t && this.save())
              }),
              (this.activateTab = () =>
                I(this, void 0, void 0, function* () {
                  if (
                    (this.loaded || (yield this.init()),
                    (this.count += 1),
                    this.resetCount(),
                    this.tabHistory.length > 1)
                  ) {
                    const { tabId: e } = this.tabHistory[this.nextTabIndex]
                    ;((this.expectedTabId = e),
                      ((e, ...n) => {
                        i(void 0, [e, ...n], void 0, function* (e, n = !1) {
                          if (!e) return
                          const s = yield t().tabs.get(e)
                          ;(yield t().tabs.update(s.id, { active: !0 }),
                            yield t().windows.update(s.windowId, {
                              focused: !0,
                            }),
                            n || g())
                        })
                      })(e, !0))
                  }
                })),
              (this.onActivated = (e) =>
                I(this, void 0, void 0, function* () {
                  const { tabId: n, windowId: s } = e
                  if (n !== this.expectedTabId) {
                    const { length: e } = this.tabHistory
                    if (this.resetCountHandler) {
                      this.resetCount()
                      this.tabHistory.findIndex((e) => e.tabId === n) <
                        e - this.count && (this.count += 1)
                    }
                  }
                  this.expectedTabId = null
                  try {
                    const e = yield t().tabs.get(n)
                    this.add(
                      Object.assign(Object.assign({}, e), {
                        tabId: n,
                        windowId: s,
                      }),
                    )
                  } catch (e) {
                    o.warn('Failed to get tab info in onActivated:', e)
                  }
                })),
              (this.onFocusChanged = (e) =>
                I(this, void 0, void 0, function* () {
                  if ((T(), o.debug('onFocusChanged:', { windowId: e }), e < 0))
                    return p(!1)
                  try {
                    const [s] = yield t().tabs.query({
                      active: !0,
                      windowId: e,
                    })
                    if (!s)
                      return (
                        o.debug('onFocusChanged does nothing since no tab'),
                        p(!1)
                      )
                    const r = u(s)
                    if (r)
                      return (
                        o.debug('onFocusChanged ignore self popup window', {
                          tab: s,
                          isPopupWindow: r,
                        }),
                        p(!0)
                      )
                    ;(o.debug('onFocusChanged record the window', {
                      windowId: e,
                      tab: s,
                      isPopupWindow: r,
                    }),
                      this.add(
                        Object.assign(Object.assign({}, s), {
                          tabId: s.id,
                          windowId: e,
                        }),
                      ),
                      (n = e),
                      t().storage.local.set({
                        lastFocusedWindowId: n,
                        _selfPopupActive: !1,
                      }))
                  } catch (e) {
                    o.warn('Error in onFocusChanged:', e)
                  }
                  var n
                })),
              (this.onRemoved = (e) =>
                I(this, void 0, void 0, function* () {
                  return this.remove(e)
                })))
            const { onActivated: e, onFocusChanged: n, onRemoved: s } = this
            ;(t().tabs.onActivated.addListener(e),
              t().tabs.onRemoved.addListener(s),
              t().windows.onFocusChanged.addListener(n),
              (this.actionMap = { [b]: this.activateTab }),
              this.init())
          }
          get nextTabIndex() {
            return Math.max(this.tabHistory.length - 1 - this.count, 0)
          }
        })(),
        L = {
          [x]: c,
          [v]: A,
          [w]: (e, t, n) => {
            ;(l(e.tabs), n())
          },
        }
      Object.assign(L, P.actionMap)
      ;(t().runtime.onMessage.addListener((e, t, n) => {
        const { action: s } = e,
          r = L[s]
        r && 'function' == typeof r ? r(e, t, n) : n(`Unknown action: ${s}`)
      }),
        t().commands.onCommand.addListener((e) => {
          const t = L[e]
          t && 'function' == typeof t && t()
        }))
      t().runtime.onInstalled.addListener((e) => {
        'install' === e.reason && A()
      })
    })())
})()
