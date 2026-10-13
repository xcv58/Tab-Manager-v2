import React from 'react'
import { observer } from 'mobx-react-lite'
import { browser } from 'libs'
import Dialog from 'components/ui/Dialog'
import Switch from 'components/ui/Switch'
import { useStore } from 'components/hooks/useStore'
import {
  type ActionTabCountMode,
  ACTION_TAB_COUNT_MODES,
} from 'libs/actionTabCount'
import { type WindowOrder, WINDOW_ORDERS } from 'libs/windowOrder'
import {
  TAB_TOOLTIP_URL_LINES,
  normalizeTabTooltipUrlLines,
} from 'libs/tabTooltip'
import Slider from 'components/ui/Slider'
import IconButton from 'components/ui/IconButton'
import { ToggleGroup, ToggleButton } from 'components/ui/ToggleGroup'
import { useAppTheme } from 'libs/appTheme'
import {
  AddRoundedIcon,
  DarkModeRoundedIcon,
  DesktopWindowsRoundedIcon,
  LightModeRoundedIcon,
  RemoveRoundedIcon,
} from 'icons/materialIcons'
import useReduceMotion from 'libs/useReduceMotion'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { defaultTransitionDuration } from 'libs/transition'
import SponsorButton from './SponsorButton'
import FeedbackButton from './FeedbackButton'
import TabRowPreview from './TabRowPreview'
import {
  WindowLayoutExample,
  SearchSettingsPreview,
  ExtensionIconExample,
  ToolbarExample,
} from './SettingsExamples'
import SettingsNavigation, {
  type SettingsNavigationState,
  type SettingsSectionId,
} from './SettingsNavigation'

/* -------------------------------------------------------------------------- */
/*  Inline style helpers (replacing MUI sx / Typography / FormHelperText)       */
/* -------------------------------------------------------------------------- */

const panelTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  lineHeight: 1.3,
  margin: 0,
}

const panelDescriptionStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: '0.875rem',
  lineHeight: 1.45,
  color: 'var(--settings-muted)',
  margin: 0,
}

const controlTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 600,
  lineHeight: 1.35,
  margin: 0,
}

const controlDescriptionStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: '0.85rem',
  lineHeight: 1.45,
  color: 'var(--settings-muted)',
  margin: 0,
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

const SettingsPanel = ({
  title,
  sectionId,
  description,
  children,
  style,
  testId,
  className,
}: {
  sectionId: SettingsSectionId
  title: string
  description?: string
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
  className?: string
}) => (
  <section
    id={`settings-section-${sectionId}`}
    aria-labelledby={`settings-heading-${sectionId}`}
    className={`settings-section ${className || ''}`}
    data-section-id={sectionId}
    style={style}
    data-testid={testId}
  >
    <div className="settings-section-heading">
      <h2
        id={`settings-heading-${sectionId}`}
        tabIndex={-1}
        style={panelTitleStyle}
      >
        {title}
      </h2>
      {description && <p style={panelDescriptionStyle}>{description}</p>}
    </div>
    <div className="settings-section-content">{children}</div>
  </section>
)

const PreviewSurface = ({
  children,
  style,
  testId,
}: {
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
  interactive?: boolean
}) => (
  <div
    data-testid={testId}
    data-settings-example
    className="w-full min-w-0 overflow-hidden rounded-lg border xl:min-w-72"
    style={style}
  >
    <div className="settings-preview-label">Preview · sample tabs</div>
    {children}
  </div>
)

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const themeOptions = [
  {
    value: 'system',
    label: 'System',
    icon: DesktopWindowsRoundedIcon,
  },
  {
    value: 'light',
    label: 'Light',
    icon: LightModeRoundedIcon,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: DarkModeRoundedIcon,
  },
] as const

const uiPresetOptions = [
  {
    value: 'modern',
    label: 'Modern',
  },
  {
    value: 'classic',
    label: 'Classic',
  },
] as const

const actionTabCountOptions: {
  value: ActionTabCountMode
  label: string
}[] = ACTION_TAB_COUNT_MODES.map((value) => ({
  value,
  label:
    value === 'currentWindow'
      ? 'This window'
      : value === 'allWindows'
        ? 'All windows'
        : 'Off',
}))

const windowOrderOptions: {
  value: WindowOrder
  label: string
}[] = WINDOW_ORDERS.map((value) => ({
  value,
  label: value === 'lastUsed' ? 'Last used' : 'Default',
}))

const DensityControl = ({
  title,
  description,
  value,
  min,
  max,
  step,
  unit,
  defaultValue,
  sliderAriaLabel,
  inputAriaLabel,
  decrementAriaLabel,
  incrementAriaLabel,
  onChange,
  style,
  testId,
}: {
  title: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  defaultValue: number
  sliderAriaLabel: string
  inputAriaLabel: string
  decrementAriaLabel: string
  incrementAriaLabel: string
  onChange: (value: number) => void
  style: React.CSSProperties
  testId?: string
}) => {
  const { userStore } = useStore()
  const skipBlurCommit = React.useRef(false)
  const [draftValue, setDraftValue] = React.useState(String(value))

  React.useEffect(() => {
    setDraftValue(String(value))
  }, [value])

  const commitValue = (nextValue: number) => {
    const clampedValue = clampValue(nextValue, min, max)
    setDraftValue(String(clampedValue))
    if (clampedValue !== value) {
      onChange(clampedValue)
    }
  }

  const commitDraftValue = () => {
    if (skipBlurCommit.current) {
      skipBlurCommit.current = false
      return
    }
    if (!draftValue) {
      setDraftValue(String(value))
      return
    }
    const parsedValue = Number.parseInt(draftValue, 10)
    if (Number.isNaN(parsedValue)) {
      setDraftValue(String(value))
      return
    }
    commitValue(parsedValue)
  }

  return (
    <div className="settings-option" style={style} data-testid={testId}>
      <div
        className={
          description
            ? 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between'
            : 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between'
        }
      >
        <div className="min-w-0">
          <h5 style={controlTitleStyle}>{title}</h5>
          {description && <p style={controlDescriptionStyle}>{description}</p>}
        </div>
        <div className="flex items-center gap-0.5 self-start md:shrink-0">
          <IconButton
            aria-label={decrementAriaLabel}
            onClick={() => commitValue(value - step)}
            style={{ width: 30, height: 30, padding: 0 }}
          >
            <RemoveRoundedIcon fontSize={18} />
          </IconButton>
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              width: 92,
              height: 36,
            }}
          >
            <input
              type="text"
              className="settings-number-input"
              value={draftValue}
              onChange={(event) => {
                const sanitizedValue = event.target.value.replace(/[^\d]/g, '')
                setDraftValue(sanitizedValue)
                if (!sanitizedValue) {
                  return
                }
                const parsedValue = Number.parseInt(sanitizedValue, 10)
                if (
                  Number.isNaN(parsedValue) ||
                  parsedValue < min ||
                  parsedValue > max
                ) {
                  return
                }
                if (parsedValue !== value) {
                  onChange(parsedValue)
                }
              }}
              onBlur={commitDraftValue}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitDraftValue()
                  skipBlurCommit.current = true
                  ;(event.currentTarget as HTMLInputElement).blur()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  setDraftValue(String(value))
                }
              }}
              onKeyUp={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                }
              }}
              aria-label={inputAriaLabel}
              inputMode="numeric"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid',
                borderColor: 'var(--settings-input-border)',
                borderRadius: 4,
                padding: '4px 8px',
                paddingRight: unit ? 32 : 8,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.92rem',
                background: 'transparent',
                color: 'inherit',
              }}
            />
            {unit && (
              <span
                style={{
                  position: 'absolute',
                  right: 8,
                  fontSize: '0.82rem',
                  opacity: 0.7,
                  pointerEvents: 'none',
                }}
              >
                {unit}
              </span>
            )}
          </div>
          <IconButton
            aria-label={incrementAriaLabel}
            onClick={() => commitValue(value + step)}
            style={{ width: 30, height: 30, padding: 0 }}
          >
            <AddRoundedIcon fontSize={18} />
          </IconButton>
        </div>
      </div>
      <Slider
        increaseContrast={userStore.increaseContrast}
        value={value}
        step={step}
        min={min}
        max={max}
        marks={[
          { value: min, label: unit ? `${min}${unit}` : String(min) },
          { value: defaultValue, label: 'Default' },
          { value: max, label: unit ? `${max}${unit}` : String(max) },
        ]}
        onChange={(_, nextValue) => {
          if (typeof nextValue !== 'number') {
            return
          }
          setDraftValue(String(nextValue))
          onChange(nextValue)
        }}
        aria-label={sliderAriaLabel}
        style={{
          marginTop: 20,
          marginLeft: 20,
          marginRight: 20,
          marginBottom: 8,
        }}
      />
    </div>
  )
}

const RowDetailsOption = ({
  title,
  description,
  details,
  checked,
  onChange,
  preview,
  previewHint,
  style,
  testId,
}: {
  title: string
  description?: string
  details?: React.ReactNode
  checked: boolean
  onChange: () => void
  preview: React.ReactNode
  previewHint?: string
  style: React.CSSProperties
  testId?: string
}) => (
  <div
    data-testid={testId}
    className="settings-option flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4"
    style={style}
  >
    <div className="min-w-0 xl:w-64 xl:shrink-0">
      <div
        className={`flex justify-between gap-3 ${
          description ? 'items-start' : 'items-center'
        }`}
      >
        <h5 style={controlTitleStyle}>{title}</h5>
        <Switch
          size="small"
          checked={checked}
          onChange={onChange}
          inputProps={{ 'aria-label': title }}
        />
      </div>
      {description && <p style={controlDescriptionStyle}>{description}</p>}
      {details}
    </div>
    <div className="min-w-0 xl:flex-1">
      {preview}
      {previewHint && (
        <p
          style={{
            ...controlDescriptionStyle,
            marginTop: 6,
            fontSize: '0.74rem',
          }}
        >
          {previewHint}
        </p>
      )}
    </div>
  </div>
)

const SettingsSwitchOption = ({
  title,
  description,
  checked,
  onChange,
  style,
  testId,
  containerAriaLabelledBy,
  containerAriaLabel,
  preview,
  searchPreview,
}: {
  searchPreview?: 'history' | 'results' | 'filtering'
  preview?: React.ReactNode
  title: string
  description?: string
  checked: boolean
  onChange: () => void
  style: React.CSSProperties
  testId?: string
  containerAriaLabelledBy?: string
  containerAriaLabel?: string
}) => {
  const switchId = React.useId()
  const titleId = React.useId()
  const descriptionId = React.useId()
  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null

    if (target?.closest('label')) {
      return
    }

    onChange()
  }

  return (
    <>
      <div
        data-testid={testId}
        data-settings-search-preview={searchPreview}
        className="settings-option settings-switch-option flex cursor-pointer items-center justify-between gap-3"
        style={{
          ...style,
          minHeight: 36,
        }}
        aria-labelledby={containerAriaLabelledBy}
        aria-label={containerAriaLabel}
        onClick={handleContainerClick}
      >
        <label htmlFor={switchId} className="min-w-0 pr-3 cursor-pointer">
          <h5 id={titleId} style={controlTitleStyle}>
            {title}
          </h5>
          {description && (
            <p id={descriptionId} style={controlDescriptionStyle}>
              {description}
            </p>
          )}
        </label>
        <Switch
          size="small"
          checked={checked}
          onChange={onChange}
          inputProps={{
            id: switchId,
            'aria-label': title,
            'aria-labelledby': titleId,
            'aria-describedby': description ? descriptionId : undefined,
          }}
          style={{
            marginTop: 0,
            marginRight: -4,
            flexShrink: 0,
          }}
        />
      </div>
      {preview}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main SettingsDialog                                                        */
/* -------------------------------------------------------------------------- */

export default observer(() => {
  const { userStore } = useStore()
  const muiTheme = useAppTheme()
  const {
    dialogOpen,
    closeDialog,
    highlightDuplicatedTab,
    toggleHighlightDuplicatedTab,
    highlightActiveTabsInAllWindows,
    toggleHighlightActiveTabsInAllWindows,
    increaseContrast,
    toggleIncreaseContrast,
    showTabTooltip,
    toggleShowTabTooltip,
    tabTooltipUrlLines,
    selectTabTooltipUrlLines,
    preserveSearch,
    togglePreserveSearch,
    searchHistory,
    toggleSearchHistory,
    showSearchResultMenu,
    toggleShowSearchResultMenu,
    showAppWindow,
    toggleShowAppWindow,
    showUnmatchedTab,
    toggleShowUnmatchedTab,
    autoFitColumns,
    toggleAutoFitColumns,
    litePopupMode,
    toggleLitePopupMode,
    showShortcutHint,
    toggleShowShortcutHint,
    toolbarAutoHide,
    toggleAutoHide,
    showUrl,
    toggleShowUrl,
    autoFocusSearch,
    toggleAutoFocusSearch,
    tabWidth,
    updateTabWidth,
    fontSize,
    updateFontSize,
    showTabIcon,
    toggleShowTabIcon,
    actionTabCountMode,
    selectActionTabCountMode,
    windowOrder,
    selectWindowOrder,
    uiPreset,
    selectUiPreset,
    theme,
    selectTheme,
  } = userStore
  const reduceMotion = useReduceMotion()
  const tooltipUrlLinesId = React.useId()
  const tooltipUrlLinesHintId = React.useId()
  const settingsNavigationState = React.useRef<SettingsNavigationState>({
    scrollTop: 0,
  })
  const dialogTitleId = React.useId()
  const isDarkMode = muiTheme.mode === 'dark'
  const uiColors = getUiColorTokens(isDarkMode, uiPreset, increaseContrast)
  const panelStyle: React.CSSProperties = {
    backgroundColor: uiColors.settingsDialogSurface,
    borderColor: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.28)'
        : 'rgba(238, 241, 245, 0.14)'
      : increaseContrast
        ? 'rgba(100, 116, 139, 0.42)'
        : 'rgba(148, 163, 184, 0.26)',
  }
  const rowDetailOptionStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    borderColor: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.24)'
        : 'rgba(238, 241, 245, 0.1)'
      : increaseContrast
        ? 'rgba(100, 116, 139, 0.38)'
        : 'rgba(148, 163, 184, 0.22)',
  }
  const previewSurfaceStyle: React.CSSProperties = {
    backgroundColor: uiColors.settingsPreviewSurface,
    borderColor: isDarkMode
      ? increaseContrast
        ? 'rgba(238, 241, 245, 0.26)'
        : 'rgba(238, 241, 245, 0.12)'
      : increaseContrast
        ? 'rgba(100, 116, 139, 0.4)'
        : 'rgba(148, 163, 184, 0.24)',
  }

  const toggleGroupPillStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? increaseContrast
        ? 'rgba(15, 23, 42, 0.66)'
        : 'rgba(15, 23, 42, 0.44)'
      : increaseContrast
        ? 'rgba(203, 213, 225, 0.86)'
        : 'rgba(226, 232, 240, 0.7)',
    border: `1px solid ${rowDetailOptionStyle.borderColor}`,
    borderRadius: uiPreset === 'classic' ? 4 : 999,
  }

  const selectedPillStyle: React.CSSProperties = {
    borderRadius: uiPreset === 'classic' ? 2 : 999,
    color: muiTheme.palette.text.primary,
    backgroundColor: isDarkMode
      ? increaseContrast
        ? 'rgba(216, 228, 247, 0.2)'
        : 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.96)',
    boxShadow: isDarkMode
      ? increaseContrast
        ? 'inset 0 0 0 1px rgba(238, 241, 245, 0.22)'
        : 'inset 0 0 0 1px rgba(238, 241, 245, 0.08)'
      : increaseContrast
        ? '0 1px 2px rgba(15, 23, 42, 0.18), inset 0 0 0 1px rgba(100, 116, 139, 0.28)'
        : '0 1px 2px rgba(15, 23, 42, 0.14)',
  }

  const unselectedPillStyle: React.CSSProperties = {
    borderRadius: uiPreset === 'classic' ? 2 : 999,
    color: increaseContrast
      ? uiColors.mutedText
      : muiTheme.palette.text.secondary,
    backgroundColor: 'transparent',
  }

  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      maxWidth="md"
      disableRestoreFocus
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      aria-labelledby={dialogTitleId}
      data-testid="settings-dialog"
      style={
        {
          backgroundColor: uiColors.settingsDialogSurface,
          backgroundImage: 'none',
          color: muiTheme.palette.text.primary,
          height: 'min(900px, calc(100dvh - 64px))',
          '--settings-border': panelStyle.borderColor,
          '--settings-surface': uiColors.settingsDialogSurface,
          '--settings-focus': uiColors.focusRing,
          '--settings-hover': muiTheme.palette.action.hover,
          '--settings-active': muiTheme.palette.action.selected,
          '--settings-muted': uiColors.mutedText,
          '--settings-input-border': increaseContrast
            ? uiColors.mutedText
            : uiColors.toolbarShellBorderColor,
        } as React.CSSProperties
      }
    >
      <span id={dialogTitleId} className="sr-only">
        Settings
      </span>
      <SettingsNavigation
        stateRef={settingsNavigationState}
        uiPreset={uiPreset}
      >
        <SettingsPanel
          testId="settings-panel-theme-density"
          sectionId="appearance"
          title="Appearance"
          description="Choose colors, contrast, and reading size. Changes apply immediately."
          style={panelStyle}
        >
          <div className="settings-options">
            <div
              className="settings-option"
              style={rowDetailOptionStyle}
              data-testid="settings-ui-preset-toggle-group"
              data-setting-search="Interface style"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h5 style={controlTitleStyle}>Interface style</h5>
                  <p style={controlDescriptionStyle}>
                    Choose Modern or a compact Classic layout.
                  </p>
                </div>
                <ToggleGroup
                  value={uiPreset}
                  aria-label="Choose interface style"
                  onChange={(nextPreset) => {
                    if (!nextPreset) {
                      return
                    }
                    selectUiPreset(nextPreset as 'modern' | 'classic')
                  }}
                  style={toggleGroupPillStyle}
                >
                  {uiPresetOptions.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      aria-label={`Use ${option.value} interface style`}
                      style={{
                        minWidth: 72,
                        ...(uiPreset === option.value
                          ? selectedPillStyle
                          : unselectedPillStyle),
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </div>
            </div>
            <div
              className="settings-option"
              style={rowDetailOptionStyle}
              data-testid="settings-theme-toggle-group"
              data-setting-search="Theme"
            >
              <div className="flex items-center justify-between gap-3">
                <h5 style={controlTitleStyle}>Theme</h5>
                <ToggleGroup
                  value={theme}
                  aria-label="Choose theme"
                  onChange={(nextTheme) => {
                    if (!nextTheme) {
                      return
                    }
                    selectTheme(nextTheme)
                  }}
                  style={toggleGroupPillStyle}
                >
                  {themeOptions.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      aria-label={`Use ${option.value} theme`}
                      style={{
                        paddingLeft: 5,
                        paddingRight: 5,
                        ...(theme === option.value
                          ? selectedPillStyle
                          : unselectedPillStyle),
                      }}
                    >
                      <option.icon fontSize={16} />
                      <span>{option.label}</span>
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </div>
            </div>
            <SettingsSwitchOption
              testId="settings-increase-contrast"
              title="Increase contrast"
              description="Make toolbars, buttons, controls, and muted details easier to see."
              checked={increaseContrast}
              onChange={toggleIncreaseContrast}
              style={rowDetailOptionStyle}
            />
            <DensityControl
              testId="settings-font-size-control"
              title="Font size"
              value={fontSize}
              min={6}
              max={36}
              step={1}
              defaultValue={14}
              sliderAriaLabel="Update Font Size"
              inputAriaLabel="Font Size Value"
              decrementAriaLabel="Decrease Font Size"
              incrementAriaLabel="Increase Font Size"
              onChange={updateFontSize}
              style={rowDetailOptionStyle}
            />
          </div>
        </SettingsPanel>
        <SettingsPanel
          sectionId="windows-layout"
          testId="settings-panel-layout"
          title="Windows & layout"
          description="Choose window columns, their order, and which windows appear."
          style={panelStyle}
        >
          <div className="settings-options">
            <DensityControl
              testId="settings-tab-width-control"
              title="Minimum tab width"
              description="Affects window columns and cards; wider values make titles easier to scan."
              value={tabWidth}
              min={15}
              max={50}
              step={1}
              defaultValue={20}
              sliderAriaLabel="Update Tab Width"
              inputAriaLabel="Minimum Tab Width Value"
              decrementAriaLabel="Decrease Minimum Tab Width"
              incrementAriaLabel="Increase Minimum Tab Width"
              onChange={updateTabWidth}
              style={rowDetailOptionStyle}
            />
            <SettingsSwitchOption
              title="Auto-fit columns"
              description="Avoid horizontal scrolling by fitting columns to the window."
              checked={autoFitColumns}
              onChange={toggleAutoFitColumns}
              style={rowDetailOptionStyle}
            />
            <div
              className="settings-option"
              style={rowDetailOptionStyle}
              data-testid="settings-window-order-toggle-group"
              data-setting-search="Window order"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h5 style={controlTitleStyle}>Window order</h5>
                  <p style={controlDescriptionStyle}>
                    Use the browser’s window order, or put recently used windows
                    first.
                  </p>
                </div>
                <ToggleGroup
                  value={windowOrder}
                  aria-label="Choose window order"
                  onChange={(nextWindowOrder) => {
                    if (!nextWindowOrder) {
                      return
                    }
                    selectWindowOrder(nextWindowOrder as WindowOrder)
                  }}
                  style={toggleGroupPillStyle}
                >
                  {windowOrderOptions.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      aria-label={`Use ${option.label.toLowerCase()} window order`}
                      style={{
                        minWidth: 78,
                        ...(windowOrder === option.value
                          ? selectedPillStyle
                          : unselectedPillStyle),
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </div>
            </div>
            <SettingsSwitchOption
              title="Show app windows in list"
              description="Include standalone app windows in the main list."
              checked={showAppWindow}
              onChange={toggleShowAppWindow}
              style={rowDetailOptionStyle}
            />
            <div data-settings-preview="Minimum tab width|Auto-fit columns|Window order|Show app windows in list">
              <WindowLayoutExample />
            </div>
          </div>
        </SettingsPanel>
        <SettingsPanel
          testId="settings-panel-tab-display"
          sectionId="tab-details"
          title="Tab details"
          description="Choose which details each tab shows."
          style={panelStyle}
        >
          <div className="settings-options" data-testid="row-details-options">
            <RowDetailsOption
              testId="row-details-option-active-tabs"
              title="Highlight all active tabs"
              checked={highlightActiveTabsInAllWindows}
              onChange={toggleHighlightActiveTabsInAllWindows}
              style={rowDetailOptionStyle}
              preview={
                <PreviewSurface
                  style={previewSurfaceStyle}
                  testId="row-details-preview-active-tabs"
                >
                  <TabRowPreview
                    config={{
                      id: 9100,
                      title: 'Active tab in inactive window',
                      url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2635',
                      active: true,
                      lastFocused: false,
                      fontSize,
                      uiPreset,
                      increaseContrast,
                      highlightActiveTabsInAllWindows,
                      showDuplicateMarker: false,
                      showTabIcon: true,
                      showUrl: true,
                      showTabTooltip: false,
                    }}
                  />
                </PreviewSurface>
              }
            />
            <RowDetailsOption
              testId="row-details-option-duplicates"
              title="Mark duplicate tabs"
              checked={highlightDuplicatedTab}
              onChange={toggleHighlightDuplicatedTab}
              style={rowDetailOptionStyle}
              preview={
                <PreviewSurface
                  style={previewSurfaceStyle}
                  testId="row-details-preview-duplicates"
                >
                  <TabRowPreview
                    config={{
                      id: 9101,
                      title: 'Tab Manager issue tracker',
                      url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
                      duplicatedTabCount: 2,
                      fontSize,
                      uiPreset,
                      increaseContrast,
                      showDuplicateMarker: highlightDuplicatedTab,
                      showTabIcon: true,
                      showUrl: true,
                      showTabTooltip: false,
                    }}
                  />
                </PreviewSurface>
              }
            />
            <RowDetailsOption
              testId="row-details-option-icons"
              title="Show tab icons"
              checked={showTabIcon}
              onChange={toggleShowTabIcon}
              style={rowDetailOptionStyle}
              previewHint="Hover preview to inspect controls."
              preview={
                <PreviewSurface
                  style={previewSurfaceStyle}
                  testId="row-details-preview-icons"
                >
                  <TabRowPreview
                    config={{
                      id: 9102,
                      title: 'Tab Manager settings dialog',
                      url: 'https://github.com/xcv58/Tab-Manager-v2',
                      fontSize,
                      uiPreset,
                      increaseContrast,
                      showDuplicateMarker: false,
                      showTabIcon,
                      showUrl: true,
                      showTabTooltip: false,
                    }}
                  />
                </PreviewSurface>
              }
            />
            <RowDetailsOption
              testId="row-details-option-urls"
              title="Show URLs"
              checked={showUrl}
              onChange={toggleShowUrl}
              style={rowDetailOptionStyle}
              preview={
                <PreviewSurface
                  style={previewSurfaceStyle}
                  testId="row-details-preview-urls"
                >
                  <TabRowPreview
                    config={{
                      id: 9103,
                      title: 'Preview URLs inside settings',
                      url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
                      fontSize,
                      uiPreset,
                      increaseContrast,
                      showDuplicateMarker: false,
                      showTabIcon: true,
                      showUrl,
                      showTabTooltip: false,
                    }}
                  />
                </PreviewSurface>
              }
            />
            <RowDetailsOption
              testId="row-details-option-tooltips"
              title="Show tab tooltips"
              checked={showTabTooltip}
              onChange={toggleShowTabTooltip}
              style={rowDetailOptionStyle}
              details={
                <div className="mt-3">
                  <label
                    htmlFor={tooltipUrlLinesId}
                    style={controlDescriptionStyle}
                  >
                    URL preview length
                  </label>
                  <select
                    id={tooltipUrlLinesId}
                    aria-describedby={tooltipUrlLinesHintId}
                    data-testid="tab-tooltip-url-lines"
                    disabled={!showTabTooltip}
                    value={normalizeTabTooltipUrlLines(tabTooltipUrlLines)}
                    onChange={(event) =>
                      selectTabTooltipUrlLines(
                        event.target.value === 'full'
                          ? 'full'
                          : Number(event.target.value),
                      )
                    }
                    className="mt-1 block w-full rounded-md border px-2 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      backgroundColor: uiColors.settingsDialogSurface,
                      color: uiColors.primaryText,
                      borderColor: rowDetailOptionStyle.borderColor,
                      outlineColor: uiColors.focusRing,
                      colorScheme: isDarkMode ? 'dark' : 'light',
                    }}
                  >
                    {TAB_TOOLTIP_URL_LINES.map((lines) => (
                      <option key={lines} value={lines}>
                        {lines === 'full'
                          ? 'Full URL'
                          : `${lines} ${lines === 1 ? 'line' : 'lines'}`}
                      </option>
                    ))}
                  </select>
                  <p
                    id={tooltipUrlLinesHintId}
                    style={{ ...controlDescriptionStyle, marginTop: 6 }}
                  >
                    Expand clipped text in the tooltip. Copy always keeps the
                    complete title or URL.
                  </p>
                </div>
              }
              previewHint="Hover preview to open the tooltip."
              preview={
                <PreviewSurface
                  style={previewSurfaceStyle}
                  interactive
                  testId="row-details-preview-tooltips"
                >
                  <TabRowPreview
                    config={{
                      id: 9104,
                      title: 'Hover this preview tab for tooltip details',
                      url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2658?preview=tooltip-url-length&theme=dark&style=classic&contrast=increased&show=long-query-parameters&source=settings-preview',
                      duplicatedTabCount: 2,
                      fontSize,
                      uiPreset,
                      increaseContrast,
                      showDuplicateMarker: false,
                      showTabIcon: true,
                      showUrl: false,
                      showTabTooltip,
                      showDetailsButton: true,
                      tabTooltipUrlLines,
                    }}
                  />
                </PreviewSurface>
              }
            />
          </div>
        </SettingsPanel>
        <SettingsPanel
          testId="settings-panel-search"
          sectionId="search"
          title="Search"
          description="Control how search starts and what stays visible while filtering."
          style={panelStyle}
        >
          <SearchSettingsPreview>
            <SettingsSwitchOption
              testId="settings-search-preserve"
              title="Preserve search"
              description="Keep your query when you reopen Tab Manager."
              checked={preserveSearch}
              onChange={togglePreserveSearch}
              style={rowDetailOptionStyle}
            />
            <SettingsSwitchOption
              testId="settings-search-focus"
              title="Focus search on open"
              description="Place the cursor in search the next time Tab Manager opens."
              checked={autoFocusSearch}
              onChange={toggleAutoFocusSearch}
              style={rowDetailOptionStyle}
            />
            <SettingsSwitchOption
              testId="settings-search-history"
              searchPreview="history"
              title="Include browser history in results"
              checked={searchHistory}
              onChange={toggleSearchHistory}
              style={rowDetailOptionStyle}
            />
            <SettingsSwitchOption
              testId="settings-search-result-menu"
              searchPreview="results"
              title="Show result menu in full-page view"
              description="Show matching tabs below search when Tab Manager is open in its own browser tab. Commands always remain available."
              checked={showSearchResultMenu}
              onChange={toggleShowSearchResultMenu}
              style={rowDetailOptionStyle}
            />
            <SettingsSwitchOption
              testId="settings-search-unmatched"
              searchPreview="filtering"
              title="Keep non-matching tabs visible"
              description="Keep unmatched tabs in view while you search."
              checked={showUnmatchedTab}
              onChange={toggleShowUnmatchedTab}
              style={rowDetailOptionStyle}
            />
          </SearchSettingsPreview>
        </SettingsPanel>
        <SettingsPanel
          sectionId="popup-controls"
          testId="settings-panel-controls"
          title="Popup & controls"
          description="Configure the browser popup and application controls."
          style={panelStyle}
        >
          <div className="settings-options">
            <h3 className="settings-subheading">Toolbar</h3>
            <SettingsSwitchOption
              preview={<ToolbarExample />}
              title="Keep toolbar visible"
              description="Always show the bottom-right toolbar."
              checked={!toolbarAutoHide}
              onChange={toggleAutoHide}
              style={rowDetailOptionStyle}
              containerAriaLabel="Toggle Always Show Toolbar"
            />
            <h3 className="settings-subheading">Browser popup</h3>
            <SettingsSwitchOption
              title="Use lite popup mode"
              description="Use a compact layout the next time you open the browser popup."
              checked={litePopupMode}
              onChange={toggleLitePopupMode}
              style={rowDetailOptionStyle}
              testId="settings-lite-popup-mode"
            />
            <div
              className="settings-option"
              style={rowDetailOptionStyle}
              data-testid="settings-action-tab-count-toggle-group"
              data-setting-search="Extension icon count"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h5 style={controlTitleStyle}>Extension icon count</h5>
                  <p style={controlDescriptionStyle}>
                    Show a tab count on the browser extension icon.
                  </p>
                </div>
                <ToggleGroup
                  value={actionTabCountMode}
                  aria-label="Choose extension icon tab count mode"
                  onChange={(nextMode) => {
                    if (!nextMode) {
                      return
                    }
                    selectActionTabCountMode(nextMode as ActionTabCountMode)
                  }}
                  style={toggleGroupPillStyle}
                >
                  {actionTabCountOptions.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      aria-label={`Show extension icon count for ${option.label.toLowerCase()} tabs`}
                      style={{
                        minWidth: 54,
                        ...(actionTabCountMode === option.value
                          ? selectedPillStyle
                          : unselectedPillStyle),
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </div>
            </div>
            <div data-settings-preview="Extension icon count">
              <ExtensionIconExample />
            </div>
            <h3 className="settings-subheading">Keyboard feedback</h3>
            <SettingsSwitchOption
              title="Show shortcut hints"
              description="Show the shortcut and its action when a shortcut is pressed."
              checked={showShortcutHint}
              onChange={toggleShowShortcutHint}
              style={rowDetailOptionStyle}
            />
          </div>
        </SettingsPanel>
      </SettingsNavigation>
      <div
        className="settings-footer"
        style={{ borderColor: panelStyle.borderColor }}
      >
        <div className="flex items-center gap-2 opacity-80 min-w-0 flex-wrap">
          <SponsorButton />
          <FeedbackButton />
          <span className="text-xs opacity-65">
            v{browser.runtime.getManifest().version}
          </span>
        </div>
        <button type="button" className="settings-done" onClick={closeDialog}>
          Done
        </button>
      </div>
    </Dialog>
  )
})
