import React from 'react'
import { findLastVisibleOrLastTab, findFirstVisibleOrFirstTab } from './index'

export const ItemTypes = {
  TAB: 'tab',
}

export const getTargetTab = (tabs, begin) => {
  if (begin) {
    return findFirstVisibleOrFirstTab(tabs)
  }
  return findLastVisibleOrLastTab(tabs)
}

/**
 * Conditional react-dnd exports for Safari compatibility
 * Safari doesn't support tabs.move(), so drag-and-drop is disabled
 */

const IS_SAFARI = process.env.IS_SAFARI === 'true'

// Safari: No-op implementations
const useDragNoOp = () => [{ isDragging: false }, () => {}, () => {}] as const

const useDropNoOp = () => [{ isOver: false, canDrop: false }, () => {}] as const

const DndProviderNoOp = ({ children }: { children: React.ReactNode }) =>
  children

const useDragLayerNoOp = () => ({
  isDragging: false,
  item: null,
  itemType: null,
  currentOffset: null,
})

const HTML5BackendNoOp = null
const getEmptyImageNoOp = () => null

// Chrome/Firefox: Real react-dnd (imported conditionally to exclude from Safari bundle)
let useDragReal: any
let useDropReal: any
let DndProviderReal: any
let useDragLayerReal: any
let HTML5BackendReal: any
let getEmptyImageReal: any

if (!IS_SAFARI) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reactDnd = require('react-dnd')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reactDndHtml5 = require('react-dnd-html5-backend')

  useDragReal = reactDnd.useDrag
  useDropReal = reactDnd.useDrop
  DndProviderReal = reactDnd.DndProvider
  useDragLayerReal = reactDnd.useDragLayer
  HTML5BackendReal = reactDndHtml5.HTML5Backend
  getEmptyImageReal = reactDndHtml5.getEmptyImage
}

// Export the appropriate version based on browser
export const useDrag = IS_SAFARI ? useDragNoOp : useDragReal
export const useDrop = IS_SAFARI ? useDropNoOp : useDropReal
export const DndProvider = IS_SAFARI ? DndProviderNoOp : DndProviderReal
export const useDragLayer = IS_SAFARI ? useDragLayerNoOp : useDragLayerReal
export const HTML5Backend = IS_SAFARI ? HTML5BackendNoOp : HTML5BackendReal
export const getEmptyImage = IS_SAFARI ? getEmptyImageNoOp : getEmptyImageReal
