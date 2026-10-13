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
  CopyTextIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CloseOtherTabsIcon,
  PinTabIcon,
  UngroupTabIcon,
} from 'icons/actionIcons'
import { getNoun } from 'libs'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import ControlIconButton from 'components/ControlIconButton'
import { TabProps } from 'components/types'
import { useActionMenu } from 'components/hooks/useActionMenu'
import MoveShortcut from 'components/Shortcut/MoveShortcut'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'
import { getTabMoveAriaShortcut } from 'libs/tabMoveShortcuts'

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
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          <MenuSection>This tab</MenuSection>
          <MenuItem onClick={run(tab.reload)}>
            <RefreshIcon fontSize={18} /> Reload tab
          </MenuItem>
          <MenuItem onClick={run(() => actionStore.copyTabUrl(tab))}>
            <CopyTextIcon fontSize={18} /> Copy URL
          </MenuItem>
          <MenuItem
            disabled={dragStore.pendingWindowEdgeDrop}
            onClick={run(() => actionStore.moveTabToNewWindow(tab))}
          >
            <OpenInNewIcon fontSize={18} /> Move to a new window
          </MenuItem>
          <MenuItem onClick={run(tab.togglePin)}>
            <PinTabIcon fontSize={18} /> {pinned ? 'Unpin tab' : 'Pin tab'}
          </MenuItem>
          {canMutateTabGroups && tabGroup && (
            <MenuItem
              data-testid={`tab-menu-option-${tab.id}-remove-this-tab-from-group`}
              onClick={run(() => tabGroupStore.ungroupTab(tab.id))}
            >
              <UngroupTabIcon fontSize={18} /> Remove from{' '}
              {tabGroup.title || 'group'}
            </MenuItem>
          )}
          {sameDomainTabs?.length > 1 && (
            <MenuItem onClick={run(tab.groupTab)}>
              <OpenInNewIcon fontSize={18} /> Bring {sameDomainTabs.length}{' '}
              ungrouped tabs from this site here
            </MenuItem>
          )}
          <MenuDivider />
          <MenuSection>Move {moveScope} here</MenuSection>
          <MenuItem
            disabled={moveDisabled}
            onClick={run(() =>
              dragStore.moveSelectedTabsRelativeToTab(tab, true),
            )}
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
            onClick={run(() =>
              dragStore.moveSelectedTabsRelativeToTab(tab, false),
            )}
            aria-label={`Move ${moveScope} after this tab`}
            aria-keyshortcuts={getTabMoveAriaShortcut('after')}
            data-testid={`tab-menu-option-${tab.id}-move-selected-after-this-tab`}
          >
            <ArrowDownIcon fontSize={18} />{' '}
            <span className="flex-1">After this tab</span>
            <MoveShortcut position="after" />
          </MenuItem>
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
