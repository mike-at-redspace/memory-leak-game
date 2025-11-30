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
  ProcGenConfig,
  ItemPlacementConfig
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
    this._levelSeed = Math.floor(Math.random() * 2147483647) // Random seed for first level

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
   * Generates a random seed for each level to ensure unique layouts.
   *
   * @param {number} [_level=1]  - The current level number (for reference
   *                             only).
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  reset(_level = 1) {
    this._collectedItems.clear()
    // Generate a new random seed for each level
    this._levelSeed = Math.floor(Math.random() * 2147483647)
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
   * placement each level. Enhanced with minimum distance constraints between
   * same item types, spawn awareness, and improved distribution.
   *
   * @returns {void}
   * @access private
   */
  _populateGuaranteedItems() {
    const required = TARGET_ITEMS.length
    if (required === 0) return

    // Get player spawn location for spawn-aware placement
    const spawn = this.findSpawn()
    const spawnTx = Math.floor(spawn.x / PhysicsConfig.TileSize)
    const spawnTy = Math.floor(spawn.y / PhysicsConfig.TileSize)

    const config = ItemPlacementConfig
    let limit = Math.max(160, required * 3)
    let candidateTiles = this._collectFloorTiles(
      required * 4,
      limit,
      spawnTx,
      spawnTy
    )

    while (candidateTiles.length < required * 2 && limit <= 400) {
      limit += 40
      candidateTiles = this._collectFloorTiles(
        required * 4,
        limit,
        spawnTx,
        spawnTy
      )
    }

    // Shuffle candidate tiles using level seed
    const shuffledTiles = this._shuffleWithSeed(candidateTiles, this._levelSeed)

    // Track placement per item type for distance checking
    const placementsByType = new Map()
    const placedTiles = []

    // Try to place each item with distance constraints
    for (let i = 0; i < required; i++) {
      const item = TARGET_ITEMS[i]
      const itemType = item.id

      let placed = false
      let currentMinDistance = config.MinDistanceSameType

      // Score and sort candidate tiles for better placement
      const scoredTiles = shuffledTiles
        .map(tile => ({
          tile,
          score: this._scoreTileForPlacement(
            tile,
            spawnTx,
            spawnTy,
            placedTiles,
            placementsByType.get(itemType) || [],
            currentMinDistance
          )
        }))
        .filter(scored => scored.score > 0)
        .sort((a, b) => b.score - a.score)

      // Try placement with constraints, using scored tiles
      for (
        let attempt = 0;
        attempt < Math.min(config.MaxPlacementAttempts, scoredTiles.length) &&
        !placed;
        attempt++
      ) {
        // Use seed-based weighted selection from top-scored tiles
        const seedValue = this._levelSeed * 1000009 + i * 10007 + attempt
        // Prefer higher-scored tiles but allow some randomness
        const topN = Math.min(100, scoredTiles.length)
        const weightedIndex = Math.floor(
          Math.pow(seededRandom(seedValue), 2) * topN
        )
        const scored = scoredTiles[weightedIndex]

        if (!scored) continue

        const tile = scored.tile

        // Check if this tile is already used
        if (placedTiles.some(p => p.tx === tile.tx && p.ty === tile.ty)) {
          continue
        }

        // Check distance from spawn
        const spawnDist = this._calculateDistance(
          spawnTx,
          spawnTy,
          tile.tx,
          tile.ty
        )
        if (spawnDist < config.MinDistanceFromSpawn) continue
        if (spawnDist > config.MaxDistanceFromSpawn) continue

        // Check distance from same item type
        const existingPlacements = placementsByType.get(itemType) || []
        const tooClose = existingPlacements.some(existing => {
          const dist = this._calculateDistance(
            existing.tx,
            existing.ty,
            tile.tx,
            tile.ty
          )
          return dist < currentMinDistance
        })

        if (!tooClose) {
          // Basic accessibility check - ensure it's a valid floor tile
          if (this.getTileType(tile.tx, tile.ty) !== TileTypes.FLOOR) {
            continue
          }

          // Place the item
          const key = `${tile.tx},${tile.ty}`
          this._guaranteedItemTiles.set(key, item)
          placedTiles.push(tile)

          if (!placementsByType.has(itemType)) {
            placementsByType.set(itemType, [])
          }
          placementsByType.get(itemType).push(tile)
          placed = true
        }
      }

      // Fallback: relax constraints and try again
      if (!placed && config.RelaxDistanceOnFailure) {
        currentMinDistance = Math.max(
          config.MinDistanceSameTypeFallback,
          currentMinDistance - 2
        )
        const relaxedSpawnMin = Math.max(1, config.MinDistanceFromSpawn - 2)

        // Re-score tiles with relaxed constraints
        const relaxedScoredTiles = shuffledTiles
          .map(tile => ({
            tile,
            score: this._scoreTileForPlacementRelaxed(
              tile,
              spawnTx,
              spawnTy,
              placedTiles,
              placementsByType.get(itemType) || [],
              currentMinDistance,
              relaxedSpawnMin
            )
          }))
          .filter(scored => scored.score > 0)
          .sort((a, b) => b.score - a.score)

        for (
          let attempt = 0;
          attempt < Math.min(1000, relaxedScoredTiles.length) && !placed;
          attempt++
        ) {
          const seedValue =
            this._levelSeed * 1000009 + i * 10007 + attempt + 10000
          const topN = Math.min(100, relaxedScoredTiles.length)
          const weightedIndex = Math.floor(
            Math.pow(seededRandom(seedValue), 2) * topN
          )
          const scored = relaxedScoredTiles[weightedIndex]

          if (!scored) continue

          const tile = scored.tile

          // Check if already used
          if (placedTiles.some(p => p.tx === tile.tx && p.ty === tile.ty)) {
            continue
          }

          // Check distance from spawn (relaxed)
          const spawnDist = this._calculateDistance(
            spawnTx,
            spawnTy,
            tile.tx,
            tile.ty
          )
          if (spawnDist < relaxedSpawnMin) continue

          // Check distance from same item type (relaxed)
          const existingPlacements = placementsByType.get(itemType) || []
          const tooClose = existingPlacements.some(existing => {
            const dist = this._calculateDistance(
              existing.tx,
              existing.ty,
              tile.tx,
              tile.ty
            )
            return dist < currentMinDistance
          })

          if (
            !tooClose &&
            this.getTileType(tile.tx, tile.ty) === TileTypes.FLOOR
          ) {
            const key = `${tile.tx},${tile.ty}`
            this._guaranteedItemTiles.set(key, item)
            placedTiles.push(tile)

            if (!placementsByType.has(itemType)) {
              placementsByType.set(itemType, [])
            }
            placementsByType.get(itemType).push(tile)
            placed = true
          }
        }
      }

      // Final fallback: place at any available tile (best effort)
      if (!placed) {
        // Find best available tile by scoring all remaining tiles
        let bestTile = null
        let bestScore = -1

        for (const tile of shuffledTiles) {
          if (placedTiles.some(p => p.tx === tile.tx && p.ty === tile.ty)) {
            continue
          }
          if (this.getTileType(tile.tx, tile.ty) !== TileTypes.FLOOR) {
            continue
          }

          // Check minimum distance from same item type even in final fallback
          const existingPlacements = placementsByType.get(itemType) || []
          const tooClose = existingPlacements.some(existing => {
            const dist = this._calculateDistance(
              existing.tx,
              existing.ty,
              tile.tx,
              tile.ty
            )
            return dist < config.MinDistanceSameTypeFallback
          })

          if (tooClose) continue

          // Score this tile even with relaxed constraints
          const score = this._scoreTileForPlacementRelaxed(
            tile,
            spawnTx,
            spawnTy,
            placedTiles,
            placementsByType.get(itemType) || [],
            config.MinDistanceSameTypeFallback, // Still enforce minimum distance
            0 // No spawn distance requirement
          )

          if (score > bestScore) {
            bestScore = score
            bestTile = tile
          }
        }

        if (bestTile) {
          const key = `${bestTile.tx},${bestTile.ty}`
          this._guaranteedItemTiles.set(key, item)
          placedTiles.push(bestTile)

          if (!placementsByType.has(itemType)) {
            placementsByType.set(itemType, [])
          }
          placementsByType.get(itemType).push(bestTile)
          placed = true
        }
      }
    }
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
   * Calculates distance between two tile coordinates.
   *
   * @param {number} x1  - First tile X coordinate.
   * @param {number} y1  - First tile Y coordinate.
   * @param {number} x2  - Second tile X coordinate.
   * @param {number} y2  - Second tile Y coordinate.
   * @returns {number} Distance in tiles.
   * @access private
   */
  _calculateDistance(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1)
    const dy = Math.abs(y2 - y1)

    if (ItemPlacementConfig.UseEuclideanDistance) {
      return Math.sqrt(dx * dx + dy * dy)
    }
    // Manhattan distance
    return dx + dy
  }

  /**
   * Scores a tile for item placement based on distance from spawn, other items,
   * and accessibility.
   *
   * @param {{ tx: number; ty: number }} tile
   * - Tile to score.
   * @param {number} spawnTx
   * - Spawn tile X coordinate.
   * @param {number} spawnTy
   * - Spawn tile Y coordinate.
   * @param {Array} placedTiles
   * - Already placed tiles.
   * @param {Array} sameTypePlacements
   * - Placements of same item type.
   * @param {number} minDistance
   * - Minimum distance requirement.
   * @returns {number}
   * Score (higher is better, 0 means invalid).
   * @access private
   */
  _scoreTileForPlacement(
    tile,
    spawnTx,
    spawnTy,
    placedTiles,
    sameTypePlacements,
    minDistance
  ) {
    // Check if tile is already used
    if (placedTiles.some(p => p.tx === tile.tx && p.ty === tile.ty)) {
      return 0
    }

    // Check if it's a valid floor tile
    if (this.getTileType(tile.tx, tile.ty) !== TileTypes.FLOOR) {
      return 0
    }

    const config = ItemPlacementConfig

    // Check distance from spawn
    const spawnDist = this._calculateDistance(
      spawnTx,
      spawnTy,
      tile.tx,
      tile.ty
    )
    if (spawnDist < config.MinDistanceFromSpawn) return 0
    if (spawnDist > config.MaxDistanceFromSpawn) return 0

    // Check distance from same item type
    const tooClose = sameTypePlacements.some(existing => {
      const dist = this._calculateDistance(
        existing.tx,
        existing.ty,
        tile.tx,
        tile.ty
      )
      return dist < minDistance
    })

    if (tooClose) return 0

    // Calculate score: prefer tiles with good spacing
    let score = 100

    // Bonus for being at good distance from spawn (not too close, not too far)
    const idealSpawnDist =
      (config.MinDistanceFromSpawn + config.MaxDistanceFromSpawn) / 2
    const spawnDistScore = 100 - Math.abs(spawnDist - idealSpawnDist) * 2
    score += Math.max(0, spawnDistScore)

    // Bonus for being far from same-type items
    if (sameTypePlacements.length > 0) {
      const minSameTypeDist = Math.min(
        ...sameTypePlacements.map(existing =>
          this._calculateDistance(existing.tx, existing.ty, tile.tx, tile.ty)
        )
      )
      score += minSameTypeDist * 5
    }

    // Bonus for being far from all placed items (better distribution)
    if (placedTiles.length > 0) {
      const avgDist =
        placedTiles.reduce((sum, placed) => {
          return (
            sum +
            this._calculateDistance(placed.tx, placed.ty, tile.tx, tile.ty)
          )
        }, 0) / placedTiles.length
      score += avgDist * 2
    }

    return score
  }

  /**
   * Scores a tile for item placement with relaxed constraints (for fallback).
   *
   * @param {{ tx: number; ty: number }} tile
   * - Tile to score.
   * @param {number} spawnTx
   * - Spawn tile X coordinate.
   * @param {number} spawnTy
   * - Spawn tile Y coordinate.
   * @param {Array} placedTiles
   * - Already placed tiles.
   * @param {Array} sameTypePlacements
   * - Placements of same item type.
   * @param {number} minDistance
   * - Minimum distance requirement (may be 0).
   * @param {number} minSpawnDist
   * - Minimum spawn distance (may be 0).
   * @returns {number}
   * Score (higher is better, 0 means invalid).
   * @access private
   */
  _scoreTileForPlacementRelaxed(
    tile,
    spawnTx,
    spawnTy,
    placedTiles,
    sameTypePlacements,
    minDistance,
    minSpawnDist
  ) {
    // Check if tile is already used
    if (placedTiles.some(p => p.tx === tile.tx && p.ty === tile.ty)) {
      return 0
    }

    // Check if it's a valid floor tile
    if (this.getTileType(tile.tx, tile.ty) !== TileTypes.FLOOR) {
      return 0
    }

    const config = ItemPlacementConfig

    // Check distance from spawn (relaxed)
    const spawnDist = this._calculateDistance(
      spawnTx,
      spawnTy,
      tile.tx,
      tile.ty
    )
    if (spawnDist < minSpawnDist) return 0
    if (spawnDist > config.MaxDistanceFromSpawn) return 0

    // Check distance from same item type (relaxed)
    if (minDistance > 0) {
      const tooClose = sameTypePlacements.some(existing => {
        const dist = this._calculateDistance(
          existing.tx,
          existing.ty,
          tile.tx,
          tile.ty
        )
        return dist < minDistance
      })

      if (tooClose) return 0
    }

    // Calculate score with relaxed constraints
    let score = 50 // Lower base score for relaxed placement

    // Still prefer good spacing
    if (sameTypePlacements.length > 0) {
      const minSameTypeDist = Math.min(
        ...sameTypePlacements.map(existing =>
          this._calculateDistance(existing.tx, existing.ty, tile.tx, tile.ty)
        )
      )
      score += minSameTypeDist * 3
    }

    if (placedTiles.length > 0) {
      const avgDist =
        placedTiles.reduce((sum, placed) => {
          return (
            sum +
            this._calculateDistance(placed.tx, placed.ty, tile.tx, tile.ty)
          )
        }, 0) / placedTiles.length
      score += avgDist
    }

    return score
  }

  /**
   * Collects floor tile coordinates within a square radius to assign forced
   * spawns for guaranteed items. Uses a spiral pattern for better distribution.
   * Now spawn-aware to filter tiles by distance from spawn.
   *
   * @param {number} needed
   * - Number of floor tiles required.
   * @param {number} limit
   * - Radius (in tiles) to examine around the origin.
   * @param {number} spawnTx
   * - Spawn tile X coordinate.
   * @param {number} spawnTy
   * - Spawn tile Y coordinate.
   * @returns {Array.<{ tx: number; ty: number }>}
   */
  _collectFloorTiles(needed, limit, spawnTx = 0, spawnTy = 0) {
    const tiles = []
    const tileSet = new Set() // Avoid duplicates

    // Spiral outward from origin for better distribution
    for (let radius = 0; radius <= limit && tiles.length < needed; radius++) {
      // Top and bottom rows
      for (let tx = -radius; tx <= radius && tiles.length < needed; tx++) {
        this._addFloorTileIfValid(tiles, tileSet, tx, -radius, spawnTx, spawnTy)
        this._addFloorTileIfValid(tiles, tileSet, tx, radius, spawnTx, spawnTy)
      }

      // Left and right columns (excluding corners already covered)
      for (let ty = -radius + 1; ty < radius && tiles.length < needed; ty++) {
        this._addFloorTileIfValid(tiles, tileSet, -radius, ty, spawnTx, spawnTy)
        this._addFloorTileIfValid(tiles, tileSet, radius, ty, spawnTx, spawnTy)
      }
    }

    return tiles
  }

  /**
   * Divides tiles into zones for better spatial distribution.
   *
   * @param {Array}  tiles      - Array of tile coordinates.
   * @param {number} zoneCount  - Number of zones to create.
   * @param {number} spawnTx    - Spawn tile X coordinate.
   * @param {number} spawnTy    - Spawn tile Y coordinate.
   * @returns {Array[]} Array of zone arrays, each containing tiles.
   * @access private
   */
  _divideIntoZones(tiles, zoneCount, spawnTx, spawnTy) {
    if (zoneCount <= 1 || tiles.length === 0) {
      return [tiles]
    }

    // Create zones based on angular division around spawn
    const zones = Array.from({ length: zoneCount }, () => [])

    for (const tile of tiles) {
      // Calculate angle from spawn to tile
      const dx = tile.tx - spawnTx
      const dy = tile.ty - spawnTy
      const angle = Math.atan2(dy, dx) // Range: -PI to PI

      // Convert to 0 to 2*PI range
      const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle

      // Assign to zone based on angle
      const zoneIndex =
        Math.floor((normalizedAngle / (Math.PI * 2)) * zoneCount) % zoneCount

      zones[zoneIndex].push(tile)
    }

    return zones
  }

  /**
   * Helper to add a floor tile if valid and not already added.
   * Filters by distance from spawn if spawn coordinates provided.
   *
   * @param {Array}  tiles    - Array to add tile to.
   * @param {Set}    tileSet  - Set tracking already added tiles.
   * @param {number} tx       - Tile X coordinate.
   * @param {number} ty       - Tile Y coordinate.
   * @param {number} spawnTx  - Spawn tile X coordinate.
   * @param {number} spawnTy  - Spawn tile Y coordinate.
   * @returns {void}
   * @access private
   */
  _addFloorTileIfValid(tiles, tileSet, tx, ty, spawnTx = 0, spawnTy = 0) {
    const key = `${tx},${ty}`
    if (tileSet.has(key)) return

    if (this.getTileType(tx, ty) !== TileTypes.FLOOR) return

    // Check distance from spawn
    const config = ItemPlacementConfig
    const spawnDist = this._calculateDistance(spawnTx, spawnTy, tx, ty)
    if (spawnDist < config.MinDistanceFromSpawn) return
    if (spawnDist > config.MaxDistanceFromSpawn) return

    tiles.push({ tx, ty })
    tileSet.add(key)
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
