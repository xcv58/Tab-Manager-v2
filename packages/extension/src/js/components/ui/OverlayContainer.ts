import { createContext } from 'react'

// Interactive portals belong to the nearest modal's DOM and focus scope.
export const OverlayContainerContext = createContext<HTMLElement | null>(null)
