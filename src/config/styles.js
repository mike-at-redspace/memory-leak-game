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
  Wall: 'color(display-p3 0.82 0.84 0.86)', // Light grey partition fabric
  WallShadow: 'color(display-p3 0.61 0.64 0.67)', // Darker grey frame/shadow
  Floor: 'color(display-p3 0.25 0.29 0.35)', // Dark blue-grey carpet
  FloorGrid: 'color(display-p3 0.30 0.35 0.42)', // Slightly lighter carpet pattern
  FallbackSprite: 'color(display-p3 1 0.31 0.235)',
  UiBackground: 'rgba(12,16,22,0.9)',
  UiBorder: 'rgba(70,160,255,0.2)',
  TextGlow: 'rgba(255,255,255,0.18)',
  Success: '#2ecc71',
  Warning: '#f1c40f',
  Danger: '#e74c3c',
  Info: '#00f2ff',
  ItemFill: '#ffffff'
})

export const ItemOutlineColors = Object.freeze({
  hazard: Colors.Danger,
  heal: Colors.Success,
  slow: Colors.Warning,
  boost: Colors.Info
})

export const LevelThemes = [
  // Level 1: The Cloud
  {
    Wall: 'color(display-p3 0.97 0.98 1.00)', // Soft White P3 (Base)
    WallShadow: 'color(display-p3 0.75 0.78 0.80)', // Light gray
    Floor: 'color(display-p3 0.50 0.70 0.85)', // Medium sky blue
    FloorGrid: 'color(display-p3 0.25 0.75 1.00)' // Sky Blue P3 (Accent)
  },
  // Level 2: Startup
  {
    Wall: 'color(display-p3 0.05 0.60 0.55)', // Deep Teal P3 (Base)
    WallShadow: 'color(display-p3 0.03 0.35 0.33)', // Darker teal
    Floor: 'color(display-p3 0.02 0.15 0.20)', // Very dark teal
    FloorGrid: 'color(display-p3 0.15 0.85 0.95)' // Electric Cyan P3 (Accent)
  },
  // Level 3: Executive
  {
    Wall: 'color(display-p3 0.35 0.10 0.05)', // Mahogany P3 (Base)
    WallShadow: 'color(display-p3 0.20 0.06 0.03)', // Darker mahogany
    Floor: 'color(display-p3 0.10 0.28 0.18)', // Darker emerald
    FloorGrid: 'color(display-p3 0.20 0.55 0.35)' // Emerald P3 (Accent)
  },
  // Level 4: Server Room
  {
    Wall: 'color(display-p3 0.03 0.05 0.08)', // Cold Near-Black P3 (Base)
    WallShadow: 'color(display-p3 0.01 0.02 0.04)', // Near black
    Floor: 'color(display-p3 0.02 0.03 0.05)', // Slightly lighter near-black
    FloorGrid: 'color(display-p3 0.10 0.95 0.40)' // Neon Green P3 (Accent)
  },
  // Level 5: Standard Office
  {
    Wall: 'color(display-p3 0.42 0.45 0.48)', // Slate Gray P3 (Base)
    WallShadow: 'color(display-p3 0.25 0.27 0.29)', // Darker slate
    Floor: 'color(display-p3 0.12 0.25 0.48)', // Darker corporate blue
    FloorGrid: 'color(display-p3 0.22 0.50 0.95)' // Corporate Blue P3 (Accent)
  }
]

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
 *   gridPulseDuration: number
 *   gridPulseMaxScale: number
 *   gridPulseAlphaBoost: number
 * }>}
 */
export const HudConfig = Object.freeze({
  gridItemDimAlpha: 0.2,
  healthCriticalThreshold: 0.25,
  healthWarningThreshold: 0.5,
  messageFadeDuration: 900,
  textVerticalOffset: 2,
  gridPulseDuration: 450,
  gridPulseMaxScale: 0.55,
  gridPulseAlphaBoost: 0.35
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
  LargeScreenThreshold: 1920,
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
  sidePanelWidth: 240,
  sidePanelHeight: 112,

  // Spacing
  outerMargin: 16,
  innerPadding: 12,

  // Score panel
  scoreTitleY: 28,
  scoreValueY: 64,
  fragmentsY: 94,

  // Collection grid
  gridHeaderY: 28,
  gridItemStartY: 60,
  gridColumns: 4,
  gridRowHeight: 38,
  gridBaseHeight: 48,
  gridItemPadding: 12,

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

/**
 * Player visual effects configuration for trails, arrows, and transitions.
 *
 * @type {Readonly<{
 *   PositionHistory: { MaxLength: number; Step: number }
 *   BoostTransition: {
 *     FadeInDuration: number
 *     FadeOutDuration: number
 *     IntensityThreshold: number
 *   }
 *   SlowTransition: { FadeOutDuration: number; IntensityThreshold: number }
 *   SlowTrail: { ShadowColor: string }
 *   BoostTrail: {
 *     ShadowBlur: number
 *     ShadowColor: string
 *     GhostCount: number
 *     AlphaBase: number
 *     ForwardDistance: number
 *     ForwardVelMultiplier: number
 *   }
 *   Arrows: {
 *     BaseSizeMultiplier: number
 *     BoostColor: string
 *     SlowColor: string
 *     BoostPulseSpeed: number
 *     SlowPulseSpeed: number
 *     PulseAmplitude: number
 *     Count: number
 *     PhaseSpeed: number
 *     PhaseIncrement: number
 *     PhaseRange: number
 *     YStartMultiplier: number
 *     YEndMultiplier: number
 *     XSpreadMultiplier: number
 *     AlphaPower: number
 *     AlphaMultiplier: number
 *     IntensityThreshold: number
 *   }
 * }>}
 */
export const PlayerVisualConfig = Object.freeze({
  PositionHistory: {
    MaxLength: 12,
    Step: 1
  },
  BoostTransition: {
    FadeInDuration: 1.2,
    FadeOutDuration: 0.7,
    IntensityThreshold: 0.05
  },
  SlowTransition: {
    FadeOutDuration: 0.8,
    IntensityThreshold: 0.05
  },
  SlowTrail: {
    ShadowColor: 'color(display-p3 1 0.5 0.5)'
  },
  BoostTrail: {
    ShadowBlur: 32,
    ShadowColor: 'rbga(255, 255, 255, 0.75)',
    GhostCount: 4,
    AlphaBase: 0.125,
    ForwardDistance: 0.095,
    ForwardVelMultiplier: 0.095
  },
  Arrows: {
    BaseSizeMultiplier: 0.18,
    BoostColor: 'color(display-p3 0 1 0)',
    SlowColor: 'color(display-p3 1 0 0)',
    BoostPulseSpeed: 2,
    SlowPulseSpeed: 1,
    PulseAmplitude: 2,
    Count: 3,
    PhaseSpeed: 2.5,
    PhaseIncrement: 1.2,
    PhaseRange: 1.6,
    YStartMultiplier: -0.75,
    YEndMultiplier: -0.2,
    XSpreadMultiplier: 0.12,
    AlphaPower: 1.3,
    AlphaMultiplier: 0.9,
    IntensityThreshold: 0.02
  }
})

/** Aggregates UI-facing constants to simplify consumer imports. */
export const UIConfig = Object.freeze({
  Screen: ScreenConfig,
  Layout: LayoutConfig,
  Fonts,
  Colors
})
