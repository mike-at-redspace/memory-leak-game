import {
  TileTypes,
  PhysicsConfig,
  SpriteConfig,
  CollisionConfig,
  ITEM_REGISTRY,
  StatsConfig,
  TARGET_ITEMS,
  Directions,
  ScreenConfig,
  ProcGenConfig
} from '../config/index.js'
import { seededRandom } from '../utils/math.js'

const PROC_GEN = ProcGenConfig

/**
 * Manages the procedural grid, tile logic, entity collision, and item
 * persistence.
 */
export class World {
  constructor() {
    this._collectedItems = new Set()
    this._levelSeed = 0

    // Pre-calculate total rarity weight to avoid re-looping every frame
    this._totalItemRarity = ITEM_REGISTRY.reduce(
      (sum, item) => sum + item.rarity,
      0
    )
    this._guaranteedItemTiles = new Map()
    this._populateGuaranteedItems()
  }

  /**
   * Resets the world state and regenerates the map and items for a new level.
   *
   * @param {number} [level=1]  - The current level number (used for seed
   *                            variation).
   * @returns {void}
   */
  reset(level = 1) {
    this._collectedItems.clear()
    this._levelSeed = level
    // Regenerate guaranteed items for the new level
    this._guaranteedItemTiles.clear()
    this._populateGuaranteedItems()
  }

  /**
   * Generates the connectivity configuration for a macro-grid cell. Determines
   * if a cell has openings to its right or bottom neighbors.
   *
   * @param {number} cx  - Macro-cell X coordinate.
   * @param {number} cy  - Macro-cell Y coordinate.
   * @returns {{ r: boolean; d: boolean }} Connectivity flags.
   */
  getCellConfig(cx, cy) {
    // Add level seed to vary map layout per level
    const seed =
      (cx * PROC_GEN.Primes.X) ^
      (cy * PROC_GEN.Primes.Y) ^
      (this._levelSeed * 1000003)
    const r = seededRandom(seed)

    if (r < PROC_GEN.ConnectionThresholds.One) return { r: true, d: false }
    if (r < PROC_GEN.ConnectionThresholds.Two) return { r: false, d: true }
    return { r: true, d: true }
  }

  /**
   * Determines the tile type at a specific coordinate based on macro-cell
   * logic.
   *
   * @param {number} tx  - Tile X coordinate.
   * @param {number} ty  - Tile Y coordinate.
   * @returns {number} The TileType enum value (FLOOR or WALL).
   */
  getTileType(tx, ty) {
    const cx = Math.floor(tx / PROC_GEN.CellSize)
    const cy = Math.floor(ty / PROC_GEN.CellSize)

    // Calculate local coordinates within the 4x4 cell (handling negative wrapping)
    const lx =
      ((tx % PROC_GEN.CellSize) + PROC_GEN.CellSize) % PROC_GEN.CellSize
    const ly =
      ((ty % PROC_GEN.CellSize) + PROC_GEN.CellSize) % PROC_GEN.CellSize

    // Center 2x2 is always floor
    if ((lx === 1 || lx === 2) && (ly === 1 || ly === 2)) return TileTypes.FLOOR

    const curr = this.getCellConfig(cx, cy)

    // Horizontal logic
    if (ly === 1 || ly === 2) {
      if (lx === 0) {
        const left = this.getCellConfig(cx - 1, cy)
        if (left.r) return TileTypes.FLOOR
      }
      if (lx === 3 && curr.r) return TileTypes.FLOOR
    }

    // Vertical logic
    if (lx === 1 || lx === 2) {
      if (ly === 0) {
        const top = this.getCellConfig(cx, cy - 1)
        if (top.d) return TileTypes.FLOOR
      }
      if (ly === 3 && curr.d) return TileTypes.FLOOR
    }

    return TileTypes.WALL
  }

  /**
   * Resolves which item, if any, exists at a tile coordinate.
   *
   * @param {number} tx  - Tile X coordinate.
   * @param {number} ty  - Tile Y coordinate.
   * @returns {Object | null} The item definition or null.
   */
  getItemAt(tx, ty) {
    const key = `${tx},${ty}`
    if (this._collectedItems.has(key)) return null
    if (this.getTileType(tx, ty) === TileTypes.WALL) return null

    const guaranteedItem = this._guaranteedItemTiles.get(key)
    if (guaranteedItem) return guaranteedItem

    // Add level seed to vary item spawns per level
    const seed =
      (tx * PROC_GEN.ItemSeed.X) ^
      (ty * PROC_GEN.ItemSeed.Y) ^
      (this._levelSeed * 2000003)
    if (seededRandom(seed) > PROC_GEN.SpawnChance) return null

    const roll = seededRandom(seed + 1)
    let accumulator = 0

    for (const item of ITEM_REGISTRY) {
      accumulator += item.rarity / this._totalItemRarity
      if (roll <= accumulator) return item
    }

    return null
  }

  /**
   * Prepares a fixed mapping from tiles to required collectibles so every
   * target item is present at least once in the world. Uses level seed to vary
   * placement each level.
   *
   * @returns {void}
   * @access private
   */
  _populateGuaranteedItems() {
    const required = TARGET_ITEMS.length
    if (required === 0) return

    let limit = Math.max(160, required * 3)
    let candidateTiles = this._collectFloorTiles(required, limit)

    while (candidateTiles.length < required && limit <= 400) {
      limit += 40
      candidateTiles = this._collectFloorTiles(required, limit)
    }

    // Shuffle candidate tiles using level seed to vary placement each level
    const shuffledTiles = this._shuffleWithSeed(candidateTiles, this._levelSeed)

    shuffledTiles.slice(0, required).forEach((tile, index) => {
      const key = `${tile.tx},${tile.ty}`
      this._guaranteedItemTiles.set(key, TARGET_ITEMS[index])
    })
  }

  /**
   * Shuffles an array using a seed for deterministic randomization.
   *
   * @param {Array}  array  - The array to shuffle.
   * @param {number} seed   - The seed value for randomization.
   * @returns {Array} A new shuffled array.
   * @access private
   */
  _shuffleWithSeed(array, seed) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed * 1000007 + i) * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Collects floor tile coordinates within a square radius to assign forced
   * spawns for guaranteed items.
   *
   * @param {number} needed
   * - Number of floor tiles required.
   * @param {number} limit
   * - Radius (in tiles) to examine around the origin.
   * @returns {Array.<{ tx: number; ty: number }>}
   */
  _collectFloorTiles(needed, limit) {
    const tiles = []

    for (let tx = -limit; tx <= limit && tiles.length < needed; tx++) {
      for (let ty = -limit; ty <= limit && tiles.length < needed; ty++) {
        if (this.getTileType(tx, ty) !== TileTypes.FLOOR) continue
        tiles.push({ tx, ty })
      }
    }

    return tiles
  }

  /**
   * Exposes the internal set of collected item keys.
   *
   * @returns {Set<string>}
   */
  get collectedItems() {
    return this._collectedItems
  }

  /**
   * Checks if a world pixel coordinate falls inside a wall tile.
   *
   * @param {number} x  - World pixel X.
   * @param {number} y  - World pixel Y.
   * @returns {boolean} True if inside a wall.
   */
  isWall(x, y) {
    const tx = Math.floor(x / PhysicsConfig.TileSize)
    const ty = Math.floor(y / PhysicsConfig.TileSize)
    return this.getTileType(tx, ty) === TileTypes.WALL
  }

  /**
   * Checks AABB collision against world geometry. Optimized to avoid array
   * allocation during the game loop.
   *
   * @param {number} sx  - Sprite top-left X.
   * @param {number} sy  - Sprite top-left Y.
   * @returns {boolean} True if collision detected.
   */
  checkCollision(sx, sy) {
    const scale = SpriteConfig.Scale
    const cx = sx + (SpriteConfig.Width * scale) / 2

    // Collision box is positioned at the sprite's feet
    const bottomY =
      sy + SpriteConfig.Height * scale - CollisionConfig.VerticalOffset
    const halfWidth = CollisionConfig.Width / 2

    const left = cx - halfWidth
    const right = cx + halfWidth
    const top = bottomY
    const bottom = bottomY + CollisionConfig.Height

    // Check all four corners
    if (this.isWall(left, top)) return true
    if (this.isWall(right, top)) return true
    if (this.isWall(left, bottom)) return true
    if (this.isWall(right, bottom)) return true

    return false
  }

  /**
   * Spirals outward from center to find the nearest safe floor tile.
   *
   * @returns {{ x: number; y: number }} A valid spawn coordinate.
   */
  findSpawn() {
    for (let r = 0; r < 120; r++) {
      for (let tx = -r; tx <= r; tx++) {
        for (let ty = -r; ty <= r; ty++) {
          if (this.getTileType(tx, ty) === TileTypes.FLOOR) {
            const wx = tx * PhysicsConfig.TileSize
            const wy = ty * PhysicsConfig.TileSize
            if (!this.checkCollision(wx, wy)) return { x: wx, y: wy }
          }
        }
      }
    }
    return { x: 0, y: 0 }
  }
}

/** Represents the user-controlled entity. */
export class Player {
  constructor() {
    this.x = 0
    this.y = 0
    this.health = StatsConfig.MaxHealth
    this.direction = Directions.DOWN
    this.frame = 0
    this.multiplier = 1

    // Internal state for animation and timers
    this._animTimer = 0
    this._isMoving = false
    this.speedTimer = null
  }

  /**
   * Resets player state and teleports to specific coordinates.
   *
   * @param {{ x: number; y: number }} pos  - Target position.
   * @returns {void}
   */
  reset(pos) {
    this.x = pos.x
    this.y = pos.y
    this.health = StatsConfig.MaxHealth
    this.multiplier = 1
    this.direction = Directions.DOWN
    this._isMoving = false
    this.frame = 0
    this._animTimer = 0
  }

  /**
   * Advances animation frames based on delta time.
   *
   * @param {number} dt  - Delta time in milliseconds.
   * @returns {void}
   */
  update(dt) {
    if (!this._isMoving) {
      this.frame = 0
      return
    }

    this._animTimer += dt
    const threshold = PhysicsConfig.AnimationSpeed * ScreenConfig.FrameInterval

    if (this._animTimer >= threshold) {
      this.frame = (this.frame + 1) % SpriteConfig.FramesPerDirection
      this._animTimer = 0
    }
  }

  /**
   * Calculates new position based on vector and collision. Handles X and Y axes
   * separately to allow sliding against walls.
   *
   * @param {{ x: number; y: number }} vec
   * - Normalized movement vector.
   * @param {World} world
   * - World instance for collision checks.
   * @param {number} dt
   * - Delta time in milliseconds.
   * @returns {void}
   */
  move(vec, world, dt) {
    const speed =
      PhysicsConfig.BaseSpeed *
      this.multiplier *
      (dt / ScreenConfig.FrameInterval)
    const nextX = this.x + vec.x * speed
    const nextY = this.y + vec.y * speed

    this._isMoving = vec.x !== 0 || vec.y !== 0

    if (vec.x !== 0 && !world.checkCollision(nextX, this.y)) {
      this.x = nextX
    }

    if (vec.y !== 0 && !world.checkCollision(this.x, nextY)) {
      this.y = nextY
    }
  }
}

/** Handles viewport interpolation to follow a target. */
export class Camera {
  /**
   * @param {Object}   [options]
   * @param {Function} [options.viewport]  - Function returning {width, height}
   *                                       of the view.
   */
  constructor({ viewport } = {}) {
    this.x = 0
    this.y = 0
    this._getViewport =
      viewport ||
      (() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }))
  }

  /**
   * Interpolates the camera position towards the target coordinates.
   *
   * @param {number} targetX  - Target world X.
   * @param {number} targetY  - Target world Y.
   * @returns {void}
   */
  follow(targetX, targetY) {
    const { width, height } = this._getViewport()

    const desiredX = targetX - width / 2
    const desiredY = targetY - height / 2

    // Smooth linear interpolation (Lerp)
    const factor = PhysicsConfig.CameraLerpFactor
    this.x = this.x + (desiredX - this.x) * factor
    this.y = this.y + (desiredY - this.y) * factor
  }
}
