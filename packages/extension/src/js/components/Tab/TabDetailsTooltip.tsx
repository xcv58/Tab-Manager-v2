import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CopyTextIcon, CopiedIcon } from 'icons/actionIcons'
import { ExpandMoreIcon } from 'icons/materialIcons'
import { writeToClipboard } from 'libs'
import {
  DEFAULT_TAB_TOOLTIP_TITLE_LINES,
  type TabTooltipTitleLines,
  type TabTooltipUrlLines,
} from 'libs/tabTooltip'

const CLAMP_CLASSES = {
  1: 'line-clamp-1',
  3: 'line-clamp-3',
  5: 'line-clamp-5',
  full: '',
}

function TextField({
  label,
  value,
  lines,
  onCopy,
  copied,
}: {
  label: 'Title' | 'URL'
  value: string
  lines: TabTooltipUrlLines
  onCopy: () => void
  copied: boolean
}) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clipped, setClipped] = useState(false)
  const fieldId = React.useId()
  const fieldName = label === 'URL' ? label : label.toLowerCase()
  useLayoutEffect(() => {
    if (expanded) return
    const node = textRef.current
    if (!node) return
    const measure = () =>
      setClipped(lines !== 'full' && node.scrollHeight > node.clientHeight + 1)
    measure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(node)
    return () => observer?.disconnect()
  }, [value, lines, expanded])

  return (
    <section className="tab-details-field">
      <p
        id={fieldId}
        ref={textRef}
        aria-label={label}
        data-testid={`tab-tooltip-${label.toLowerCase()}`}
        className={`tab-details-text tab-details-${label.toLowerCase()} ${expanded || lines === 'full' ? 'tab-details-text-expanded' : CLAMP_CLASSES[lines]}`}
      >
        {value}
      </p>
      <div className="tab-details-field-actions">
        <button
          type="button"
          className="tab-details-action"
          aria-label={`Copy ${fieldName}`}
          title={copied ? 'Copied' : `Copy ${fieldName}`}
          onClick={onCopy}
        >
          {copied ? (
            <CopiedIcon fontSize={14} />
          ) : (
            <CopyTextIcon fontSize={14} />
          )}
        </button>
        {(clipped || expanded) && (
          <button
            type="button"
            className="tab-details-action tab-details-expand"
            aria-label={
              expanded ? `Show less ${fieldName}` : `Show full ${fieldName}`
            }
            title={
              expanded ? `Show less ${fieldName}` : `Show full ${fieldName}`
            }
            aria-expanded={expanded}
            aria-controls={fieldId}
            onClick={() => setExpanded(!expanded)}
          >
            <ExpandMoreIcon
              fontSize={16}
              style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
            />
          </button>
        )}
      </div>
    </section>
  )
}

export default function TabDetailsTooltip({
  title,
  titleLines = DEFAULT_TAB_TOOLTIP_TITLE_LINES,
  url,
  urlLines,
  duplicateText,
  autoFocus,
}: {
  title: string
  titleLines?: TabTooltipTitleLines
  url: string
  urlLines: TabTooltipUrlLines
  duplicateText: string
  autoFocus?: boolean
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const copyRequestRef = useRef(0)
  useEffect(() => {
    mountedRef.current = true
    if (autoFocus)
      contentRef.current
        ?.querySelector<HTMLButtonElement>('[aria-label="Copy title"]')
        ?.focus()
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [autoFocus])
  const copy = async (field: string, value: string) => {
    const request = ++copyRequestRef.current
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await writeToClipboard(value)
      if (!mountedRef.current || request !== copyRequestRef.current) return
      setCopied(field)
      setStatus(`${field} copied`)
      timerRef.current = setTimeout(() => {
        setCopied(null)
        setStatus('')
      }, 1600)
    } catch {
      if (!mountedRef.current || request !== copyRequestRef.current) return
      setCopied(null)
      setStatus('Copy failed. Select the text to copy it.')
    }
  }

  return (
    <div ref={contentRef}>
      <div className="tab-details-scroller">
        <TextField
          label="Title"
          value={title}
          lines={titleLines}
          onCopy={() => void copy('Title', title)}
          copied={copied === 'Title'}
        />
        <TextField
          label="URL"
          value={url}
          lines={urlLines}
          onCopy={() => void copy('URL', url)}
          copied={copied === 'URL'}
        />
        {duplicateText ? (
          <p className="tab-details-duplicates">{duplicateText}</p>
        ) : null}
        <p className="tab-details-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  )
}
