import React, { useCallback, useRef, useState } from 'react'
import { useAppTheme } from 'libs/appTheme'

export interface SliderMark {
  value: number
  label?: string
}

export interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  marks?: SliderMark[]
  onChange: (event: unknown, value: number) => void
  'aria-label'?: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Local range slider replacing MUI `Slider`.
 * Uses a native <input type="range"> with custom styling, plus optional marks.
 */
export default function Slider({
  value,
  min,
  max,
  step = 1,
  marks,
  onChange,
  'aria-label': ariaLabel,
  style,
  className,
}: SliderProps) {
  const theme = useAppTheme()
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const pct = ((value - min) / (max - min)) * 100
  const primaryColor = theme.palette.primary.main
  const railColor = withAlpha(primaryColor, theme.mode === 'dark' ? 0.32 : 0.28)
  const dragRingColor = withAlpha(
    primaryColor,
    theme.mode === 'dark' ? 0.22 : 0.16,
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(e.target.value)
      onChange(e, nextValue)
    },
    [onChange],
  )

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      {/* Track container */}
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          height: 4,
          borderRadius: 2,
          margin: '12px 0',
        }}
      >
        {/* Background rail */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 2,
            backgroundColor: railColor,
          }}
        />
        {/* Active track */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${pct}%`,
            borderRadius: 2,
            backgroundColor: primaryColor,
          }}
        />
      </div>
      {/* Native range input (invisible, on top) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          margin: 0,
          zIndex: 1,
        }}
      />
      {/* Thumb indicator */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: isDragging ? 18 : 14,
          height: isDragging ? 18 : 14,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          boxShadow: isDragging
            ? `0 0 0 6px ${dragRingColor}`
            : '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'width 100ms, height 100ms, box-shadow 100ms',
          pointerEvents: 'none',
        }}
      />
      {/* Marks */}
      {marks && (
        <div style={{ position: 'relative', marginTop: 4 }}>
          {marks.map((mark) => {
            const markPct = ((mark.value - min) / (max - min)) * 100
            return (
              <span
                key={mark.value}
                style={{
                  position: 'absolute',
                  left: `${markPct}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '0.72rem',
                  opacity: 0.7,
                  whiteSpace: 'nowrap',
                }}
              >
                {mark.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '')
  const chunkSize = normalized.length === 3 ? 1 : 2
  const values = normalized.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || []

  const [r, g, b] = values.map((value) => {
    const expanded = chunkSize === 1 ? value.repeat(2) : value
    return parseInt(expanded, 16)
  })

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
