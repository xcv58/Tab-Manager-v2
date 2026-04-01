/**
 * Vendored Material Design SVG icon components.
 * Each icon uses BaseSvgIcon and the exact SVG path from Google Material Icons.
 * This replaces all `@mui/icons-material/*` imports.
 */

import React from 'react'
import BaseSvgIcon, { BaseSvgIconProps } from './BaseSvgIcon'

type IconProps = BaseSvgIconProps

const icon = (displayName: string, path: React.ReactNode) => {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <BaseSvgIcon ref={ref} {...props}>
      {path}
    </BaseSvgIcon>
  ))
  Icon.displayName = displayName
  return Icon
}

// Action icons
export const CloseIcon = icon(
  'CloseIcon',
  <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />,
)

export const SyncIcon = icon(
  'SyncIcon',
  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />,
)

export const RefreshIcon = icon(
  'RefreshIcon',
  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />,
)

export const MoreHorizIcon = icon(
  'MoreHorizIcon',
  <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />,
)

export const MoreVertIcon = icon(
  'MoreVertIcon',
  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />,
)

export const DragHandleIcon = icon(
  'DragHandleIcon',
  <path d="M20 9H4v2h16V9zM4 15h16v-2H4v2z" />,
)

export const SortIcon = icon(
  'SortIcon',
  <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />,
)

export const ExpandMoreIcon = icon(
  'ExpandMoreIcon',
  <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />,
)

export const ChevronRightIcon = icon(
  'ChevronRightIcon',
  <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />,
)

export const OpenInBrowserIcon = icon(
  'OpenInBrowserIcon',
  <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V8h14v12zm-7-2 4-4h-3V8h-2v4H8l4 4z" />,
)

export const OpenInNewIcon = icon(
  'OpenInNewIcon',
  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />,
)

export const ViewColumnIcon = icon(
  'ViewColumnIcon',
  <path d="M10 18h5V5h-5v13zm-6 0h5V5H4v13zM16 5v13h5V5h-5z" />,
)

export const FavoriteBorderIcon = icon(
  'FavoriteBorderIcon',
  <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />,
)

export const HelpIcon = icon(
  'HelpIcon',
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />,
)

export const FlipIcon = icon(
  'FlipIcon',
  <path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM15 13h2v-2h-2v2zm0 8h2v-2h-2v2zm4-12h2V7h-2v2z" />,
)

export const FilterListIcon = icon(
  'FilterListIcon',
  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />,
)

export const FeedbackIcon = icon(
  'FeedbackIcon',
  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />,
)

export const DeleteSweepIcon = icon(
  'DeleteSweepIcon',
  <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3.5l-1-1h-5l-1 1H0v2h14V5z" />,
)

export const SettingsSharpIcon = icon(
  'SettingsSharpIcon',
  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />,
)

export const LiveHelpOutlinedIcon = icon(
  'LiveHelpOutlinedIcon',
  <path d="M19 2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 16h-4.83l-.59.59L12 20.17l-1.59-1.59-.58-.58H5V4h14v14zm-7.05-2.65h1.92v1.94h-1.92v-1.94zm1.7-7.75c.55.55.88 1.21.88 2.09 0 2.34-2.67 2.52-2.67 4.43h1.92c0-2.52 2.67-2.67 2.67-4.53 0-1.77-1.36-3.4-3.4-3.4-1.95 0-3.4 1.43-3.4 3.34h1.92c0-.93.67-1.93 2.08-1.93z" />,
)

export const KeyboardArrowLeftIcon = icon(
  'KeyboardArrowLeftIcon',
  <path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />,
)

export const KeyboardArrowRightIcon = icon(
  'KeyboardArrowRightIcon',
  <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />,
)

// Settings dialog icons
export const AddRoundedIcon = icon(
  'AddRoundedIcon',
  <path d="M18 13h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1s1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1z" />,
)

export const RemoveRoundedIcon = icon(
  'RemoveRoundedIcon',
  <path d="M18 13H6c-.55 0-1-.45-1-1s.45-1 1-1h12c.55 0 1 .45 1 1s-.45 1-1 1z" />,
)

export const DarkModeRoundedIcon = icon(
  'DarkModeRoundedIcon',
  <path d="M11.01 3.05C6.51 3.54 3 7.36 3 12c0 4.97 4.03 9 9 9 4.63 0 8.45-3.5 8.95-8 .09-.79-.78-1.42-1.54-.95-.84.52-1.8.95-2.91.95-3.31 0-6-2.69-6-6 0-1.11.43-2.07.95-2.91.47-.76-.16-1.63-.95-1.54-.33.04-.66.09-.99.15-.16.03-.32.06-.49.1.18-.03.33-.06.49-.09.17-.03.34-.06.5-.1z" />,
)

export const LightModeRoundedIcon = icon(
  'LightModeRoundedIcon',
  <>
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
    <path d="M12 1c-.56 0-1 .45-1 1v1c0 .55.44 1 1 1s1-.45 1-1V2c0-.55-.44-1-1-1zM5.99 4.58c-.39-.39-1.03-.39-1.42 0-.39.39-.39 1.03 0 1.42l.71.71c.39.39 1.02.39 1.41 0 .39-.39.39-1.03 0-1.42l-.7-.71zM2 11c-.55 0-1 .45-1 1s.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1H2zm16.59-6.41c-.39-.39-1.03-.39-1.42 0l-.71.71c-.39.39-.39 1.02 0 1.41.39.39 1.03.39 1.42 0l.71-.71c.39-.39.39-1.03 0-1.41zM20 11h1c.55 0 1 .45 1 1s-.45 1-1 1h-1c-.55 0-1-.45-1-1s.45-1 1-1zm-3.17 7.71.71.71c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-.71-.71c-.39-.39-1.02-.39-1.41 0-.39.38-.39 1.02 0 1.41zM12 20c-.56 0-1 .44-1 1v1c0 .55.44 1 1 1s1-.45 1-1v-1c0-.56-.44-1-1-1zm-5.31-1.58-.71.71c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41a.9959.9959 0 0 0-1.41 0z" />
  </>,
)

export const DesktopWindowsRoundedIcon = icon(
  'DesktopWindowsRoundedIcon',
  <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z" />,
)
