import React from 'react'
import { observer } from 'mobx-react-lite'
import { browser } from 'libs'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Fade from '@mui/material/Fade'
import Switch from '@mui/material/Switch'
import { useStore } from 'components/hooks/useStore'
import Slider from '@mui/material/Slider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'
import SponsorButton from './SponsorButton'
import FeedbackButton from './FeedbackButton'
import TabRowPreview from './TabRowPreview'

const SettingsPanel = ({
  title,
  description,
  children,
  style,
  testId,
}: {
  title: string
  description?: string
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
}) => (
  <div className="rounded-xl border p-4" style={style} data-testid={testId}>
    <div className="mb-3">
      <Typography component="h4" sx={{ fontSize: '0.92rem', fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <FormHelperText sx={{ mt: 0.5, fontSize: '0.8rem' }}>
          {description}
        </FormHelperText>
      )}
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
  description: string
  value: number
  min: number
  max: number
  step: number
  unit: string
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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Typography
            component="h5"
            sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35 }}
          >
            {title}
          </Typography>
          <FormHelperText sx={{ mt: 0.5, fontSize: '0.76rem' }}>
            {description}
          </FormHelperText>
        </div>
        <div className="flex items-center gap-1 self-start md:shrink-0">
          <IconButton
            size="small"
            aria-label={decrementAriaLabel}
            onClick={() => commitValue(value - step)}
          >
            <RemoveRoundedIcon fontSize="small" />
          </IconButton>
          <TextField
            size="small"
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
            inputProps={{
              'aria-label': inputAriaLabel,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            }}
            sx={{
              width: 104,
              '& input': {
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              },
            }}
          />
          <IconButton
            size="small"
            aria-label={incrementAriaLabel}
            onClick={() => commitValue(value + step)}
          >
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </div>
      </div>
      <Slider
        value={value}
        step={step}
        min={min}
        max={max}
        marks={[
          { value: min, label: `${min}${unit}` },
          { value: defaultValue, label: 'Default' },
          { value: max, label: `${max}${unit}` },
        ]}
        onChange={(_, nextValue) => {
          if (typeof nextValue !== 'number') {
            return
          }
          setDraftValue(String(nextValue))
          onChange(nextValue)
        }}
        aria-label={sliderAriaLabel}
        sx={{ mt: 2.5 }}
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
  description: string
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
      <div className="mb-1 flex items-start justify-between gap-3">
        <Typography
          component="h5"
          sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35 }}
        >
          {title}
        </Typography>
        <Switch
          color="primary"
          checked={checked}
          onChange={onChange}
          inputProps={{ 'aria-label': title }}
        />
      </div>
      <FormHelperText sx={{ mt: 0, fontSize: '0.78rem' }}>
        {description}
      </FormHelperText>
    </div>
    <div className="min-w-0 xl:flex-1">
      {preview}
      {previewHint && (
        <FormHelperText sx={{ mt: 0.75, fontSize: '0.74rem' }}>
          {previewHint}
        </FormHelperText>
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
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
  style: React.CSSProperties
  testId?: string
}) => (
  <div
    data-testid={testId}
    className="flex items-start justify-between gap-3 rounded-lg border px-3 py-3"
    style={style}
  >
    <div className="min-w-0">
      <Typography
        component="h5"
        sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35 }}
      >
        {title}
      </Typography>
      <FormHelperText sx={{ mt: 0.5, fontSize: '0.76rem' }}>
        {description}
      </FormHelperText>
    </div>
    <Switch
      color="primary"
      checked={checked}
      onChange={onChange}
      inputProps={{ 'aria-label': title }}
      sx={{ mt: -0.25, mr: -0.5 }}
    />
  </div>
)

export default observer(() => {
  const { userStore } = useStore()
  const muiTheme = useTheme()
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
    theme,
    selectTheme,
  } = userStore
  const reduceMotion = useReduceMotion()
  const isDarkMode = muiTheme.palette.mode === 'dark'
  const panelStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(246, 248, 252, 0.94)',
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.14)'
      : 'rgba(148, 163, 184, 0.26)',
  }
  const rowDetailOptionStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(255, 255, 255, 0.5)',
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.1)'
      : 'rgba(148, 163, 184, 0.22)',
  }
  const previewSurfaceStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(15, 23, 42, 0.34)'
      : 'rgba(255, 255, 255, 0.72)',
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.12)'
      : 'rgba(148, 163, 184, 0.24)',
  }
  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Fade}
      disableRestoreFocus
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <div className="grid gap-3 py-1 lg:grid-cols-2">
          <SettingsPanel
            testId="settings-panel-search"
            title="Search behavior"
            description="Tune how the search box behaves when the popup opens and while you search."
            style={panelStyle}
          >
            <div className="space-y-3">
              <SettingsSwitchOption
                testId="settings-search-preserve"
                title="Preserve search"
                description="Keep your last query when you reopen the popup."
                checked={preserveSearch}
                onChange={togglePreserveSearch}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                testId="settings-search-history"
                title="Include browser history in results"
                description="Show recent history when the page is not open in a tab."
                checked={searchHistory}
                onChange={toggleSearchHistory}
                style={rowDetailOptionStyle}
              />
              <SettingsSwitchOption
                testId="settings-search-focus"
                title="Focus search on open"
                description="Put the cursor in search as soon as the popup opens."
                checked={autoFocusSearch}
                onChange={toggleAutoFocusSearch}
                style={rowDetailOptionStyle}
              />
            </div>
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-theme-density"
            title="Theme & density"
            description="Set the overall tone and reading size for the page."
            style={panelStyle}
          >
            <div className="space-y-4">
              <div
                className="rounded-lg border px-3 py-3"
                style={rowDetailOptionStyle}
                data-testid="settings-theme-toggle-group"
              >
                <Typography
                  component="h5"
                  sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35 }}
                >
                  Theme
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={theme}
                  aria-label="Choose theme"
                  onChange={(_, nextTheme) => {
                    if (!nextTheme) {
                      return
                    }
                    selectTheme(nextTheme)
                  }}
                  sx={{
                    mt: 1.5,
                    display: 'inline-flex',
                    borderRadius: 999,
                    p: 0.5,
                    gap: 0.5,
                    backgroundColor: isDarkMode
                      ? 'rgba(15, 23, 42, 0.44)'
                      : 'rgba(226, 232, 240, 0.7)',
                    border: `1px solid ${rowDetailOptionStyle.borderColor}`,
                    '& .MuiToggleButtonGroup-grouped': {
                      m: 0,
                      border: 0,
                      borderRadius: 999,
                      minWidth: 52,
                      height: 44,
                      color: muiTheme.palette.text.secondary,
                    },
                    '& .Mui-selected': {
                      color: muiTheme.palette.text.primary,
                      backgroundColor: isDarkMode
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(255, 255, 255, 0.96)',
                      boxShadow: isDarkMode
                        ? 'inset 0 0 0 1px rgba(238, 241, 245, 0.08)'
                        : '0 1px 2px rgba(15, 23, 42, 0.14)',
                    },
                    '& .Mui-selected:hover': {
                      backgroundColor: isDarkMode
                        ? 'rgba(255, 255, 255, 0.16)'
                        : 'rgba(255, 255, 255, 0.98)',
                    },
                    '& .MuiToggleButton-root:hover': {
                      backgroundColor: isDarkMode
                        ? 'rgba(255, 255, 255, 0.07)'
                        : 'rgba(255, 255, 255, 0.58)',
                    },
                  }}
                >
                  {themeOptions.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      aria-label={`Use ${option.value} theme`}
                    >
                      <option.icon fontSize="small" />
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
              <DensityControl
                testId="settings-font-size-control"
                title="Font size"
                description="Use the number field for precise values, or drag the slider for a quick preview."
                value={fontSize}
                min={6}
                max={36}
                step={1}
                unit="px"
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
                description="This minimum width is applied to the window columns and cards, so wider values keep titles easier to scan."
                value={tabWidth}
                min={15}
                max={50}
                step={1}
                unit="rem"
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
            testId="settings-panel-tab-display"
            title="Tab display"
            description="Choose which details each tab shows by default."
            style={panelStyle}
          >
            <div className="space-y-3" data-testid="row-details-options">
              <RowDetailsOption
                testId="row-details-option-duplicates"
                title="Mark duplicate tabs"
                description="Show the duplicate marker on tabs that share the same page."
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
                description="Use the real tab leading slot so hover reveals the same selection and action controls."
                checked={showTabIcon}
                onChange={toggleShowTabIcon}
                style={rowDetailOptionStyle}
                previewHint="Hover the preview tab to inspect the real hover state."
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
                description="Add the URL line below the title so similar pages are easier to scan."
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
                description="Use the actual tooltip so the preview tab can surface the full title and URL on hover."
                checked={showTabTooltip}
                onChange={toggleShowTabTooltip}
                style={rowDetailOptionStyle}
                previewHint="Hover the preview tab to open the tooltip."
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
          <SettingsPanel
            testId="settings-panel-behavior"
            title="Behavior"
            description="Choose what stays visible and how the extension behaves in compact mode."
            style={panelStyle}
          >
            <div className="space-y-4">
              <div>
                <Typography
                  component="h5"
                  sx={{ fontSize: '0.84rem', fontWeight: 700 }}
                >
                  Results visibility
                </Typography>
                <FormHelperText sx={{ mt: 0.5, fontSize: '0.76rem' }}>
                  Decide how much stays on screen while filtering and scanning.
                </FormHelperText>
                <FormGroup sx={{ mt: 1.25 }}>
                  <FormControlLabel
                    label="Keep non-matching tabs visible"
                    control={
                      <Switch
                        color="primary"
                        checked={showUnmatchedTab}
                        onChange={toggleShowUnmatchedTab}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Include app windows"
                    control={
                      <Switch
                        color="primary"
                        checked={showAppWindow}
                        onChange={toggleShowAppWindow}
                      />
                    }
                  />
                </FormGroup>
              </div>
              <div
                className="border-t pt-4"
                style={{ borderColor: rowDetailOptionStyle.borderColor }}
              >
                <Typography
                  component="h5"
                  sx={{ fontSize: '0.84rem', fontWeight: 700 }}
                >
                  Compact mode
                </Typography>
                <FormHelperText sx={{ mt: 0.5, fontSize: '0.76rem' }}>
                  Tune how much UI stays visible when the extension is used in
                  tight spaces.
                </FormHelperText>
                <FormGroup sx={{ mt: 1.25 }}>
                  <FormControlLabel
                    label="Use lite popup mode"
                    control={
                      <Switch
                        color="primary"
                        checked={litePopupMode}
                        onChange={toggleLitePopupMode}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Show shortcut hints"
                    control={
                      <Switch
                        color="primary"
                        checked={showShortcutHint}
                        onChange={toggleShowShortcutHint}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Keep toolbar visible"
                    aria-labelledby="toggle-always-show-toolbar"
                    aria-label="Toggle Always Show Toolbar"
                    control={
                      <Switch
                        color="primary"
                        checked={!toolbarAutoHide}
                        onChange={toggleAutoHide}
                      />
                    }
                  />
                </FormGroup>
              </div>
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
