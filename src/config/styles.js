/**
 * Color palette for the world and UI surfaces.
 *
 * @type {Readonly<{
 *   Wall: string
 *   WallShadow: string
 *   Floor: string
 *   FloorGrid: string
 *   FallbackSprite: string
 *   UiBackground: string
 *   UiBorder: string
 *   TextGlow: string
 *   Success: string
 *   Warning: string
 *   Danger: string
 *   Info: string
 * }>}
 */
export const Colors = Object.freeze({
  Wall: 'color(display-p3 0.227 0.361 0.475)',
  WallShadow: 'color(display-p3 0.137 0.239 0.310)',
  Floor: 'color(display-p3 0.498 0.541 0.565)',
  FloorGrid: 'color(display-p3 0.565 0.761 0.776)',
  FallbackSprite: 'color(display-p3 1 0.31 0.235)',
  UiBackground: 'rgba(12,16,22,0.9)',
  UiBorder: 'rgba(70,160,255,0.2)',
  TextGlow: 'rgba(255,255,255,0.18)',
  Success: '#2ecc71',
  Warning: '#f1c40f',
  Danger: '#e74c3c',
  Info: '#00f2ff'
})

/**
 * Font choices and CDN reference for the UI chrome.
 *
 * @type {Readonly<{
 *   Primary: string
 *   Monospace: string
 *   CdnUrl: string
 * }>}
 */
export const Fonts = Object.freeze({
  Primary: 'Orbitron, sans-serif',
  Monospace: 'JetBrains Mono, monospace',
  CdnUrl:
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap'
})

/**
 * HUD-specific constants for visual tweaks and timing.
 *
 * @type {Readonly<{
 *   gridItemDimAlpha: number
 *   healthCriticalThreshold: number
 *   healthWarningThreshold: number
 *   messageFadeDuration: number
 *   textVerticalOffset: number
 * }>}
 */
export const HudConfig = Object.freeze({
  gridItemDimAlpha: 0.2,
  healthCriticalThreshold: 0.25,
  healthWarningThreshold: 0.5,
  messageFadeDuration: 500,
  textVerticalOffset: 2
})

/**
 * Screen timing and scaling values used by the renderer and player movement.
 *
 * @type {Readonly<{
 *   TargetFrameRate: number
 *   FrameInterval: number
 *   LargeScreenThreshold: number
 *   BaseScale: number
 *   LargeScale: number
 * }>}
 */
export const ScreenConfig = Object.freeze({
  TargetFrameRate: 60,
  FrameInterval: 1000 / 60,
  LargeScreenThreshold: 1600,
  BaseScale: 1.0,
  LargeScale: 1.5
})

/**
 * Layout measurements for HUD panels, grids, and buttons.
 *
 * @type {Readonly<{
 *   sidePanelWidth: number
 *   sidePanelHeight: number
 *   outerMargin: number
 *   innerPadding: number
 *   scoreTitleY: number
 *   scoreValueY: number
 *   fragmentsY: number
 *   gridHeaderY: number
 *   gridItemStartY: number
 *   gridColumns: number
 *   gridRowHeight: number
 *   gridBaseHeight: number
 *   gridItemPadding: number
 *   memoryBarWidth: number
 *   memoryBarHeight: number
 *   memoryBarBottomMargin: number
 *   memoryBarInnerPadding: number
 *   muteButtonSize: number
 *   messageBottomMargin: number
 *   titleFontSize: number
 *   valueFontSize: number
 *   labelFontSize: number
 *   memoryFontSize: number
 *   emojiFontSize: number
 *   muteFontSize: number
 *   messageFontSize: number
 *   panelRadius: number
 *   buttonRadius: number
 * }>}
 */
export const LayoutConfig = Object.freeze({
  // Panel dimensions
  sidePanelWidth: 320,
  sidePanelHeight: 112,

  // Spacing
  outerMargin: 22,
  innerPadding: 18,

  // Score panel
  scoreTitleY: 28,
  scoreValueY: 64,
  fragmentsY: 94,

  // Collection grid
  gridHeaderY: 28,
  gridItemStartY: 60,
  gridColumns: 5,
  gridRowHeight: 40,
  gridBaseHeight: 52,
  gridItemPadding: 18,

  // Memory bar
  memoryBarWidth: 400,
  memoryBarHeight: 40,
  memoryBarBottomMargin: 60,
  memoryBarInnerPadding: 5,

  // Mute button
  muteButtonSize: 40,

  // Message
  messageBottomMargin: 100,

  // Font sizes
  titleFontSize: 18,
  valueFontSize: 16,
  labelFontSize: 12,
  memoryFontSize: 14,
  emojiFontSize: 22,
  muteFontSize: 20,
  messageFontSize: 28,

  // Border radius
  panelRadius: 12,
  buttonRadius: 8
})

/** Aggregates UI-facing constants to simplify consumer imports. */
export const UIConfig = Object.freeze({
  Screen: ScreenConfig,
  Layout: LayoutConfig,
  Fonts,
  Colors
})
