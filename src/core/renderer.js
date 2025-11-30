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
  LevelThemes,
  CollisionConfig,
  PlayerVisualConfig,
  Directions
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
    this._ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    })

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
   * @param {number}             level      - Current level.
   * @param {CheatCodeHandler}   cheats     - Cheat code handler instance.
   * @returns {void}
   */
  renderGame(
    world,
    player,
    camera,
    particles,
    stats,
    hud,
    isMuted,
    level,
    cheats
  ) {
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
    if (cheats && cheats.isActive('hitbox')) {
      this._drawCollisionBox(player, camera)
      this._drawItemHitboxes(world, camera, width, height)
    }
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

  _drawArrow(ctx, x, y, size, color, alpha, direction = 1) {
    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha = alpha
    ctx.fillStyle = color

    // Triangle head
    ctx.beginPath()
    ctx.moveTo(0, -direction * size)
    ctx.lineTo(size * 0.6, direction * size * 0.4)
    ctx.lineTo(-size * 0.6, direction * size * 0.4)
    ctx.closePath()
    ctx.fill()

    // Rect body
    ctx.fillRect(
      -size * 0.25,
      direction * size * 0.4,
      size * 0.5,
      direction * size * 0.9
    )

    ctx.restore()
  }

  /**
   * Draws the player sprite or fallback box.
   *
   * @access private
   */
  _drawPlayer(player, camera) {
    const ctx = this._ctx
    const now = performance.now() / 1000

    const px = Math.round(player.x - camera.x)
    const py = Math.round(player.y - camera.y)
    const w = SpriteConfig.Width * SpriteConfig.Scale
    const h = SpriteConfig.Height * SpriteConfig.Scale
    const cx = px + w / 2
    const cy = py + h / 2

    const isBoosted = !!player.isBoosted
    const isSlowed = !!player.isSlowed

    // Smooth transitions
    const boostAge = now - (player.boostStartTime || 0)
    const boostIntensity = isBoosted
      ? Math.min(
          1,
          boostAge / PlayerVisualConfig.BoostTransition.FadeInDuration
        )
      : Math.max(
          0,
          1 -
            (now - (player.boostEndTime || 0)) /
              PlayerVisualConfig.BoostTransition.FadeOutDuration
        )

    const slowIntensity = isSlowed
      ? 1
      : Math.max(
          0,
          1 -
            (now - (player.slowEndTime || 0)) /
              PlayerVisualConfig.SlowTransition.FadeOutDuration
        )

    // --- Maintain a small position history on the player object for consistent trails
    // Keep these lightweight: only store screen-space px/py and frame
    if (!player._posHistory) player._posHistory = []
    player._posHistory.push({ x: px, y: py, frame: player.frame, t: now })
    // cap history length
    if (
      player._posHistory.length > PlayerVisualConfig.PositionHistory.MaxLength
    ) {
      player._posHistory.shift()
    }

    // best-effort velocity fallback (pixels per frame-ish)
    const prev =
      player._posHistory.length >= 2
        ? player._posHistory[player._posHistory.length - 2]
        : null
    const vx = player.vx != null ? player.vx : prev ? px - prev.x : 0
    const vy = player.vy != null ? player.vy : prev ? py - prev.y : 0

    // Calculate normalized movement direction for trail effects
    const speed = Math.hypot(vx, vy)
    const minSpeedThreshold = 0.1 // Minimum speed to use movement direction
    let dirX = 0
    let dirY = 0

    if (speed > minSpeedThreshold) {
      dirX = vx / speed
      dirY = vy / speed
    } else {
      // Fallback to player's facing direction when moving too slowly
      const facingDir = player.direction ?? Directions.DOWN
      if (facingDir === Directions.UP) {
        dirX = 0
        dirY = -1
      } else if (facingDir === Directions.RIGHT) {
        dirX = 1
        dirY = 0
      } else if (facingDir === Directions.DOWN) {
        dirX = 0
        dirY = 1
      } else {
        // LEFT
        dirX = -1
        dirY = 0
      }
    }

    ctx.save()

    // ──────────────────────────────
    // 1. TRAIL EFFECTS (behind sprite - boost forward, slow backward)
    // ──────────────────────────────
    const trailConfig = PlayerVisualConfig.BoostTrail

    // Slow trail (ahead of player - forward)
    if (
      isSlowed &&
      slowIntensity > PlayerVisualConfig.SlowTransition.IntensityThreshold
    ) {
      ctx.shadowBlur = trailConfig.ShadowBlur
      ctx.shadowColor = PlayerVisualConfig.SlowTrail.ShadowColor

      const trailGhosts = trailConfig.GhostCount
      for (let i = 1; i <= trailGhosts; i++) {
        const idx = Math.max(
          0,
          player._posHistory.length -
            1 -
            i * PlayerVisualConfig.PositionHistory.Step
        )
        const ghost = player._posHistory[idx]
        if (!ghost) continue

        // Offset in movement direction (ahead of movement)
        const offsetMagnitude = i * trailConfig.ForwardDistance
        const offsetX = dirX * offsetMagnitude
        const offsetY = dirY * offsetMagnitude

        // Add velocity-based nudge
        const velX = (vx || 0) * (i * trailConfig.ForwardVelMultiplier)
        const velY = (vy || 0) * (i * trailConfig.ForwardVelMultiplier)

        const drawX = ghost.x + offsetX + velX
        const drawY = ghost.y + offsetY + velY

        const alpha =
          (1 - i / (trailGhosts + 1)) * trailConfig.AlphaBase * slowIntensity
        ctx.globalAlpha = alpha

        ctx.drawImage(
          this._sheet,
          ghost.frame * SpriteConfig.Width,
          (player.direction || 0) * SpriteConfig.Height,
          SpriteConfig.Width,
          SpriteConfig.Height,
          drawX,
          drawY,
          w,
          h
        )
      }
    }

    // Boost trail (behind player - backward)
    if (
      isBoosted &&
      boostIntensity > PlayerVisualConfig.BoostTransition.IntensityThreshold
    ) {
      ctx.shadowBlur = trailConfig.ShadowBlur
      ctx.shadowColor = trailConfig.ShadowColor

      const trailGhosts = trailConfig.GhostCount
      for (let i = 1; i <= trailGhosts; i++) {
        const idx = Math.max(
          0,
          player._posHistory.length -
            1 -
            i * PlayerVisualConfig.PositionHistory.Step
        )
        const ghost = player._posHistory[idx]
        if (!ghost) continue

        // Offset behind movement direction (opposite to movement)
        const offsetMagnitude = i * trailConfig.ForwardDistance
        const offsetX = -dirX * offsetMagnitude
        const offsetY = -dirY * offsetMagnitude

        // Add velocity-based nudge (reversed for boost)
        const velX = (vx || 0) * (i * trailConfig.ForwardVelMultiplier)
        const velY = (vy || 0) * (i * trailConfig.ForwardVelMultiplier)

        const drawX = ghost.x + offsetX - velX
        const drawY = ghost.y + offsetY - velY

        const alpha =
          (1 - i / (trailGhosts + 1)) * trailConfig.AlphaBase * boostIntensity
        ctx.globalAlpha = alpha

        ctx.drawImage(
          this._sheet,
          ghost.frame * SpriteConfig.Width,
          (player.direction || 0) * SpriteConfig.Height,
          SpriteConfig.Width,
          SpriteConfig.Height,
          drawX,
          drawY,
          w,
          h
        )
      }

      // Short, subtle speed-lines pointing forward (tied to velocity magnitude)
      const speedLinesConfig = PlayerVisualConfig.SpeedLines
      // Reuse the speed variable already calculated above
      ctx.lineWidth = speedLinesConfig.Width
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(
        speedLinesConfig.AlphaMax,
        speedLinesConfig.AlphaBase +
          speedLinesConfig.AlphaBoostMultiplier * boostIntensity
      )})`

      for (let i = 0; i < speedLinesConfig.Count; i++) {
        // random small jitter but keep lines close to player
        const offsetX =
          (Math.random() - 0.5) * w * speedLinesConfig.OffsetXMultiplier
        const offsetY =
          (Math.random() - 0.5) * h * speedLinesConfig.OffsetYMultiplier

        const len =
          speedLinesConfig.BaseLength +
          Math.min(
            speedLinesConfig.MaxLength,
            speed * speedLinesConfig.LengthSpeedMultiplier
          )
        ctx.beginPath()
        ctx.moveTo(cx + offsetX, cy + offsetY)
        ctx.lineTo(
          cx +
            offsetX +
            (vx || 1) * (len * speedLinesConfig.LengthDirMultiplier) +
            len * speedLinesConfig.LengthForwardMultiplier,
          cy +
            offsetY +
            (vy || 0) * (len * speedLinesConfig.LengthDirMultiplier)
        )
        ctx.stroke()
      }
    }

    // ──────────────────────────────
    // 2. PLAYER SPRITE (middle layer)
    // ──────────────────────────────
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    if (this._sheet.complete && this._sheet.naturalWidth) {
      ctx.drawImage(
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
    } else {
      ctx.fillStyle = 'white'
      ctx.fillRect(px + 6, py + 6, w - 12, h - 12)
    }

    // ──────────────────────────────
    // 3. ARROWS — BOOST UP, SLOW DOWN (top layer - above sprite)
    // ──────────────────────────────

    const arrowConfig = PlayerVisualConfig.Arrows
    const arrowBase = w * arrowConfig.BaseSizeMultiplier

    // BOOST — upward arrows (HDR green)
    if (boostIntensity > arrowConfig.IntensityThreshold) {
      const color = arrowConfig.BoostColor
      const pulseSpeed = arrowConfig.BoostPulseSpeed
      const pulse = (Math.sin(now * pulseSpeed) + 1) / 2

      for (let i = 0; i < arrowConfig.Count; i++) {
        const phase =
          (now * arrowConfig.PhaseSpeed + i * arrowConfig.PhaseIncrement) %
          arrowConfig.PhaseRange
        const t = phase / arrowConfig.PhaseRange

        const size = arrowBase + pulse * arrowConfig.PulseAmplitude

        const yStart = cy + h * arrowConfig.YStartMultiplier
        const yEnd = cy + h * arrowConfig.YEndMultiplier
        const y = yStart + (yEnd - yStart) * t

        const x =
          cx + Math.sin(now * 3 + i) * (w * arrowConfig.XSpreadMultiplier)
        const alpha =
          Math.pow(1 - t, arrowConfig.AlphaPower) *
          boostIntensity *
          arrowConfig.AlphaMultiplier

        this._drawArrow(ctx, x, y, size, color, alpha, 1)
      }
    }

    // SLOW — downward arrows (HDR red)
    if (slowIntensity > arrowConfig.IntensityThreshold) {
      const color = arrowConfig.SlowColor
      const pulseSpeed = arrowConfig.SlowPulseSpeed
      const pulse = (Math.sin(now * pulseSpeed) + 1) / 2

      for (let i = 0; i < arrowConfig.Count; i++) {
        const phase =
          (now * arrowConfig.PhaseSpeed + i * arrowConfig.PhaseIncrement) %
          arrowConfig.PhaseRange
        const t = phase / arrowConfig.PhaseRange

        const size = arrowBase + pulse * arrowConfig.PulseAmplitude

        // Use same Y position as boost arrows (above player)
        const yStart = cy + h * arrowConfig.YStartMultiplier
        const yEnd = cy + h * arrowConfig.YEndMultiplier
        const y = yStart + (yEnd - yStart) * t

        const x =
          cx + Math.cos(now * 2 + i) * (w * arrowConfig.XSpreadMultiplier)
        const alpha =
          Math.pow(1 - t, arrowConfig.AlphaPower) *
          slowIntensity *
          arrowConfig.AlphaMultiplier

        this._drawArrow(ctx, x, y, size, color, alpha, -1)
      }
    }

    ctx.restore()
  }

  /**
   * Draws the collision box for debugging purposes.
   *
   * @access private
   */
  _drawCollisionBox(player, camera) {
    const ctx = this._ctx
    const scale = SpriteConfig.Scale
    const sx = player.x
    const sy = player.y

    // Match the collision calculation from world.js
    const cx = sx + (SpriteConfig.Width * scale) / 2
    const bottomY =
      sy + SpriteConfig.Height * scale - CollisionConfig.VerticalOffset
    const halfWidth = CollisionConfig.Width / 2

    const left = cx - halfWidth
    const right = cx + halfWidth
    const top = bottomY
    const bottom = bottomY + CollisionConfig.Height

    // Convert to screen coordinates
    const screenLeft = left - camera.x
    const screenRight = right - camera.x
    const screenTop = top - camera.y
    const screenBottom = bottom - camera.y

    ctx.save()

    // Draw the collision box outline (slightly transparent)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(
      screenLeft,
      screenTop,
      CollisionConfig.Width,
      CollisionConfig.Height
    )

    // Draw corner markers for the four collision check points
    const cornerSize = 4
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'

    // Top-left corner
    ctx.fillRect(
      screenLeft - cornerSize / 2,
      screenTop - cornerSize / 2,
      cornerSize,
      cornerSize
    )
    // Top-right corner
    ctx.fillRect(
      screenRight - cornerSize / 2,
      screenTop - cornerSize / 2,
      cornerSize,
      cornerSize
    )
    // Bottom-left corner
    ctx.fillRect(
      screenLeft - cornerSize / 2,
      screenBottom - cornerSize / 2,
      cornerSize,
      cornerSize
    )
    // Bottom-right corner
    ctx.fillRect(
      screenRight - cornerSize / 2,
      screenBottom - cornerSize / 2,
      cornerSize,
      cornerSize
    )

    ctx.restore()
  }

  /**
   * Draws collision circles for all visible items when hitbox cheat is active.
   * Items use circular collision detection with a 50-pixel radius, but we show
   * a smaller visual hitbox (20px) for better clarity.
   *
   * @param {World}  world       - The world instance.
   * @param {Object} camera      - Camera position {x, y}.
   * @param {number} viewWidth   - Viewport width.
   * @param {number} viewHeight  - Viewport height.
   * @access private
   */
  _drawItemHitboxes(world, camera, viewWidth, viewHeight) {
    const ctx = this._ctx
    const ts = PhysicsConfig.TileSize
    const halfTile = ts / 2
    const itemCollisionRadius = 20 // Visual hitbox size (actual collision is 50px)

    // Calculate visible range (same as _drawWorld)
    const startX = Math.floor(camera.x / ts) - 1
    const endX = Math.ceil((camera.x + viewWidth) / ts) + 1
    const startY = Math.floor(camera.y / ts) - 1
    const endY = Math.ceil((camera.y + viewHeight) / ts) + 1

    ctx.save()

    // Draw collision circles for items
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)' // Green for items (different from red player box)
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4]) // Dashed line to distinguish from player box

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const item = world.getItemAt(tx, ty)
        if (!item) continue

        // Item position is at tile center (matching engine.js collision check)
        const itemX = tx * ts + halfTile
        const itemY = ty * ts + halfTile

        // Convert to screen coordinates
        const screenX = itemX - camera.x
        const screenY = itemY - camera.y

        // Draw circle
        ctx.beginPath()
        ctx.arc(screenX, screenY, itemCollisionRadius, 0, Math.PI * 2)
        ctx.stroke()

        // Draw center point
        ctx.fillStyle = 'rgba(0, 255, 0, 0.6)'
        ctx.fillRect(screenX - 2, screenY - 2, 4, 4)
      }
    }

    ctx.restore()
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
