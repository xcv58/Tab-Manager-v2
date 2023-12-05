import React from 'react'
import { observer } from 'mobx-react-lite'
import { browser } from 'libs'
import {
  Dialog,
  DialogHeader,
  DialogBody,
  Switch,
} from '@material-tailwind/react'
import CloseButton from 'components/CloseButton'
import Divider from '@mui/material/Divider'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
// import Switch from '@mui/material/Switch'
import { useStore } from 'components/hooks/useStore'
import Slider from '@mui/material/Slider'
import FormLabel from '@mui/material/FormLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { THEMES } from 'stores/UserStore'
import SponsorButton from './SponsorButton'
import FeedbackButton from './FeedbackButton'

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
    ignoreHash,
    toggleIgnoreHash,
  } = userStore
  return (
    <Dialog open={dialogOpen} handler={closeDialog}>
      <DialogHeader>
        <div className="flex justify-between w-full">
          <div className="flex justify-between">
            Settings{' '}
            <div>
              <SponsorButton />
              <FeedbackButton />
            </div>
          </div>
          <CloseButton onClick={closeDialog} />
        </div>
      </DialogHeader>
      <DialogBody>
        <FormControl className="w-full">
          <FormGroup>
            <FormHelperText>Search</FormHelperText>
            <FormControlLabel
              label="Preserve Search"
              control={
                <Switch
                  color="blue"
                  checked={preserveSearch}
                  onChange={togglePreserveSearch}
                />
              }
            />
            <FormControlLabel
              label="Search Browser History"
              control={
                <Switch
                  color="blue"
                  checked={searchHistory}
                  onChange={toggleSearchHistory}
                />
              }
            />
            <FormControlLabel
              label="Auto Focus Search Box"
              control={
                <Switch
                  color="blue"
                  checked={autoFocusSearch}
                  onChange={toggleAutoFocusSearch}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Views</FormHelperText>
            <FormControlLabel
              label="Highlight Duplicated Tabs"
              control={
                <Switch
                  color="blue"
                  checked={highlightDuplicatedTab}
                  onChange={toggleHighlightDuplicatedTab}
                />
              }
            />
            <FormControlLabel
              label="Ignore Hash in URL when count duplication"
              control={
                <Switch
                  color="blue"
                  checked={ignoreHash}
                  onChange={toggleIgnoreHash}
                />
              }
            />
            <FormControlLabel
              label="Show Unmatched Tab"
              control={
                <Switch
                  color="blue"
                  checked={showUnmatchedTab}
                  onChange={toggleShowUnmatchedTab}
                />
              }
            />
            <FormLabel>Minimum Tab Width: `{tabWidth}rem`</FormLabel>
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
            <FormLabel>Font Size: `{fontSize}px`</FormLabel>
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
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Individual Tab</FormHelperText>
            <FormControlLabel
              label="Show Tab Icon"
              control={
                <Switch
                  color="blue"
                  checked={showTabIcon}
                  onChange={toggleShowTabIcon}
                />
              }
            />
            <FormControlLabel
              label="Show URL"
              control={
                <Switch
                  color="blue"
                  checked={showUrl}
                  onChange={toggleShowUrl}
                />
              }
            />
            <FormControlLabel
              label="Show Tab Tooltip"
              control={
                <Switch
                  color="blue"
                  checked={showTabTooltip}
                  onChange={toggleShowTabTooltip}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Filter</FormHelperText>
            <FormControlLabel
              label="Show App Window"
              control={
                <Switch
                  color="blue"
                  checked={showAppWindow}
                  onChange={toggleShowAppWindow}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Others</FormHelperText>
            <FormControlLabel
              label="Lite Popup Mode"
              control={
                <Switch
                  color="blue"
                  checked={litePopupMode}
                  onChange={toggleLitePopupMode}
                />
              }
            />
            <FormControlLabel
              label="Show Shortcut Hint"
              control={
                <Switch
                  color="blue"
                  checked={showShortcutHint}
                  onChange={toggleShowShortcutHint}
                />
              }
            />
            <FormControlLabel
              label="Always Show Toolbar"
              aria-labelledby="toggle-always-show-toolbar"
              aria-label="Toggle Always Show Toolbar"
              control={
                <Switch
                  color="blue"
                  checked={!toolbarAutoHide}
                  onChange={toggleAutoHide}
                />
              }
            />
            <FormControl variant="standard">
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
          </FormGroup>
        </FormControl>
        <Divider />
        <div className="flex justify-end">
          <div className="text-sm text-right opacity-75">
            v{browser.runtime.getManifest().version}
          </div>
        </div>
      </DialogBody>
    </Dialog>
  )
})
