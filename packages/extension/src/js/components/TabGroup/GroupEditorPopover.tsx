import React, { useEffect, useRef, useState } from 'react'
import Popover from 'components/ui/Popover'
import { useAppTheme } from 'libs/appTheme'
import {
  CHROME_TAB_GROUP_COLOR_ORDER,
  getChromeTabGroupColor,
} from 'libs/chromeTabGroupColors'

type Props = {
  anchorEl: HTMLElement | null
  groupId: number
  initialColor: chrome.tabGroups.ColorEnum
  initialTitle: string
  open: boolean
  onClose: () => void
  onRecolor: (color: chrome.tabGroups.ColorEnum) => void
  onRename: (title: string) => void
}

export default (props: Props) => {
  const {
    anchorEl,
    groupId,
    initialColor,
    initialTitle,
    open,
    onClose,
    onRename,
    onRecolor,
  } = props
  const [title, setTitle] = useState(initialTitle)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const committedTitleRef = useRef(initialTitle)
  const skipBlurCommitRef = useRef(false)
  const theme = useAppTheme()

  useEffect(() => {
    if (!open) {
      return
    }
    setTitle(initialTitle)
    committedTitleRef.current = initialTitle
    skipBlurCommitRef.current = false
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    })
  }, [open, initialTitle])

  const commitTitle = () => {
    if (title === committedTitleRef.current) {
      return
    }
    committedTitleRef.current = title
    onRename(title)
  }

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={() => {
        commitTitle()
        onClose()
      }}
      style={{
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: 12,
        padding: 12,
        overflow: 'visible',
      }}
    >
      <div data-testid={`tab-group-editor-${groupId}`}>
        <input
          ref={titleInputRef}
          className="w-full rounded-2xl border-2 px-4 py-2 text-2xl font-medium outline-none"
          style={{
            backgroundColor: 'transparent',
            borderColor: theme.palette.primary.main,
            caretColor: theme.palette.text.primary,
            color: theme.palette.text.primary,
            colorScheme: theme.mode,
          }}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false
              return
            }
            commitTitle()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              commitTitle()
              onClose()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              skipBlurCommitRef.current = true
              setTitle(initialTitle)
              onClose()
            }
          }}
          data-testid={`tab-group-editor-title-${groupId}`}
          aria-label="Group name"
        />
        <div
          className="mt-3 grid grid-cols-9 gap-1"
          data-testid={`tab-group-editor-colors-${groupId}`}
          role="group"
          aria-label="Group color"
        >
          {CHROME_TAB_GROUP_COLOR_ORDER.map((color) => {
            const colorMeta = getChromeTabGroupColor(color)
            const selected = color === initialColor
            return (
              <button
                key={color}
                className="group-color-option relative grid aspect-square w-full place-items-center rounded-full"
                aria-label={color}
                aria-pressed={selected}
                style={
                  {
                    '--group-color-focus': theme.palette.text.primary,
                    '--group-color-hover': theme.palette.action.hover,
                  } as React.CSSProperties
                }
                onClick={() => onRecolor(color)}
                data-testid={`tab-group-editor-color-${groupId}-${color}`}
                title={color}
              >
                <span
                  className="pointer-events-none relative rounded-full"
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: colorMeta.line,
                  }}
                >
                  {selected && (
                    <span
                      className="absolute rounded-full"
                      style={{
                        inset: 3,
                        border: `2px solid ${theme.palette.background.paper}`,
                      }}
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Popover>
  )
}
