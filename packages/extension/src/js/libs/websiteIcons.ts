import browser from 'webextension-polyfill'

// Implemented only by Safari and its isolated website-icon demo scenario.
export type WebsiteIcons = {
  isDemo?: boolean
  hasAccess: (urls: string[]) => Promise<boolean>
  requestAccess: (urls: string[]) => Promise<boolean>
  resolve: (
    tabId: number,
    url: string,
    signal?: AbortSignal,
  ) => Promise<string | null>
  waitForCapacity?: (signal: AbortSignal) => Promise<void>
  subscribe: (listener: (tabId?: number) => void) => () => void
}
export const websiteIcons: WebsiteIcons | undefined = (browser as any)
  .websiteIcons
