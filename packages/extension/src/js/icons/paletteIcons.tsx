import React from 'react'
import BaseSvgIcon, { BaseSvgIconProps } from './BaseSvgIcon'

// Palette-only symbols share the outline weight of the existing action icons.
const outlineIcon = (name: string, children: React.ReactNode) => {
  const Icon = (props: BaseSvgIconProps) => (
    <BaseSvgIcon {...props}>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </BaseSvgIcon>
  )
  Icon.displayName = name
  return Icon
}

export const LinkIcon = outlineIcon(
  'LinkIcon',
  <path d="m10 14 4-4m-6 6-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m1 1 1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" />,
)
export const TitleIcon = outlineIcon(
  'TitleIcon',
  <path d="M4 7V4h16v3M12 4v16m-4 0h8" />,
)
export const TextDocumentIcon = outlineIcon(
  'TextDocumentIcon',
  <path d="M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 12h8m-8 4h8" />,
)
export const CsvIcon = outlineIcon(
  'CsvIcon',
  <>
    <path d="M14 2H4v20h16V8l-6-6Zm0 0v6h6" />
    <path d="M8 12h8v6H8v-6Zm4 0v6m-4-3h8" />
  </>,
)
export const TsvIcon = outlineIcon(
  'TsvIcon',
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18m6-18v18" />
  </>,
)
export const JsonIcon = outlineIcon(
  'JsonIcon',
  <path d="M8 3H6v6l-3 3 3 3v6h2m8-18h2v6l3 3-3 3v6h-2" />,
)
export const MarkdownIcon = outlineIcon(
  'MarkdownIcon',
  <path d="M14 2H4v20h16V8l-6-6Zm0 0v6h6m-10 4-3 3 3 3m4-6 3 3-3 3" />,
)
export const UnpinIcon = outlineIcon(
  'UnpinIcon',
  <path d="M2 2l20 20M8 3h8l-1 7 3 4h-2M9 10l-3 4h6m0 0v7" />,
)
export const UngroupIcon = outlineIcon(
  'UngroupIcon',
  <>
    <rect x="2" y="2" width="9" height="9" rx="1" />
    <rect x="13" y="13" width="9" height="9" rx="1" />
    <path strokeDasharray="2 3" d="M15 3h6v6M3 15v6h6" />
  </>,
)
export const ClusterIcon = outlineIcon(
  'ClusterIcon',
  <>
    <rect x="2" y="2" width="6" height="6" rx="1" />
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <path d="M16 3h5v5m0-5-8 8M3 16v5h5m-5 0 8-8" />
  </>,
)
export const AppearanceIcon = outlineIcon(
  'AppearanceIcon',
  <>
    <path d="M12 7a5 5 0 0 0 0 10V7Zm3-4a9 9 0 0 1 0 18 9 9 0 0 0 0-18Z" />
    <path d="M8 3V1M3 8H1m2 8H1m7 5v2M3 3l1.5 1.5M3 21l1.5-1.5" />
  </>,
)
export const ReloadIcon = outlineIcon(
  'ReloadIcon',
  <path d="M20 10a8 8 0 1 0-1 7M20 3v7h-7" />,
)
export const NewWindowIcon = outlineIcon(
  'NewWindowIcon',
  <path d="M12 3H3v18h18v-9M3 8h7m6-5h5v5m0-5-9 9" />,
)
export const ClosePaletteIcon = outlineIcon(
  'ClosePaletteIcon',
  <path d="m6 6 12 12M6 18 18 6" />,
)
export const ExpandIcon = outlineIcon('ExpandIcon', <path d="m9 5 7 7-7 7" />)
export const CollapseIcon = outlineIcon(
  'CollapseIcon',
  <path d="m5 9 7 7 7-7" />,
)
export const SortPaletteIcon = outlineIcon(
  'SortPaletteIcon',
  <path d="M3 5h12M3 10h9m-9 5h6m9-11v16m-3-3 3 3 3-3" />,
)
export const CleanDuplicatesIcon = outlineIcon(
  'CleanDuplicatesIcon',
  <path d="M8 3H3v14h5m4-10V3h9v14h-3M6 10h10l-1 11H7L6 10Zm-1 0h12m-8 0V7h4v3" />,
)
export const SyncPaletteIcon = outlineIcon(
  'SyncPaletteIcon',
  <path d="M20 9a8 8 0 0 0-14-3L3 9m0-6v6h6m-5 6a8 8 0 0 0 14 3l3-3m0 6v-6h-6" />,
)
export const SettingsPaletteIcon = outlineIcon(
  'SettingsPaletteIcon',
  <>
    <path d="m9 3-1 3-3 1-2 4 2 2v3l3 2 1 3h6l1-3 3-2v-3l2-2-2-4-3-1-1-3H9Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)
