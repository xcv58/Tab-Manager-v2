import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import Typography from '@material-ui/core/Typography'
import ButtonBase from '@material-ui/core/ButtonBase'
import { getNoun } from 'libs'
import { useStore } from './StoreContext'

const Title = ({ title }) => {
  useEffect(() => {
    document.title = `${title} - Tab Manager v2`
  }, [title])
  return title
}

const fakeButtonStyle = {
  position: 'fixed',
  top: 0,
  width: '100%',
  margin: 'auto',
  fontSize: '0.8rem',
  padding: 0,
  border: 'none'
}

export default observer(() => {
  const { searchStore, tabStore, windowStore } = useStore()
  const { windows, tabCount } = windowStore
  const { typing, query } = searchStore
  const opacity = typing ? 1 - (Math.atan(query.length + 1) / Math.PI) * 1.2 : 1
  const style = { ...fakeButtonStyle, opacity }
  const selected = tabStore.selection.size
  const title = `${windows.length} ${getNoun(
    'window',
    windows.length
  )}, ${tabCount} ${getNoun('tab', tabCount)}`
  return (
    <ButtonBase style={style} onFocus={e => e.target.blur()}>
      <Typography>
        <Title {...{ title }} />, {selected} {getNoun('tab', selected)} selected
      </Typography>
    </ButtonBase>
  )
})
