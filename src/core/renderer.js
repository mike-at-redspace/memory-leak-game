import { clamp } from '../utils/math.js'
import {
  Colors,
  Fonts,
  ScreenConfig,
  PhysicsConfig,
  TileTypes,
  SpriteConfig,
  ParticleConfig
} from '../config/index.js'
import { HudRenderer } from './ui/hud.js'
import { defaultDocument, defaultWindow } from '../utils/environment.js'

/** Manages transient floating text particles shown during gameplay events. */
export class FloatingTextSystem {
  constructor() {
    this._particles = []
  }

  /**
   * Adds a floating text particle at the given position.
   *
   * @param {number} x     - World X position.
   * @param {number} y     - World Y position.
   * @param {string} text  - The text to display.
   * @param {string} type  - The type of event (heal, damage, boost, score).
   * @returns {void}
   */
  spawn(x, y, text, type) {
    this._particles.push({
      x,
      y,
      text,
      type,
      life: ParticleConfig.Life.Default,
      velocity: {
        x: (Math.random() - 0.5) * 0.5,
        y: type === 'slow' ? -0.2 : -1.0
      }
    })
  }

  /**
   * Advances all floating particles and removes expired ones.
   *
   * @param {number} deltaTime  - Milliseconds since previous update.
   * @returns {void}
   */
  update(deltaTime) {
    const dt = deltaTime / 1000

    // Iterate backwards to allow safe removal
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      const decayRate =
        p.type === 'boost'
          ? ParticleConfig.Decay.Boost
          : ParticleConfig.Decay.Default

      p.life -= dt * decayRate
      p.x += p.velocity.x
      p.y += p.velocity.y

      // Apply specific physics based on type
      if (p.type === 'damage') {
        p.x += Math.sin(Date.now() / ParticleConfig.WobbleSpeed) * 1
      }
      if (p.type === 'boost') {
        p.velocity.y -= ParticleConfig.Gravity
      }

      if (p.life <= 0) {
        this._particles.splice(i, 1)
      }
    }
  }

  /**
   * Retrieves the current list of active particles.
   *
   * @returns {Object[]}
   */
  get particles() {
    return this._particles
  }
}

/** Handles the HTML5 Canvas rendering pipeline for the game. */
export class Renderer {
  /**
   * Sets up rendering state and context.
   *
   * @param {HTMLCanvasElement} canvas
   * - The canvas element where the game renders.
   * @param {Object} [options={}]
   * - Environment injection overrides evaluated during testing.
   * @param {Window} [options.windowRef]
   * - Alternative window reference (defaults to `defaultWindow`).
   * @param {Document} [options.documentRef]
   * - Alternative document reference (defaults to `defaultDocument`).
   */
  constructor(canvas, options = {}) {
    this._canvas = canvas
    this._window = options.windowRef || defaultWindow
    this._document = options.documentRef || defaultDocument

    // Optimize context for 2D pixel art (alpha: false if background is opaque)
    this._ctx = canvas.getContext('2d', { alpha: false })

    this._sheet = new Image()
    this._sheet.src = SpriteConfig.Source

    this._hudRenderer = new HudRenderer(this._ctx)

    // Bind resize handler
    this._boundResize = this._resize.bind(this)
    this._setupFonts()
    this._resize()
    this._window.addEventListener('resize', this._boundResize)
  }

  /**
   * Provides access to the sprite sheet image so other systems can await load
   * events.
   *
   * @returns {HTMLImageElement}
   */
  get sheet() {
    return this._sheet
  }

  /**
   * Cleans up DOM listeners to prevent memory leaks.
   *
   * @returns {void}
   */
  dispose() {
    this._window.removeEventListener('resize', this._boundResize)
  }

  /**
   * Returns the current scaling factor based on screen width.
   *
   * @returns {number}
   */
  get scaleFactor() {
    return this._canvas.width > ScreenConfig.LargeScreenThreshold
      ? ScreenConfig.LargeScale
      : ScreenConfig.BaseScale
  }

  /**
   * Returns the bounding rect of the mute button for input handling.
   *
   * @returns {{ x: number; y: number; w: number; h: number }}
   */
  getMuteButtonRect() {
    return this._hudRenderer.getMuteButtonRect()
  }

  /**
   * Renders the main gameplay loop (World, Entities, HUD).
   *
   * @param {World}              world      - The game world instance.
   * @param {Player}             player     - The player instance.
   * @param {Camera}             camera     - The camera instance.
   * @param {FloatingTextSystem} particles  - The particle system.
   * @param {Object}             stats      - Current game statistics.
   * @param {Object}             hud        - Current HUD state.
   * @param {boolean}            isMuted    - Audio mute state.
   * @returns {void}
   */
  renderGame(world, player, camera, particles, stats, hud, isMuted) {
    const width = this._canvas.width
    const height = this._canvas.height

    this._drawBackground(width, height)
    this._drawWorld(world, camera, width, height)
    this._drawPlayer(player, camera)
    this._renderParticles(particles, camera)

    this._hudRenderer.render(
      stats,
      hud,
      isMuted,
      width,
      height,
      this.scaleFactor
    )
  }

  /**
   * Draws the pre-start splash screen.
   *
   * @returns {void}
   */
  renderStartScreen() {
    this._clearScreen('#0c1016')

    const centerX = this._canvas.width / 2
    const centerY = this._canvas.height / 2

    this._drawCenteredText({
      text: 'MEMORY LEAK',
      x: centerX,
      y: centerY - 50,
      font: `900 ${80 * this.scaleFactor}px ${Fonts.Primary}`,
      color: Colors.Info
    })

    this._drawCenteredText({
      text: 'Collect all cache fragments before RAM 𓇲 runs out',
      x: centerX,
      y: centerY + 20,
      font: `400 ${24 * this.scaleFactor}px ${Fonts.Monospace}`,
      color: '#fff'
    })

    this._drawBlinkingText('CLICK TO INITIALIZE SYSTEM', centerY + 100)
  }

  /**
   * Draws the end-of-game overlay for victory or defeat.
   *
   * @param {boolean} isVictory  - Whether the player won.
   * @param {number}  score      - The final score.
   * @returns {void}
   */
  renderEndScreen(isVictory, score) {
    this._clearScreen('rgba(12, 16, 22, 0.95)')

    const centerX = this._canvas.width / 2
    const centerY = this._canvas.height / 2
    const color = isVictory ? Colors.Success : Colors.Danger
    const title = isVictory ? 'SYSTEM RESTORED' : 'OUT OF MEMORY'

    this._drawCenteredText({
      text: title,
      x: centerX,
      y: centerY - 60,
      font: `900 ${60 * this.scaleFactor}px ${Fonts.Primary}`,
      color: color
    })

    this._drawCenteredText({
      text: `FINAL SCORE: ${score}`,
      x: centerX,
      y: centerY + 20,
      font: `bold ${40 * this.scaleFactor}px ${Fonts.Monospace}`,
      color: '#fff'
    })

    this._drawBlinkingText('CLICK TO REBOOT', centerY + 120)
  }

  // --- Private Rendering Helpers ---

  /**
   * Clears the background.
   *
   * @access private
   */
  _drawBackground(width, height) {
    this._ctx.fillStyle = Colors.WallShadow
    this._ctx.fillRect(0, 0, width, height)
  }

  /**
   * Iterates over the visible tile grid and draws walls/floors.
   *
   * @access private
   */
  _drawWorld(world, camera, viewWidth, viewHeight) {
    const ts = PhysicsConfig.TileSize

    // Calculate visible range (culling)
    const startX = Math.floor(camera.x / ts) - 1
    const endX = Math.ceil((camera.x + viewWidth) / ts) + 1
    const startY = Math.floor(camera.y / ts) - 1
    const endY = Math.ceil((camera.y + viewHeight) / ts) + 1

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const type = world.getTileType(tx, ty)
        const screenX = Math.round(tx * ts - camera.x)
        const screenY = Math.round(ty * ts - camera.y)

        if (type === TileTypes.WALL) {
          this._drawWall(screenX, screenY, ts)
        } else {
          this._drawFloor(screenX, screenY, ts)
          const item = world.getItemAt(tx, ty)
          if (item) this._drawItem(item, screenX, screenY, ts)
        }
      }
    }
  }

  /**
   * @access private
   */
  _drawWall(x, y, size) {
    this._ctx.fillStyle = Colors.Wall
    this._ctx.fillRect(x, y, size, size)
    // "3D" depth effect
    this._ctx.fillStyle = Colors.WallShadow
    this._ctx.fillRect(x, y + size - 10, size, 10)
  }

  /**
   * @access private
   */
  _drawFloor(x, y, size) {
    this._ctx.fillStyle = Colors.Floor
    this._ctx.fillRect(x, y, size, size)
    this._ctx.strokeStyle = Colors.FloorGrid
    this._ctx.lineWidth = 1
    this._ctx.strokeRect(x, y, size, size)
  }

  /**
   * @access private
   */
  _drawItem(item, x, y, size) {
    this._ctx.font = '30px sans-serif'
    this._ctx.textAlign = 'center'
    this._ctx.textBaseline = 'middle'
    this._ctx.fillText(item.emoji, x + size / 2, y + size / 2 + 5)
  }

  /**
   * Draws the player sprite or fallback box.
   *
   * @access private
   */
  _drawPlayer(player, camera) {
    const px = Math.round(player.x - camera.x)
    const py = Math.round(player.y - camera.y)
    const sw = SpriteConfig.Width * SpriteConfig.Scale
    const sh = SpriteConfig.Height * SpriteConfig.Scale

    if (this._sheet.complete && this._sheet.naturalWidth) {
      this._ctx.drawImage(
        this._sheet,
        player.frame * SpriteConfig.Width,
        player.direction * SpriteConfig.Height,
        SpriteConfig.Width,
        SpriteConfig.Height,
        px,
        py,
        sw,
        sh
      )
    } else {
      this._ctx.fillStyle = Colors.FallbackSprite
      this._ctx.fillRect(px, py, sw, sh)
    }
  }

  /**
   * Renders floating text particles.
   *
   * @access private
   */
  _renderParticles(system, camera) {
    system.particles.forEach(p => {
      const sx = p.x - camera.x + 32
      const sy = p.y - camera.y

      this._ctx.save()
      this._ctx.translate(sx, sy)

      const style = this._getParticleStyle(p)

      this._ctx.globalAlpha = clamp(p.life, 0, 1)
      this._ctx.scale(style.scale, style.scale)
      this._ctx.font = style.font
      this._ctx.fillStyle = style.color
      this._ctx.textAlign = 'center'
      this._ctx.textBaseline = 'middle'

      // Shadow/Outline effect
      this._ctx.shadowBlur = 4
      this._ctx.shadowColor = 'black'
      this._ctx.lineWidth = 3
      this._ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      this._ctx.strokeText(p.text, 0, 0)

      this._ctx.fillText(p.text, 0, 0)
      this._ctx.restore()
    })
  }

  /**
   * Determines styling based on particle type.
   *
   * @access private
   */
  _getParticleStyle(p) {
    let color = '#f1c40f'
    let scale = 1
    let font = `bold 16px ${Fonts.Monospace}`

    switch (p.type) {
      case 'damage':
        scale = 1 + (1 - p.life) * 0.5
        color = Colors.Danger
        font = `900 20px ${Fonts.Primary}`
        break
      case 'heal':
        color = Colors.Success
        font = `900 18px ${Fonts.Monospace}`
        break
      case 'boost':
        scale = 0.5 + (1 - p.life) * 1.5
        color = Colors.Info
        font = `900 20px ${Fonts.Primary}`
        break
      case 'slow':
        color = '#9b59b6'
        font = `900 24px ${Fonts.Primary}`
        break
    }
    return { color, scale, font }
  }

  // --- Utility Helpers ---

  /**
   * @access private
   */
  _clearScreen(color) {
    this._ctx.fillStyle = color
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height)
  }

  /**
   * @access private
   */
  _drawCenteredText({ text, x, y, font, color }) {
    this._ctx.fillStyle = color
    this._ctx.font = font
    this._ctx.textAlign = 'center'
    this._ctx.fillText(text, x, y)
  }

  /**
   * @access private
   */
  _drawBlinkingText(text, y) {
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      this._ctx.fillStyle = 'rgba(255,255,255,0.7)'
      this._ctx.font = `400 ${20 * this.scaleFactor}px ${Fonts.Monospace}`
      this._ctx.textAlign = 'center'
      this._ctx.fillText(text, this._canvas.width / 2, y)
    }
  }

  /**
   * @access private
   */
  _resize() {
    this._canvas.width = this._window.innerWidth
    this._canvas.height = this._window.innerHeight
  }

  /**
   * @access private
   */
  _setupFonts() {
    const link = this._document.createElement('link')
    link.href = Fonts.CdnUrl
    link.rel = 'stylesheet'
    this._document.head.appendChild(link)
  }
}
