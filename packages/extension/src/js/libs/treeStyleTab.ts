// Tree Style Tab's public API for Firefox companion extensions.
// https://github.com/piroor/treestyletab/wiki/API-for-other-addons
export const TST_ID = 'treestyletab@piro.sakura.ne.jp'
export const TREE_STYLE_TAB_PORT = 'tree-style-tab'

export type TreeConnectionUpdate =
  | { type: 'status'; connected: boolean }
  | { type: 'refresh' }
