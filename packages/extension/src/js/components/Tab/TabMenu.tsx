import { canMoveTabs } from 'libs/browserCapabilities'
import React from 'react'
import { observer } from 'mobx-react-lite'
import Menu, { MenuItem, MenuDivider, MenuSection } from 'components/ui/Menu'
import {
  CloseIcon,
  DeleteSweepIcon,
  MoreVertIcon,
  OpenInNewIcon,
  RefreshIcon,
} from 'icons/materialIcons'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseOtherTabsIcon,
  PinTabIcon,
  UngroupTabIcon,
} from 'icons/actionIcons'
import {
  LinkIcon,
  TitleIcon,
  TextDocumentIcon,
  UnpinIcon,
} from 'icons/paletteIcons'
import { getNoun } from 'libs'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import ControlIconButton from 'components/ControlIconButton'
import { TabProps } from 'components/types'
import { useActionMenu } from 'components/hooks/useActionMenu'
import MoveShortcut from 'components/Shortcut/MoveShortcut'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'
import { getTabMoveAriaShortcut } from 'libs/tabMoveShortcuts'
import CommandPaletteIcon from 'components/CommandPaletteIcon'

export default observer(
  (props: TabProps & { menuKey?: string; hideTrigger?: boolean }) => {
    const theme = useAppTheme()
    const { tabGroupStore, tabStore, dragStore, actionStore, shortcutStore } =
      useStore()
    const { tab } = props
    const menu = useActionMenu(props.menuKey || `tab-${tab.id}`, tab)
    const { win, pinned, duplicatedTabCount, sameDomainTabs } = tab
    const selectedCount = tabStore.selection.size
    const otherCount = Math.max(0, (win?.tabs?.length ?? 1) - 1)
    const hasTabGroupsApi = !!tabGroupStore?.hasTabGroupsApi?.()
    const canMutateTabGroups = !!tabGroupStore?.canMutateGroups?.()
    const tabGroup = hasTabGroupsApi
      ? tabGroupStore.getTabGroup(tab.groupId)
      : null
    const moveDisabled =
      dragStore.pendingWindowEdgeDrop ||
      !selectedCount ||
      tabStore.selection.has(tab.id) ||
      Boolean(getTabMoveDestinationHint(win, tabStore.selection.values()))
    const closeMenu = menu.onClose
    const run = (action: () => void | Promise<void>) => () => {
      closeMenu()
      void Promise.resolve()
        .then(action)
        .catch(() =>
          shortcutStore.showMoveHint(
            'Could not complete this action. Please try again.',
          ),
        )
    }
    const danger = {
      color:
        theme.mode === 'dark'
          ? theme.palette.danger.hoverColor
          : theme.palette.danger.activeColor,
    }
    const moveScope = selectedCount
      ? `${selectedCount} selected ${getNoun('tab', selectedCount)}`
      : 'selected tabs'

    if (actionStore.liteMode) {
      return (
        <Menu
          {...menu}
          data-testid={`${props.menuKey || `tab-${tab.id}`}-actions-menu`}
        >
          {menu.open &&
            actionStore
              .getLiteCommands(tab)
              .filter(
                (command) =>
                  command.section === 'This tab' ||
                  command.id === 'open-full-mode',
              )
              .map((command) => (
                <MenuItem
                  key={command.id}
                  disabled={!!command.disabledReason}
                  aria-label={command.label}
                  onClick={() => {
                    menu.onClose()
                    void actionStore.execute(command)
                  }}
                  style={command.danger ? danger : undefined}
                >
                  <CommandPaletteIcon name={command.icon} /> {command.label}
                </MenuItem>
              ))}
        </Menu>
      )
    }

    return (
      <>
        {!props.hideTrigger && (
          <ControlIconButton
            onClick={menu.onOpen}
            tabIndex={props.disableSequentialFocus ? -1 : undefined}
            controlSize="compact"
            aria-label="Tab actions"
            aria-haspopup="menu"
            aria-expanded={menu.open}
            data-testid={`tab-menu-${tab.id}`}
          >
            <MoreVertIcon fontSize={16} />
          </ControlIconButton>
        )}
        <Menu
          {...menu}
          data-testid={`${props.menuKey || `tab-${tab.id}`}-actions-menu`}
          style={{
            zIndex: theme.zIndex.tooltip + 1,
            minWidth: 260,
          }}
        >
          <MenuSection>This tab</MenuSection>
          <MenuItem onClick={run(tab.reload)}>
            <RefreshIcon fontSize={18} /> Reload tab
          </MenuItem>
          <MenuItem onClick={run(() => actionStore.copyTabUrl(tab))}>
            <LinkIcon fontSize={18} /> Copy URL
          </MenuItem>
          <MenuItem onClick={run(() => actionStore.copyTabTitle(tab))}>
            <TitleIcon fontSize={18} /> Copy title
          </MenuItem>
          <MenuItem onClick={run(() => actionStore.copyTabTitleAndUrl(tab))}>
            <TextDocumentIcon fontSize={18} /> Copy title and URL
          </MenuItem>
          {canMoveTabs && (
            <MenuItem
              disabled={dragStore.pendingWindowEdgeDrop}
              onClick={run(() => actionStore.moveTabToNewWindow(tab))}
            >
              <OpenInNewIcon fontSize={18} /> Move to a new window
            </MenuItem>
          )}
          <MenuItem onClick={run(tab.togglePin)}>
            {pinned ? (
              <UnpinIcon fontSize={18} />
            ) : (
              <PinTabIcon fontSize={18} />
            )}{' '}
            {pinned ? 'Unpin tab' : 'Pin tab'}
          </MenuItem>
          {canMutateTabGroups && tabGroup && (
            <MenuItem
              data-testid={`tab-menu-option-${tab.id}-remove-this-tab-from-group`}
              onClick={run(() => tabGroupStore.ungroupTab(tab.id))}
            >
              <UngroupTabIcon fontSize={18} />
              <span className="min-w-0">
                Remove from {tabGroup.title || 'group'}
              </span>
            </MenuItem>
          )}
          {canMoveTabs && sameDomainTabs?.length > 1 && (
            <MenuItem onClick={run(tab.groupTab)}>
              <OpenInNewIcon fontSize={18} /> Bring {sameDomainTabs.length}{' '}
              ungrouped tabs from this site here
            </MenuItem>
          )}
          {canMoveTabs && (
            <>
              <MenuDivider />
              <MenuSection>Move {moveScope} here</MenuSection>
              <MenuItem
                disabled={moveDisabled}
                onClick={() => void actionStore.moveToTab(tab, true)}
                aria-label={`Move ${moveScope} before this tab`}
                aria-keyshortcuts={getTabMoveAriaShortcut('before')}
                data-testid={`tab-menu-option-${tab.id}-move-selected-before-this-tab`}
              >
                <ArrowUpIcon fontSize={18} />{' '}
                <span className="flex-1">Before this tab</span>
                <MoveShortcut position="before" />
              </MenuItem>
              <MenuItem
                disabled={moveDisabled}
                onClick={() => void actionStore.moveToTab(tab, false)}
                aria-label={`Move ${moveScope} after this tab`}
                aria-keyshortcuts={getTabMoveAriaShortcut('after')}
                data-testid={`tab-menu-option-${tab.id}-move-selected-after-this-tab`}
              >
                <ArrowDownIcon fontSize={18} />{' '}
                <span className="flex-1">After this tab</span>
                <MoveShortcut position="after" />
              </MenuItem>
            </>
          )}
          {process.env.TARGET_BROWSER === 'firefox' && (
            <>
              <MenuDivider />
              <MenuSection>This container</MenuSection>
              <MenuItem onClick={run(tab.selectTabsInSameContainer)}>
                {tab.isSelected ? 'Unselect' : 'Select'} tabs in the same
                container
              </MenuItem>
              <MenuItem onClick={run(tab.openSameContainerTabs)}>
                Open same container tabs in a new window
              </MenuItem>
            </>
          )}
          <MenuDivider />
          <MenuItem
            style={danger}
            onClick={run(tab.remove)}
            data-testid={`tab-menu-option-${tab.id}-close`}
          >
            <CloseIcon fontSize={18} /> Close this tab
          </MenuItem>
          <MenuItem
            style={danger}
            disabled={!otherCount}
            onClick={run(tab.closeOtherTabs)}
            data-testid={`tab-menu-option-${tab.id}-close-other-tabs`}
          >
            <CloseOtherTabsIcon fontSize={18} /> Close other {otherCount}{' '}
            {getNoun('tab', otherCount)} in this window
          </MenuItem>
          {duplicatedTabCount > 1 && (
            <MenuItem style={danger} onClick={run(tab.closeDuplicatedTab)}>
              <DeleteSweepIcon fontSize={18} /> Close {duplicatedTabCount - 1}{' '}
              {getNoun('duplicate', duplicatedTabCount - 1)} of this tab
            </MenuItem>
          )}
        </Menu>
      </>
    )
  },
)
