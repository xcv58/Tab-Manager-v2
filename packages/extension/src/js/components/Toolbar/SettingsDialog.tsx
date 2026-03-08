import React from 'react'
import { observer } from 'mobx-react-lite'
import { browser } from 'libs'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Divider from '@mui/material/Divider'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Fade from '@mui/material/Fade'
import Switch from '@mui/material/Switch'
import { useStore } from 'components/hooks/useStore'
import Slider from '@mui/material/Slider'
import FormLabel from '@mui/material/FormLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Typography from '@mui/material/Typography'
import { THEMES } from 'stores/UserStore'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'
import SponsorButton from './SponsorButton'
import FeedbackButton from './FeedbackButton'

const SettingsSection = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) => (
  <div className="py-4">
    <div className="mb-3">
      <Typography component="h3" sx={{ fontSize: '0.92rem', fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <FormHelperText sx={{ mt: 0.5 }}>{description}</FormHelperText>
      )}
    </div>
    <FormGroup>{children}</FormGroup>
  </div>
)

export default observer(() => {
  const { userStore } = useStore()
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
  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      maxWidth="md"
      TransitionComponent={Fade}
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
    >
      <DialogTitle>
        <div className="flex justify-between">
          Settings{' '}
          <div>
            <SponsorButton />
            <FeedbackButton />
          </div>
        </div>
      </DialogTitle>
      <DialogContent>
        <FormControl className="w-full">
          <SettingsSection
            title="Search"
            description="Tune how the search box behaves when the popup opens and while you search."
          >
            <FormControlLabel
              label="Preserve search"
              control={
                <Switch
                  color="primary"
                  checked={preserveSearch}
                  onChange={togglePreserveSearch}
                />
              }
            />
            <FormControlLabel
              label="Include browser history in results"
              control={
                <Switch
                  color="primary"
                  checked={searchHistory}
                  onChange={toggleSearchHistory}
                />
              }
            />
            <FormControlLabel
              label="Focus search on open"
              control={
                <Switch
                  color="primary"
                  checked={autoFocusSearch}
                  onChange={toggleAutoFocusSearch}
                />
              }
            />
          </SettingsSection>
          <Divider />
          <SettingsSection
            title="Appearance"
            description="Control density, theme, and how much detail each tab row shows."
          >
            <FormControl variant="standard" sx={{ mb: 2 }}>
              <InputLabel id="theme-label">Theme</InputLabel>
              <Select
                id="theme-select"
                value={theme}
                onChange={(e) => {
                  selectTheme(e.target.value)
                }}
                className="capitalize"
              >
                {THEMES.map((t) => (
                  <MenuItem key={t} value={t} className="capitalize">
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormLabel>Font size: `{fontSize}px`</FormLabel>
            <Slider
              defaultValue={fontSize}
              step={1}
              min={6}
              max={36}
              marks
              onChange={(_, value: number) => updateFontSize(value)}
              valueLabelDisplay="auto"
              aria-labelledby="update-font-size"
              aria-label="Update Font Size"
            />
            <FormLabel>Minimum tab width: `{tabWidth}rem`</FormLabel>
            <Slider
              defaultValue={tabWidth}
              step={1}
              min={15}
              max={50}
              marks
              onChange={(_, value: number) => updateTabWidth(value)}
              valueLabelDisplay="auto"
              aria-labelledby="update-tab-width"
              aria-label="Update Tab Width"
            />
            <FormControlLabel
              label="Mark duplicate tabs"
              control={
                <Switch
                  color="primary"
                  checked={highlightDuplicatedTab}
                  onChange={toggleHighlightDuplicatedTab}
                />
              }
            />
            <FormControlLabel
              label="Show tab icons"
              control={
                <Switch
                  color="primary"
                  checked={showTabIcon}
                  onChange={toggleShowTabIcon}
                />
              }
            />
            <FormControlLabel
              label="Show URLs"
              control={
                <Switch
                  color="primary"
                  checked={showUrl}
                  onChange={toggleShowUrl}
                />
              }
            />
            <FormControlLabel
              label="Show tab tooltips"
              control={
                <Switch
                  color="primary"
                  checked={showTabTooltip}
                  onChange={toggleShowTabTooltip}
                />
              }
            />
          </SettingsSection>
          <Divider />
          <SettingsSection
            title="Behavior"
            description="Choose what stays visible and how the extension behaves in compact mode."
          >
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
          </SettingsSection>
        </FormControl>
        <Divider />
        <div className="flex justify-end">
          <div className="text-sm text-right opacity-75">
            v{browser.runtime.getManifest().version}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
