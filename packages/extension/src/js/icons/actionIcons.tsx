import React from 'react'
import BaseSvgIcon, { BaseSvgIconProps } from './BaseSvgIcon'

export const CopyTextIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M7 16H3V3h13v4" />
      <rect x="7" y="7" width="14" height="14" rx="2" />
    </g>
  </BaseSvgIcon>
)

export const CopiedIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <path
      d="m5 12 4 4L19 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </BaseSvgIcon>
)

export const SearchIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5" />
    </g>
  </BaseSvgIcon>
)

export const BrowserWindowIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M2 8h20M6 5.5h.5m3 0h.5" />
    </g>
  </BaseSvgIcon>
)

export const MoveTabsIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 5V3h12v5M14 18v3H2V7h12v4m-6 4h14m-4-4 4 4-4 4" />
    </g>
  </BaseSvgIcon>
)

export const ExportTabsIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" />
    </g>
  </BaseSvgIcon>
)

export const TabGroupIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M6 4h12M9 1.5h6M3 12h18" />
    </g>
  </BaseSvgIcon>
)

export const ArrowUpIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <path d="M11 20V7.83l-5.59 5.58L4 12l8-8 8 8-1.41 1.41L13 7.83V20z" />
  </BaseSvgIcon>
)

export const ArrowDownIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <path d="M13 4v12.17l5.59-5.58L20 12l-8 8-8-8 1.41-1.41L11 16.17V4z" />
  </BaseSvgIcon>
)

export const CloseOtherTabsIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 5V3h13v13h-2M5 8H3v13h13v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="m10 10 4 4m0-4-4 4" />
    </g>
  </BaseSvgIcon>
)

export const RevealInListIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16v16H4zM8 8h8M8 12h4M8 16h8m6-4-3-3m3 3-3 3m-3-3h6" />
    </g>
  </BaseSvgIcon>
)

export const PinTabIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3h8l-1 7 3 4H6l3-4-1-7Zm4 11v7" />
    </g>
  </BaseSvgIcon>
)

export const UngroupTabIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 8h6v12H4V4h7l3 4ZM2 12h10m-3-3 3 3-3 3" />
    </g>
  </BaseSvgIcon>
)

export const SelectTabsIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m7 12 3 3 7-7" />
    </g>
  </BaseSvgIcon>
)

export const DeselectTabsIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </BaseSvgIcon>
)

export const KeyboardShortcutsIcon = (props: BaseSvgIconProps) => (
  <BaseSvgIcon {...props}>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h.5m3.5 0h.5m3.5 0h.5m3.5 0h.5M6 12h.5m3.5 0h.5m3.5 0h.5m3.5 0h.5M7 15.5h10" />
    </g>
  </BaseSvgIcon>
)
