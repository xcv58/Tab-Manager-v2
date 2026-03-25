import React from 'react'
import { observer } from 'mobx-react-lite'
import { browser } from 'libs'
import Dialog, { DialogTitle, DialogContent } from 'components/ui/Dialog'
import Switch from 'components/ui/Switch'
import { useStore } from 'components/hooks/useStore'
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

/* -------------------------------------------------------------------------- */
/*  Inline style helpers (replacing MUI sx / Typography / FormHelperText)       */
/* -------------------------------------------------------------------------- */

const panelTitleStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  fontWeight: 700,
  lineHeight: 1.3,
  margin: 0,
}

const panelDescriptionStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: '0.8rem',
  lineHeight: 1.45,
  opacity: 0.7,
  margin: 0,
}

const controlTitleStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 600,
  lineHeight: 1.35,
  margin: 0,
}

const controlDescriptionStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: '0.76rem',
  lineHeight: 1.45,
  opacity: 0.7,
  margin: 0,
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

const SettingsPanel = ({
  title,
  description,
  children,
  style,
  testId,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
  className?: string
}) => (
  <div
    className={`rounded-xl border p-4 ${className || ''}`}
    style={style}
    data-testid={testId}
  >
    <div className="mb-3">
      <h4 style={panelTitleStyle}>{title}</h4>
      {description && <p style={panelDescriptionStyle}>{description}</p>}
    </div>
    {children}
  </div>
)

const PreviewSurface = ({
  children,
  style,
  testId,
}: {
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
}) => (
  <div
    data-testid={testId}
    className="w-full min-w-0 overflow-hidden rounded-lg border xl:min-w-72"
    style={style}
  >
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
    <div
      className="rounded-lg border px-3 py-3"
      style={style}
      data-testid={testId}
    >
      <div
        className={`flex flex-col gap-3 md:flex-row md:justify-between ${
          description ? 'md:items-start' : 'md:items-center'
        }`}
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
                  ;(event.currentTarget as HTMLInputElement).blur()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setDraftValue(String(value))
                  ;(event.currentTarget as HTMLInputElement).blur()
                }
              }}
              aria-label={inputAriaLabel}
              inputMode="numeric"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid',
                borderColor: 'var(--input-border, rgba(0,0,0,0.23))',
                borderRadius: 4,
                padding: '4px 8px',
                paddingRight: unit ? 32 : 8,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.92rem',
                background: 'transparent',
                color: 'inherit',
                outline: 'none',
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
  checked,
  onChange,
  preview,
  previewHint,
  style,
  testId,
}: {
  title: string
  description?: string
  checked: boolean
  onChange: () => void
  preview: React.ReactNode
  previewHint?: string
  style: React.CSSProperties
  testId?: string
}) => (
  <div
    data-testid={testId}
    className="flex flex-col gap-3 rounded-lg border px-3 py-3 xl:flex-row xl:items-center xl:gap-4"
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
          checked={checked}
          onChange={onChange}
          inputProps={{ 'aria-label': title }}
        />
      </div>
      {description && <p style={controlDescriptionStyle}>{description}</p>}
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
}: {
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
  const descriptionId = description ? React.useId() : undefined

  return (
    <div
      data-testid={testId}
      className={`flex cursor-pointer justify-between gap-3 rounded-lg border px-3 transition-shadow focus-within:ring-2 focus-within:ring-sky-500/35 ${
        description ? 'items-start py-3.5' : 'items-center py-3'
      }`}
      style={style}
      aria-labelledby={containerAriaLabelledBy}
      aria-label={containerAriaLabel}
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
          'aria-describedby': descriptionId,
        }}
        style={{
          marginTop: description ? -2 : 0,
          marginRight: -4,
          flexShrink: 0,
        }}
      />
    </div>
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
    showTabTooltip,
    toggleShowTabTooltip,
    preserveSearch,
    togglePreserveSearch,
    searchHistory,
    toggleSearchHistory,
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
    uiPreset,
    selectUiPreset,
    theme,
    selectTheme,
  } = userStore
  const reduceMotion = useReduceMotion()
  const isDarkMode = muiTheme.mode === 'dark'
  const uiColors = getUiColorTokens(isDarkMode, uiPreset)
  const panelStyle: React.CSSProperties = {
    backgroundColor: uiColors.settingsPanelSurface,
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.14)'
      : 'rgba(148, 163, 184, 0.26)',
  }
  const rowDetailOptionStyle: React.CSSProperties = {
    backgroundColor: uiColors.settingsRowSurface,
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.1)'
      : 'rgba(148, 163, 184, 0.22)',
  }
  const previewSurfaceStyle: React.CSSProperties = {
    backgroundColor: uiColors.settingsPreviewSurface,
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.12)'
      : 'rgba(148, 163, 184, 0.24)',
  }

  const toggleGroupPillStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(15, 23, 42, 0.44)'
      : 'rgba(226, 232, 240, 0.7)',
    border: `1px solid ${rowDetailOptionStyle.borderColor}`,
  }

  const selectedPillStyle: React.CSSProperties = {
    color: muiTheme.palette.text.primary,
    backgroundColor: isDarkMode
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.96)',
    boxShadow: isDarkMode
      ? 'inset 0 0 0 1px rgba(238, 241, 245, 0.08)'
      : '0 1px 2px rgba(15, 23, 42, 0.14)',
  }

  const unselectedPillStyle: React.CSSProperties = {
    color: muiTheme.palette.text.secondary,
    backgroundColor: 'transparent',
  }

  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      maxWidth="lg"
      disableRestoreFocus
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      style={{
        backgroundColor: uiColors.settingsDialogSurface,
        backgroundImage: 'none',
      }}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <div className="grid gap-3 py-1 lg:grid-cols-2 xl:grid-cols-3">
          <SettingsPanel
            testId="settings-panel-search"
            title="Search"
            description="Control how search starts and what stays visible while filtering."
            style={panelStyle}
          >
            <div className="space-y-3">
              <SettingsSwitchOption
                testId="settings-search-preserve"
                title="Preserve search"
                checked={preserveSearch}
                onChange={togglePreserveSearch}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                testId="settings-search-focus"
                title="Focus search on open"
                checked={autoFocusSearch}
                onChange={toggleAutoFocusSearch}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                testId="settings-search-history"
                title="Include browser history in results"
                checked={searchHistory}
                onChange={toggleSearchHistory}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                title="Keep non-matching tabs visible"
                description="Keep unmatched tabs in view while you search."
                checked={showUnmatchedTab}
                onChange={toggleShowUnmatchedTab}
                style={rowDetailOptionStyle}
              />
            </div>
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-theme-density"
            title="Appearance"
            description="Adjust theme, reading size, and layout density."
            style={panelStyle}
          >
            <div className="space-y-3">
              <div
                className="rounded-lg border px-3 py-3"
                style={rowDetailOptionStyle}
                data-testid="settings-ui-preset-toggle-group"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <h5 style={controlTitleStyle}>Interface style</h5>
                    <p style={controlDescriptionStyle}>
                      Switch between the current UI and the pre-2.0-inspired
                      Classic mode.
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
                className="rounded-lg border px-3 py-3"
                style={rowDetailOptionStyle}
                data-testid="settings-theme-toggle-group"
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
                      </ToggleButton>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
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
            </div>
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-behavior"
            title="View"
            description="Choose which windows and popup controls stay visible."
            style={panelStyle}
            className="xl:order-3"
          >
            <div className="space-y-3">
              <SettingsSwitchOption
                title="Show app windows in list"
                description="Include standalone app windows in the main list."
                checked={showAppWindow}
                onChange={toggleShowAppWindow}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                title="Use lite popup mode"
                description="Use the lite layout for the browser action popup window only."
                checked={litePopupMode}
                onChange={toggleLitePopupMode}
                style={rowDetailOptionStyle}
                testId="settings-lite-popup-mode"
              />
              <SettingsSwitchOption
                title="Auto-fit columns"
                description="Avoid horizontal scrolling by fitting columns to the window."
                checked={autoFitColumns}
                onChange={toggleAutoFitColumns}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                title="Show shortcut hints"
                description="Show the shortcut and its action when a shortcut is pressed."
                checked={showShortcutHint}
                onChange={toggleShowShortcutHint}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                title="Keep toolbar visible"
                description="Always show the bottom-right toolbar."
                checked={!toolbarAutoHide}
                onChange={toggleAutoHide}
                style={rowDetailOptionStyle}
                containerAriaLabelledBy="toggle-always-show-toolbar"
                containerAriaLabel="Toggle Always Show Toolbar"
              />
            </div>
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-tab-display"
            title="Tab display"
            description="Choose which details each tab shows."
            style={panelStyle}
            className="xl:order-4 xl:col-span-3"
          >
            <div className="space-y-3" data-testid="row-details-options">
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
                        uiPreset,
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
                        uiPreset,
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
                        uiPreset,
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
                previewHint="Hover preview to open the tooltip."
                preview={
                  <PreviewSurface
                    style={previewSurfaceStyle}
                    testId="row-details-preview-tooltips"
                  >
                    <TabRowPreview
                      config={{
                        id: 9104,
                        title: 'Hover this preview tab for tooltip details',
                        url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
                        duplicatedTabCount: 2,
                        uiPreset,
                        showDuplicateMarker: false,
                        showTabIcon: true,
                        showUrl: false,
                        showTabTooltip,
                      }}
                    />
                  </PreviewSurface>
                }
              />
            </div>
          </SettingsPanel>
        </div>
        <div
          className="mt-6 flex items-center justify-between border-t pt-4"
          style={{ borderColor: panelStyle.borderColor }}
        >
          <div className="flex items-center gap-2 opacity-80">
            <SponsorButton />
            <FeedbackButton />
          </div>
          <div className="text-sm text-right opacity-65">
            v{browser.runtime.getManifest().version}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
