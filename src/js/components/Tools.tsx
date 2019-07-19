import React from 'react'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import Paper from '@material-ui/core/Paper'
import Preview from 'components/Preview'
import Search, { InputRefProps } from 'components/Search'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import { getNoun } from 'libs'
import { ItemTypes } from 'libs/react-dnd'
import { dropTargetColor, droppedColor } from 'libs/colors'
import SyncButton from './SyncButton'
import { useStore } from './StoreContext'
import CommandPalette from './CommandPalette'

const style = {
  display: 'flex',
  height: '3rem',
  alignItems: 'center',
  flex: '0 0 auto',
  padding: '0 4px'
}

export default observer((props: InputRefProps) => {
  const { dragStore, tabStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: () => {
      dragStore.dropToNewWindow()
    },
    canDrop: () => true,
    collect: monitor => {
      return {
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver()
      }
    }
  })
  const { canDrop, isOver } = dropProps
  const size = tabStore.selection.size
  if (canDrop) {
    const backgroundColor = isOver ? droppedColor : dropTargetColor
    const text = isOver
      ? `Open below ${getNoun('tab', size)}`
      : 'Drop here to open'
    return (
      <div
        ref={drop}
        style={{
          ...style,
          backgroundColor,
          fontSize: '200%',
          justifyContent: 'center',
          zIndex: 9
        }}
      >
        {text} in New Window
        <Paper
          elevation={8}
          style={{
            position: 'absolute',
            top: '3rem'
          }}
        >
          {isOver && (
            <Preview
              style={{
                opacity: 1,
                maxWidth: '80vw',
                minWidth: '20rem'
              }}
            />
          )}
        </Paper>
      </div>
    )
  }
  return (
    <div style={style}>
      <Summary />
      <Search inputRef={props.inputRef} />
      <SyncButton />
      <ThemeToggle />
      <CommandPalette />
      <OpenInTab />
    </div>
  )
})
