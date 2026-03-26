import React, { useEffect, useMemo, useRef, useState } from 'react'
import Popover from '@mui/material/Popover'
import { useTheme } from '@mui/material/styles'
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
  const theme = useTheme()

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

  const selectedColorMeta = useMemo(() => {
    return getChromeTabGroupColor(initialColor)
  }, [initialColor])

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={() => {
        commitTitle()
        onClose()
      }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      PaperProps={{
        style: {
          width: 320,
          borderRadius: 12,
          padding: 12,
          overflow: 'visible',
        },
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
            colorScheme: theme.palette.mode,
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
              commitTitle()
              onClose()
            }
            if (event.key === 'Escape') {
              skipBlurCommitRef.current = true
              setTitle(initialTitle)
              onClose()
            }
          }}
          data-testid={`tab-group-editor-title-${groupId}`}
        />
        <div
          className="mt-4 flex items-center justify-between"
          data-testid={`tab-group-editor-colors-${groupId}`}
        >
          {CHROME_TAB_GROUP_COLOR_ORDER.map((color) => {
            const colorMeta = getChromeTabGroupColor(color)
            const selected = color === initialColor
            return (
              <button
                key={color}
                className="relative h-9 w-9 rounded-full focus:outline-none"
                onClick={() => onRecolor(color)}
                data-testid={`tab-group-editor-color-${groupId}-${color}`}
                title={color}
              >
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: colorMeta.line,
                  }}
                />
                {selected && (
                  <>
                    <span
                      className="absolute rounded-full"
                      style={{
                        inset: 2,
                        border: `3px solid ${selectedColorMeta.line}`,
                      }}
                    />
                    <span
                      className="absolute rounded-full"
                      style={{
                        inset: 7,
                        border: '3px solid #ffffff',
                      }}
                    />
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Popover>
  )
}
