const inputShortcutSet = new Set([
  'up', 'down', 'escape', 'enter', 'ctrl+p', 'ctrl+j', 'ctrl+k',
  'ctrl+s', 'ctrl+g', 'shift+ctrl+g', 'ctrl+x', 'ctrl+d'
])

export const stopCallback = (e, element, combo) => {
  if (inputShortcutSet.has(combo)) {
    return false
  }
  const { tagName, contentEditable } = element
  if (contentEditable === 'true') {
    return true
  }
  return [ 'INPUT', 'SELECT', 'TEXTAREA' ].includes(tagName)
}

export default [
  [ [ 'p', 'ctrl+p' ], function (e) {
    e.preventDefault()
    this.props.tabStore.togglePin()
  }],
  [ [ 'x', 'ctrl+x' ], function (e) {
    e.preventDefault()
    this.props.searchStore.select()
  }],
  [ [ 'j', 'down', 'ctrl+j' ], function (e) {
    e.preventDefault()
    this.props.searchStore.down()
  }],
  [ [ 'g g', 'ctrl+g' ], function (e) {
    e.preventDefault()
    this.props.searchStore.firstTab()
  }],
  [ [ 'shift+g', 'shift+ctrl+g' ], function (e) {
    e.preventDefault()
    this.props.searchStore.lastTab()
  }],
  [ [ 'k', 'up', 'ctrl+k' ], function (e) {
    e.preventDefault()
    this.props.searchStore.up()
  }],
  [ '/', function (event) {
    event.preventDefault()
    this.search.focus()
  }],
  [ 'ctrl+s', function (event) {
    event.preventDefault()
    this.props.arrangeStore.sortTabs()
  }],
  [ [ 'backspace', 'ctrl+d' ], function (e) {
    this.props.tabStore.remove()
  }],
  [ 'enter', function (e) {
    this.props.searchStore.enter()
  }],
  [ 'escape', function (e) {
    const { searchStore: { typing } } = this.props
    if (typing) {
      e.preventDefault()
      this.search.blur()
    }
  }]
]
