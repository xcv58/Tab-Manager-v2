module.exports = {
  theme: {
    extend: {
      colors: {
        charcoal: '#424242'
      }
    }
  },
  variants: {
    backgroundColor: ['responsive', 'hover', 'focus', 'active'],
    textColor: ['responsive', 'hover', 'focus', 'group-hover'],
    opacity: ['responsive', 'hover', 'focus', 'group-hover', 'disabled'],
    display: ['responsive', 'hover', 'focus', 'group-hover']
  },
  plugins: []
}
