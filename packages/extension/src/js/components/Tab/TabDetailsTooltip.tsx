import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CopyTextIcon, CopiedIcon } from 'icons/actionIcons'
import { ExpandMoreIcon, CloseIcon } from 'icons/materialIcons'
import { writeToClipboard } from 'libs'
import type { TabTooltipUrlLines } from 'libs/tabTooltip'

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
      <div className="tab-details-field-heading">
        <span className="tab-details-label">{label}</span>
        <div className="tab-details-field-actions">
          {(clipped || expanded) && (
            <button
              type="button"
              className="tab-details-action tab-details-expand"
              aria-expanded={expanded}
              aria-controls={fieldId}
              onClick={() => setExpanded(!expanded)}
            >
              <ExpandMoreIcon
                fontSize={16}
                style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
              />
              {expanded ? `Show less ${fieldName}` : `Show full ${fieldName}`}
            </button>
          )}
          <button
            type="button"
            className="tab-details-action"
            aria-label={`Copy ${fieldName}`}
            onClick={onCopy}
          >
            {copied ? (
              <CopiedIcon fontSize={14} />
            ) : (
              <CopyTextIcon fontSize={14} />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <p
        id={fieldId}
        ref={textRef}
        data-testid={`tab-tooltip-${label.toLowerCase()}`}
        className={`tab-details-text ${expanded || lines === 'full' ? 'tab-details-text-expanded' : CLAMP_CLASSES[lines]}`}
      >
        {value}
      </p>
    </section>
  )
}

export default function TabDetailsTooltip({
  title,
  url,
  urlLines,
  duplicateText,
  onClose,
  autoFocus,
  groupTitle,
  windowTitle,
}: {
  title: string
  url: string
  urlLines: TabTooltipUrlLines
  duplicateText: string
  onClose: () => void
  autoFocus?: boolean
  groupTitle?: string
  windowTitle?: string
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
      <div className="tab-details-heading">
        <span>Tab details</span>
        <button
          type="button"
          className="tab-details-action"
          aria-label="Close tab details"
          onClick={onClose}
        >
          <CloseIcon fontSize={16} />
        </button>
      </div>
      <div className="tab-details-scroller">
        {(windowTitle || groupTitle) && (
          <dl className="tab-details-context">
            {windowTitle && (
              <>
                <dt>Window</dt>
                <dd title={windowTitle}>{windowTitle}</dd>
              </>
            )}
            {groupTitle && (
              <>
                <dt>Group</dt>
                <dd title={groupTitle}>{groupTitle}</dd>
              </>
            )}
          </dl>
        )}
        <TextField
          label="Title"
          value={title}
          lines={3}
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
