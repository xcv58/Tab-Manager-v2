import React from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'

const defaultTheme = createTheme()
const theme1 = createTheme({
  palette: {
    mode: 'dark',
  },
  typography: {
    button: {
      textTransform: 'capitalize',
    },
  },
})
const theme2 = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'capitalize',
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <Button>Default Behavior</Button>
      <ThemeProvider theme={theme1}>
        <Button>Retain Case Via theme change</Button>
        <Paper elevation={0} />
        <Paper>123</Paper>
        <Paper elevation={3} />
      </ThemeProvider>
      <ThemeProvider theme={theme2}>
        <Button>Retain Case Via alternate theme change</Button>
      </ThemeProvider>
    </ThemeProvider>
  )
}

export default App
