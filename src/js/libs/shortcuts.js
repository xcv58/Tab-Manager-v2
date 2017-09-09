export const stopCallback = (e, element, combo) => {
  if ([
    'up', 'down', 'escape', 'enter', 'option+p', 'option+j', 'option+k'
  ].includes(combo)) {
    return false
  }
  const { tagName, contentEditable } = element
  if (contentEditable === 'true') {
    return true
  }
  return [ 'INPUT', 'SELECT', 'TEXTAREA' ].includes(tagName)
}

export default [
  [ [ 'p', 'option+p' ], function (e) {
    e.preventDefault()
    this.props.tabStore.togglePin()
  }],
  [ 'x', function (e) {
    e.preventDefault()
    this.props.searchStore.select()
  }],
  [ [ 'j', 'down', 'option+j' ], function (e) {
    e.preventDefault()
    this.props.searchStore.down()
  }],
  [ [ 'k', 'up', 'option+k' ], function (e) {
    e.preventDefault()
    this.props.searchStore.up()
  }],
  [ '/', function (event) {
    event.preventDefault()
    this.search.focus()
  }],
  [ 'backspace', function (e) {
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
