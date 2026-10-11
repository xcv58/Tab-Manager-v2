import React from 'react'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import Preview from 'components/Preview'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { OpenInNewIcon } from 'icons/materialIcons'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from './hooks/useStore'
import Tools from './Tools'

type Props = {
  showSearchResultMenu: boolean
}

export default observer(({ showSearchResultMenu }: Props) => {
  const { dragStore, userStore } = useStore()
  const theme = useAppTheme()
  const dark = theme.mode === 'dark'
  const highContrast = userStore.increaseContrast
  const colors = getUiColorTokens(dark, userStore.uiPreset, highContrast)
  const accent = dark ? '129, 140, 248' : '79, 70, 229'
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: () => {
      dragStore.dropToNewWindow()
    },
    canDrop: () => true,
    hover: (_, monitor) => {
      const targetId = monitor.getHandlerId()
      if (targetId) {
        dragStore.setDropPreviewTarget({ targetId, destination: 'new-window' })
      }
    },
    collect: (monitor) => {
      return {
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true }),
      }
    },
  })
  const { canDrop, isOver } = dropProps
  const tintOpacity = isOver
    ? highContrast
      ? 0.25
      : 0.16
    : highContrast
      ? 0.08
      : 0.03
  if (canDrop) {
    return (
      <div
        ref={drop}
        data-testid="new-window-drop-target"
        aria-label="Drop to create a new window"
        className="flex items-center justify-center gap-2 h-12 px-3 text-sm font-medium shrink-0 z-10"
        style={{
          backgroundColor: colors.toolbarShellBackground,
          backgroundImage: `linear-gradient(rgba(${accent}, ${tintOpacity}), rgba(${accent}, ${tintOpacity}))`,
          boxShadow: `inset 0 0 0 ${isOver ? 2 : 1}px rgba(${accent}, ${isOver ? 1 : highContrast ? 0.6 : 0.35})`,
          color: colors.primaryText,
          transition: 'box-shadow 140ms ease',
        }}
      >
        <OpenInNewIcon style={{ fontSize: 18, color: `rgb(${accent})` }} />
        <span>Drop to create a new window</span>
        <div className="absolute shadow-2xl" style={{ top: '3rem' }}>
          {isOver && (
            <Preview
              style={{
                opacity: 1,
                maxWidth: '80vw',
                minWidth: `${userStore.tabWidth}rem`,
              }}
            />
          )}
        </div>
      </div>
    )
  }
  return <Tools showSearchResultMenu={showSearchResultMenu} />
})
