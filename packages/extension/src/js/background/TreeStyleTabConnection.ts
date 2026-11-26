import { browser } from 'libs'
import log from 'libs/log'
import {
  TREE_STYLE_TAB_PORT,
  TST_ID,
  type TreeConnectionUpdate,
} from 'libs/treeStyleTab'

const treeEvents = [
  'tree-attached',
  'tree-detached',
  'tree-collapsed-state-changed',
  'permissions-changed',
]

export default class TreeStyleTabConnection {
  private ports = new Set<chrome.runtime.Port>()

  private connected = false

  private connectionVersion = 0

  private pendingCheck = false

  private operation = Promise.resolve()

  constructor() {
    browser.runtime.onConnect.addListener(this.onConnect)
    browser.runtime.onMessageExternal.addListener(this.onExternalMessage)
  }

  private onConnect = (port: chrome.runtime.Port) => {
    if (port.name !== TREE_STYLE_TAB_PORT) return
    this.ports.add(port)
    port.onMessage.addListener((message) => {
      if (message === 'check') this.check()
    })
    port.onDisconnect.addListener(() => {
      this.ports.delete(port)
      if (!this.ports.size) this.check()
    })
    this.check()
  }

  private onExternalMessage = (
    message: { type?: string },
    sender: chrome.runtime.MessageSender,
  ) => {
    if (sender.id !== TST_ID || !message) return
    if (message.type === 'ready') {
      // TST lost its registrations when it restarted.
      this.connectionVersion++
      this.setConnected(false)
      if (this.ports.size) this.check()
    } else if (treeEvents.includes(message.type)) {
      this.broadcast({ type: 'refresh' })
    }
  }

  private broadcast = (message: TreeConnectionUpdate) => {
    for (const port of this.ports) {
      try {
        port.postMessage(message)
      } catch {
        // A view can close before its disconnect event arrives.
      }
    }
  }

  private setConnected = (connected: boolean) => {
    if (connected !== this.connected) this.connectionVersion++
    this.connected = connected
    this.broadcast({ type: 'status', connected })
  }

  private check = () => {
    if (this.pendingCheck) return
    this.pendingCheck = true
    // Serialize registration and unregistration as views open and close.
    this.operation = this.operation.then(async () => {
      this.pendingCheck = false
      try {
        await this.updateConnection()
      } catch (error) {
        this.setConnected(false)
        log.debug('Tree Style Tab connection failed', error)
      }
    })
  }

  private updateConnection = async () => {
    if (!this.ports.size) {
      if (this.connected) {
        this.setConnected(false)
        await browser.runtime.sendMessage(TST_ID, { type: 'unregister-self' })
      }
      return
    }
    if (this.connected) {
      const alive = await browser.runtime
        .sendMessage(TST_ID, { type: 'ping' })
        .catch((): undefined => undefined)
      if (this.connected && alive === true) {
        this.setConnected(true)
        return
      }
      this.setConnected(false)
    }

    const versionBeforeRegistration = this.connectionVersion
    const { name, icons } = browser.runtime.getManifest()
    const reply = await browser.runtime.sendMessage(TST_ID, {
      type: 'register-self',
      name,
      icons,
      lightTree: true,
      listeningTypes: ['ready', ...treeEvents],
    })
    if (versionBeforeRegistration !== this.connectionVersion) return
    // TST can receive a message without answering when its API is disabled.
    if (!reply || !Array.isArray(reply.grantedPermissions)) {
      this.setConnected(false)
      return
    }
    this.setConnected(true)
    const version = this.connectionVersion
    const onShutdown = () => {
      if (version === this.connectionVersion) this.setConnected(false)
    }
    void browser.runtime
      .sendMessage(TST_ID, { type: 'wait-for-shutdown' })
      .then(onShutdown, onShutdown)
  }
}
