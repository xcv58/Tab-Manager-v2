import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import Preview from 'components/Preview'
import { getNoun } from 'libs'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from './StoreContext'
import Tools from './Tools'

export default observer(props => {
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
  return <Tools {...props} />
})
