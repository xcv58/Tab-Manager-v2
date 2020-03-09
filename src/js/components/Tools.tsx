import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import Preview from 'components/Preview'
import Search, { InputRefProps } from 'components/Search'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import { getNoun } from 'libs'
import { ItemTypes } from 'libs/react-dnd'
import SyncButton from './SyncButton'
import { useStore } from './StoreContext'
import CommandPalette from './CommandPalette'

export default observer((props: InputRefProps) => {
  const { dragStore, tabStore, userStore } = useStore()
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
  if (!userStore.loaded) {
    return 'loading...'
  }
  if (canDrop) {
    const text = isOver
      ? `Open below ${getNoun('tab', size)}`
      : 'Drop here to open'
    return (
      <div
        ref={drop}
        className={classNames(
          'flex items-center justify-center h-12 px-1 text-3xl z-10',
          isOver ? 'bg-green-400' : 'bg-green-300'
        )}
      >
        {text} in New Window
        <div className='absolute shadow-2xl' style={{ top: '3rem' }}>
          {isOver && (
            <Preview
              style={{
                opacity: 1,
                maxWidth: '80vw',
                minWidth: '20rem'
              }}
            />
          )}
        </div>
      </div>
    )
  }
  return (
    <div className='flex items-center justify-center h-12 px-1 text-3xl'>
      <Summary />
      <Search inputRef={props.inputRef} />
      <SyncButton />
      <ThemeToggle />
      <CommandPalette />
      <OpenInTab />
    </div>
  )
})
