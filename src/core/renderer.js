import { clamp } from '../utils/math.js'
import {
  Colors,
  Fonts,
  ScreenConfig,
  PhysicsConfig,
  TileTypes,
  SpriteConfig,
  ParticleConfig,
  ItemOutlineColors,
  LevelThemes
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
    const width = this._canvas.width
    if (width > ScreenConfig.LargeScreenThreshold) {
      // Scale proportionally for screens over 1920px (reduced scaling)
      // At 1920px: 1.5x, at 2560px: ~1.75x, at 3840px: ~2.25x
      const extraWidth = width - ScreenConfig.LargeScreenThreshold
      const scaleMultiplier =
        1 + (extraWidth / ScreenConfig.LargeScreenThreshold) * 0.5
      return ScreenConfig.LargeScale * scaleMultiplier
    }
    return ScreenConfig.BaseScale
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
  renderGame(world, player, camera, particles, stats, hud, isMuted, level) {
    const width = this._canvas.width
    const height = this._canvas.height

    // Get theme for current level (1-indexed, so subtract 1)
    // Ensure level is a valid number, default to 1 if not
    const currentLevel = level && typeof level === 'number' ? level : 1
    // Clamp to available themes (levels 1-5 map to indices 0-4)
    const themeIndex = Math.min(
      Math.max(0, currentLevel - 1),
      LevelThemes.length - 1
    )
    const theme = LevelThemes[themeIndex]

    this._drawBackground(width, height, theme)
    this._drawWorld(world, camera, width, height, theme)
    this._drawPlayer(player, camera)
    this._renderParticles(particles, camera)

    this._hudRenderer.render(
      stats,
      hud,
      isMuted,
      width,
      height,
      this.scaleFactor,
      currentLevel
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
  _drawBackground(width, height, theme) {
    this._ctx.fillStyle = theme.WallShadow
    this._ctx.fillRect(0, 0, width, height)
  }

  /**
   * Iterates over the visible tile grid and draws walls/floors.
   *
   * @access private
   */
  _drawWorld(world, camera, viewWidth, viewHeight, theme) {
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
          this._drawWall(screenX, screenY, ts, theme)
        } else {
          this._drawFloor(screenX, screenY, ts, theme)
          const item = world.getItemAt(tx, ty)
          if (item) this._drawItem(item, screenX, screenY, ts)
        }
      }
    }
  }

  /**
   * @access private
   */
  _drawWall(x, y, size, theme) {
    this._ctx.fillStyle = theme.Wall
    this._ctx.fillRect(x, y, size, size)

    // Simple "panel" texture
    this._ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    this._ctx.fillRect(x + 4, y + 4, size - 8, size - 8)

    // "3D" depth effect
    this._ctx.fillStyle = theme.WallShadow
    this._ctx.fillRect(x, y + size - 10, size, 10)
  }

  /**
   * @access private
   */
  _drawFloor(x, y, size, theme) {
    this._ctx.fillStyle = theme.Floor
    this._ctx.fillRect(x, y, size, size)

    // Optimize: Use fillRect for grid lines instead of strokeRect
    this._ctx.fillStyle = theme.FloorGrid
    // Draw bottom line
    this._ctx.fillRect(x, y + size - 1, size, 1)
    // Draw right line
    this._ctx.fillRect(x + size - 1, y, 1, size)
  }

  /**
   * @access private
   */
  _drawItem(item, x, y, size) {
    this._ctx.save()
    this._ctx.font = '30px sans-serif'
    this._ctx.textAlign = 'center'
    this._ctx.textBaseline = 'middle'

    const centerX = x + size / 2
    const centerY = y + size / 2 + 5
    const outlineColor = this._getItemOutlineColor(item)

    if (outlineColor) {
      this._drawEmojiOutline(item.emoji, centerX, centerY, outlineColor, 2.5)
    }

    this._ctx.fillStyle = Colors.ItemFill
    this._ctx.fillText(item.emoji, centerX, centerY)
    this._ctx.restore()
  }

  _drawEmojiOutline(text, x, y, color, thickness) {
    const steps = 12
    this._ctx.save()
    this._ctx.fillStyle = color

    for (let i = 0; i < steps; i++) {
      const angle = (Math.PI * 2 * i) / steps
      const offsetX = Math.cos(angle) * thickness
      const offsetY = Math.sin(angle) * thickness

      this._ctx.shadowColor = color
      this._ctx.shadowBlur = 0
      this._ctx.shadowOffsetX = offsetX
      this._ctx.shadowOffsetY = offsetY

      this._ctx.fillText(text, x, y)
    }

    this._ctx.shadowColor = 'transparent'
    this._ctx.shadowBlur = 0
    this._ctx.shadowOffsetX = 0
    this._ctx.shadowOffsetY = 0
    this._ctx.restore()
  }

  _getItemOutlineColor(item) {
    if (typeof item.health === 'number') {
      // if (item.health < 0) return ItemOutlineColors.hazard
      if (item.health > 0) return ItemOutlineColors.heal
    }

    // if (item.isSlow) return ItemOutlineColors.slow
    // if (item.isBoost) return ItemOutlineColors.boost

    return null
  }

  /**
   * Draws the player sprite or fallback box.
   *
   * @access private
   */
  /**
   * Draws the player sprite with visual effects during boost/slow.
   *
   * @access private
   */
  /**
   * Draws the player with HYPER-FLOW BOOST ANIMATION.
   * Mesmerizing rotating rings + orbiting sparks + velocity trails.
   * Designed for dev FLOW STATE: smooth sine waves, golden ratio, no jitter.
   */
  _drawPlayer(player, camera) {
    const px = Math.round(player.x - camera.x)
    const py = Math.round(player.y - camera.y)
    const w = SpriteConfig.Width * SpriteConfig.Scale
    const h = SpriteConfig.Height * SpriteConfig.Scale
    const cx = px + w / 2
    const cy = py + h / 2

    this._ctx.save()

    const now = performance.now() / 1000 // Normalized time for smooth anim
    const isBoosted = !!player.isBoosted
    const isSlowed = !!player.isSlowed

    // ─── FLOW-STATE BOOST: ROTATING AURA RINGS + ORBITING SPARKS + VELOCITY TRAIL ───
    if (isBoosted) {
      const pulse = (Math.sin(now * 3) + 1) / 2 // 0→1 smooth pulse (3Hz)
      const rotation = now * 0.5 // Slow hypnotic rotation
      const numRings = 4
      const baseRadius = 20

      // === LAYERED ROTATING RINGS (Golden ratio spacing for harmony) ===
      const phi = 0.618 // Golden ratio for perfect visual flow
      for (let i = 0; i < numRings; i++) {
        const ringProgress = i / numRings
        const radius = baseRadius + ringProgress * 35 * (0.8 + pulse * 0.4)
        const thickness = 3 + ringProgress * 2
        const alpha = 0.4 + ringProgress * 0.2 * pulse
        const hueShift = ringProgress * 120 // Cyan → Blue → Purple cycle

        this._ctx.save()
        this._ctx.translate(cx, cy)
        this._ctx.rotate(rotation + ringProgress * Math.PI * 2 * phi)

        // Gradient stroke for depth
        const gradient = this._ctx.createLinearGradient(-radius, 0, radius, 0)
        gradient.addColorStop(0, `hsla(${hueShift}, 100%, 70%, ${alpha})`)
        gradient.addColorStop(
          0.5,
          `hsla(${hueShift + 60}, 100%, 80%, ${alpha * 1.5})`
        )
        gradient.addColorStop(1, `hsla(${hueShift}, 100%, 60%, ${alpha})`)

        this._ctx.strokeStyle = gradient
        this._ctx.lineWidth = thickness
        this._ctx.lineCap = 'round'
        this._ctx.globalAlpha = alpha
        this._ctx.beginPath()
        this._ctx.arc(0, 0, radius, 0, Math.PI * 2)
        this._ctx.stroke()
        this._ctx.restore()
      }

      // === 12 ORBITING SPARKS (Sine bob + radial emit) ===
      const numSparks = 12
      for (let i = 0; i < numSparks; i++) {
        const angle =
          (now * 2 + (i * Math.PI * 2) / numSparks) * (1 + pulse * 0.3)
        const sparkRadius = baseRadius + 15 + Math.sin(now * 5 + i) * 3
        const bob = Math.sin(now * 4 + i * phi * 10) * 2

        const sx = cx + Math.cos(angle) * sparkRadius
        const sy = cy + Math.sin(angle) * sparkRadius + bob

        // Spark glow (multi-layer for bloom)
        for (let blur = 8; blur >= 0; blur -= 2) {
          this._ctx.shadowBlur = blur
          this._ctx.shadowColor = `hsl(${240 + pulse * 60}, 100%, 70%)`
          this._ctx.globalAlpha = ((10 - blur) / 20) * pulse
          this._ctx.beginPath()
          this._ctx.arc(sx, sy, 3 + pulse * 2, 0, Math.PI * 2)
          this._ctx.fillStyle = '#ffffff'
          this._ctx.fill()
        }
      }

      // === VELOCITY-BASED ENERGY TRAIL (Behind player, flows with motion) ===
      if (
        player.velocity &&
        (player.velocity.x !== 0 || player.velocity.y !== 0)
      ) {
        const velMag = Math.min(
          1,
          Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2) / 200
        )
        const trailAngle =
          Math.atan2(player.velocity.y, player.velocity.x) + Math.PI // Opposite direction
        const trailLength = 60 * velMag * (1 + pulse)

        // Draw trail gradient
        const trailGradient = this._ctx.createLinearGradient(
          cx,
          cy,
          cx + Math.cos(trailAngle) * trailLength,
          cy + Math.sin(trailAngle) * trailLength
        )
        trailGradient.addColorStop(0, `hsla(200, 100%, 50%, 0)`)
        trailGradient.addColorStop(0.3, `hsla(180, 100%, 60%, ${pulse * 0.8})`)
        trailGradient.addColorStop(1, `hsla(200, 100%, 80%, 0)`)

        this._ctx.shadowBlur = 15 * pulse
        this._ctx.shadowColor = '#00ffff'
        this._ctx.strokeStyle = trailGradient
        this._ctx.lineWidth = 8 * velMag
        this._ctx.lineCap = 'round'
        this._ctx.globalAlpha = pulse * 0.9
        this._ctx.beginPath()
        this._ctx.moveTo(cx, cy)
        this._ctx.lineTo(
          cx + Math.cos(trailAngle) * trailLength,
          cy + Math.sin(trailAngle) * trailLength
        )
        this._ctx.stroke()
      }

      this._ctx.globalAlpha = 1
    }

    // ─── SLOW EFFECT (unchanged - keeps contrast) ───
    if (isSlowed) {
      const pulse = Math.sin(now * 2)
      this._ctx.shadowBlur = 25 + pulse * 20
      this._ctx.shadowColor = '#9933ff'

      for (let i = 3; i >= 0; i--) {
        this._ctx.globalAlpha = 0.15 * (4 - i)
        this._ctx.drawImage(
          this._sheet,
          player.frame * SpriteConfig.Width,
          (player.direction || 0) * SpriteConfig.Height,
          SpriteConfig.Width,
          SpriteConfig.Height,
          px + (i - 1.5) * 6,
          py + (i - 1.5) * 3,
          w,
          h
        )
      }
      this._ctx.globalAlpha = 1
    }

    // ─── CORE SPRITE (clean on top) ───
    this._ctx.shadowBlur = 0
    if (this._sheet.complete && this._sheet.naturalWidth > 0) {
      // Inner core pulse for boost
      if (isBoosted) {
        const corePulse = 1 + Math.sin(now * 6) * 0.1
        this._ctx.save()
        this._ctx.translate(cx, cy)
        this._ctx.scale(corePulse, corePulse)
        this._ctx.drawImage(
          this._sheet,
          player.frame * SpriteConfig.Width,
          (player.direction || 0) * SpriteConfig.Height,
          SpriteConfig.Width,
          SpriteConfig.Height,
          -w / 2,
          -h / 2,
          w,
          h
        )
        this._ctx.restore()
      } else {
        this._ctx.drawImage(
          this._sheet,
          player.frame * SpriteConfig.Width,
          (player.direction || 0) * SpriteConfig.Height,
          SpriteConfig.Width,
          SpriteConfig.Height,
          px,
          py,
          w,
          h
        )
      }
    } else {
      this._ctx.fillStyle = isBoosted ? '#00ffff' : '#ff00ff'
      this._ctx.fillRect(px, py, w, h)
    }

    this._ctx.restore()
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
    let color = Colors.Warning
    let scale = 1
    let font = `bold 16px ${Fonts.Monospace}`

    switch (p.type) {
      case 'damage':
        scale = 1 + (1 - p.life) * 0.5
        color = ItemOutlineColors.hazard
        font = `900 20px ${Fonts.Primary}`
        break
      case 'heal':
        color = ItemOutlineColors.heal
        font = `900 18px ${Fonts.Monospace}`
        break
      case 'boost':
        scale = 0.5 + (1 - p.life) * 1.5
        color = ItemOutlineColors.boost
        font = `900 20px ${Fonts.Primary}`
        break
      case 'slow':
        color = ItemOutlineColors.slow
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
