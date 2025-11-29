import {
  LayoutConfig,
  Colors,
  Fonts,
  StatsConfig,
  HudConfig,
  TARGET_ITEMS
} from '../../config/index.js'

/**
 * Manages the rendering of the Heads-Up Display (HUD) overlay. Handles the
 * Score Panel, Inventory Grid, Health/RAM Bar, and Status Messages.
 */
export class HudRenderer {
  /**
   * Initializes the HUD renderer with context and configuration.
   *
   * @param {CanvasRenderingContext2D} ctx
   * - The 2D rendering context.
   * @param {Object} [options={}]
   * - Optional configuration overrides. Default is `{}`
   * @param {Object} [options.layout=LayoutConfig]
   * - Layout dimensions and margins. Default is `LayoutConfig`
   * @param {Object} [options.colors=Colors]
   * - Color palette. Default is `Colors`
   * @param {Object} [options.fonts=Fonts]
   * - Font definitions. Default is `Fonts`
   */
  constructor(
    ctx,
    { layout = LayoutConfig, colors = Colors, fonts = Fonts } = {}
  ) {
    this._ctx = ctx
    this._layout = layout
    this._colors = colors
    this._fonts = fonts
    this._targetItems = TARGET_ITEMS

    // State for hit-testing interactive elements
    this._muteButtonRect = { x: 0, y: 0, w: 0, h: 0 }
  }

  /**
   * Main render loop for the HUD. Orchestrates drawing of all sub-components.
   *
   * @param {Object}  stats    - Current game statistics (score, health, etc.).
   * @param {Object}  hud      - Transient HUD state (messages, timers).
   * @param {boolean} isMuted  - Audio mute state.
   * @param {number}  width    - Current canvas width.
   * @param {number}  height   - Current canvas height.
   * @param {number}  scale    - UI scaling factor based on screen size.
   * @param {number}  level    - Current level number.
   * @returns {void}
   */
  render(stats, hud, isMuted, width, height, scale, level = 1) {
    this._drawScorePanel(stats, scale, level)
    this._drawInventoryPanel(hud, width, scale)
    this._drawMemoryBar(stats.playerHealth, width, height, scale)
    this._drawMuteButton(isMuted, height, scale)

    if (hud.messageTimer > 0) {
      this._drawStatusMessage(hud, width, height, scale)
    }
  }

  /**
   * Renders the top-left status panel (Score, Fragments & Level).
   *
   * @access private
   */
  _drawScorePanel(stats, scale, level) {
    const layout = this._layout
    // Increase panel height slightly to accommodate level display
    const panel = {
      x: layout.outerMargin,
      y: layout.outerMargin,
      w: layout.sidePanelWidth * scale,
      h: (layout.sidePanelHeight + 30) * scale
    }

    this._drawRoundedRect(
      panel.x,
      panel.y,
      panel.w,
      panel.h,
      layout.panelRadius,
      this._colors.UiBackground,
      this._colors.UiBorder
    )

    // Title
    this._ctx.fillStyle = this._colors.Success
    this._ctx.font = `bold ${layout.titleFontSize * scale}px ${this._fonts.Primary}`
    this._ctx.textAlign = 'left'
    this._ctx.textBaseline = 'middle'
    this._ctx.fillText(
      'SYSTEM STATUS',
      panel.x + layout.innerPadding * scale,
      panel.y + layout.scoreTitleY * scale
    )

    // Values
    this._ctx.fillStyle = '#fff'
    this._ctx.font = `700 ${layout.valueFontSize * scale}px ${this._fonts.Monospace}`
    this._ctx.textAlign = 'right'

    const rightEdge = panel.x + panel.w - layout.innerPadding * scale
    const levelY = panel.y + layout.fragmentsY * scale + 30 * scale

    this._ctx.fillText(
      stats.score,
      rightEdge,
      panel.y + layout.scoreValueY * scale
    )
    this._ctx.fillText(
      `${stats.uniqueFound}/${this._targetItems.length}`,
      rightEdge,
      panel.y + layout.fragmentsY * scale
    )
    this._ctx.fillText(`LEVEL ${level}`, rightEdge, levelY)

    // Labels
    this._ctx.fillStyle = '#ccc'
    this._ctx.font = `400 ${layout.labelFontSize * scale}px ${this._fonts.Monospace}`
    this._ctx.textAlign = 'left'

    const leftEdge = panel.x + layout.innerPadding * scale

    this._ctx.fillText('SCORE', leftEdge, panel.y + layout.scoreValueY * scale)
    this._ctx.fillText(
      'FRAGMENTS',
      leftEdge,
      panel.y + layout.fragmentsY * scale
    )
    this._ctx.fillText('LEVEL', leftEdge, levelY)
  }

  /**
   * Renders the top-right inventory grid (Cache Dump).
   *
   * @access private
   */
  _drawInventoryPanel(hud, canvasWidth, scale) {
    const layout = this._layout
    const gridRows = Math.ceil(this._targetItems.length / layout.gridColumns)

    const panel = {
      w: layout.sidePanelWidth * scale,
      h: layout.gridBaseHeight * scale + gridRows * layout.gridRowHeight * scale
    }
    panel.x = canvasWidth - panel.w - layout.outerMargin
    panel.y = layout.outerMargin

    this._drawRoundedRect(
      panel.x,
      panel.y,
      panel.w,
      panel.h,
      layout.panelRadius,
      this._colors.UiBackground,
      this._colors.UiBorder
    )

    // Title
    this._ctx.fillStyle = this._colors.Danger
    this._ctx.font = `bold ${layout.titleFontSize * scale}px ${this._fonts.Primary}`
    this._ctx.textAlign = 'left'
    this._ctx.fillText(
      'CACHE DUMP',
      panel.x + layout.gridItemPadding * scale,
      panel.y + layout.gridHeaderY * scale
    )

    // Grid Items
    const cellWidth =
      (panel.w - layout.gridItemPadding * 2 * scale) / layout.gridColumns
    const pulseTimers = hud.collectedPulseTimers
    const pulseDuration = HudConfig.gridPulseDuration
    this._ctx.font = `${layout.emojiFontSize * scale}px sans-serif`
    this._ctx.textAlign = 'center'
    this._ctx.fillStyle = Colors.ItemFill

    this._targetItems.forEach((item, i) => {
      const col = i % layout.gridColumns
      const row = Math.floor(i / layout.gridColumns)

      const px =
        panel.x +
        layout.gridItemPadding * scale +
        col * cellWidth +
        cellWidth / 2
      const py =
        panel.y +
        layout.gridItemStartY * scale +
        row * layout.gridRowHeight * scale

      const isCollected = hud.collectedIds.has(item.id)
      const pulseRemaining = pulseTimers?.get(item.id) ?? 0
      const isPulsing = isCollected && pulseDuration > 0 && pulseRemaining > 0
      const pulseProgress = isPulsing
        ? Math.max(0, Math.min(1, 1 - pulseRemaining / pulseDuration))
        : 0
      const easedPulse = isPulsing ? Math.sin(pulseProgress * Math.PI) : 0
      const baseAlpha = isCollected ? 1 : HudConfig.gridItemDimAlpha
      const scaleFactor = isPulsing
        ? 1 + HudConfig.gridPulseMaxScale * easedPulse
        : 1
      const targetAlpha = isPulsing
        ? Math.min(1, baseAlpha + HudConfig.gridPulseAlphaBoost * easedPulse)
        : baseAlpha

      this._ctx.save()
      if (!isCollected) {
        this._ctx.filter = 'grayscale(100%)'
      }

      if (isPulsing) {
        this._ctx.translate(px, py)
        this._ctx.scale(scaleFactor, scaleFactor)
        this._ctx.translate(-px, -py)
      }

      this._ctx.globalAlpha = isPulsing ? targetAlpha : baseAlpha
      this._ctx.fillText(item.emoji, px, py)
      this._ctx.restore()
    })
  }

  /**
   * Renders the bottom-center Health/RAM bar.
   *
   * @access private
   */
  _drawMemoryBar(health, canvasWidth, canvasHeight, scale) {
    const layout = this._layout
    const bar = {
      w: layout.memoryBarWidth * scale,
      h: layout.memoryBarHeight * scale
    }
    bar.x = (canvasWidth - bar.w) / 2
    bar.y = canvasHeight - layout.memoryBarBottomMargin * scale

    // Background container
    this._drawRoundedRect(
      bar.x,
      bar.y,
      bar.w,
      bar.h,
      layout.buttonRadius,
      this._colors.UiBackground,
      this._colors.UiBorder
    )

    // Calculate Fill
    const healthPercent = Math.max(0, health / StatsConfig.MaxHealth)
    let barColor = this._colors.Success

    if (healthPercent < HudConfig.healthCriticalThreshold) {
      barColor = this._colors.Danger
    } else if (healthPercent < HudConfig.healthWarningThreshold) {
      barColor = this._colors.Warning
    }

    const padding = layout.memoryBarInnerPadding
    this._ctx.fillStyle = barColor
    this._ctx.fillRect(
      bar.x + padding,
      bar.y + padding,
      (bar.w - padding * 2) * healthPercent,
      bar.h - padding * 2
    )

    // Text Label
    this._ctx.fillStyle = '#fff'
    this._ctx.font = `700 ${layout.memoryFontSize * scale}px ${this._fonts.Monospace}`
    this._ctx.textAlign = 'center'
    this._ctx.fillText(
      `RAM: ${Math.ceil(health)}KB`,
      bar.x + bar.w / 2,
      bar.y + bar.h / 2 + HudConfig.textVerticalOffset * scale
    )
  }

  /**
   * Renders the mute button and updates its hit-box.
   *
   * @access private
   */
  _drawMuteButton(isMuted, canvasHeight, scale) {
    const layout = this._layout
    const size = layout.muteButtonSize * scale
    const x = layout.outerMargin
    const y = canvasHeight - size - layout.outerMargin

    // Update hit-box for input controller
    this._muteButtonRect = { x, y, w: size, h: size }

    this._drawRoundedRect(
      x,
      y,
      size,
      size,
      layout.buttonRadius,
      this._colors.UiBackground,
      this._colors.UiBorder
    )

    this._ctx.font = `${layout.muteFontSize * scale}px sans-serif`
    this._ctx.textAlign = 'center'
    this._ctx.textBaseline = 'middle' // Ensure icon is centered vertically
    this._ctx.fillText(
      isMuted ? '🔇' : '🔊',
      x + size / 2,
      y + size / 2 + HudConfig.textVerticalOffset * scale
    )
  }

  /**
   * Renders the floating status message (e.g. "+500 Score").
   *
   * @access private
   */
  _drawStatusMessage(hud, canvasWidth, canvasHeight, scale) {
    const layout = this._layout
    const alpha = Math.min(1, hud.messageTimer / HudConfig.messageFadeDuration)
    const x = canvasWidth / 2
    const y = canvasHeight - layout.messageBottomMargin * scale

    this._ctx.save()
    this._ctx.globalAlpha = alpha
    this._ctx.textAlign = 'center'
    this._ctx.textBaseline = 'middle'
    this._ctx.font = `700 ${layout.messageFontSize * scale}px ${this._fonts.Primary}`

    // Draw thick outline for readability on any background
    this._ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'
    this._ctx.lineWidth = 6 * scale
    this._ctx.lineJoin = 'round'
    this._ctx.miterLimit = 2
    this._ctx.strokeText(hud.lastMessage, x, y)

    // Draw the filled text on top
    this._ctx.fillStyle = hud.messageColor
    this._ctx.fillText(hud.lastMessage, x, y)
    this._ctx.restore()
  }

  /**
   * Utility to draw a rounded rectangle path.
   *
   * @access private
   */
  _drawRoundedRect(x, y, w, h, r, fill, stroke) {
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)

    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
  }

  /**
   * Provides the last calculated mute button bounds for input hit tests.
   *
   * @returns {{ x: number; y: number; w: number; h: number }}
   */
  getMuteButtonRect() {
    return this._muteButtonRect
  }
}
