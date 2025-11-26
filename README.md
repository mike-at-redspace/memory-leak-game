# Memory Leak 🧠

> **Manage your RAM. Don't crash.**

**Memory Leak** is a minimalist browser game focused on survival and resource management. Players must collect cache fragments to keep a character alive while avoiding hazards within a procedurally generated environment that simulates volatile computer memory.

## 🚀 Getting Started

Follow these steps to set up the game locally:

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run in development mode:**

    ```bash
    npm run dev
    ```

3.  **Build for production:**

    ```bash
    npm run build
    ```

4.  **Preview the built output:**
    ```bash
    npm run preview
    ```

## 🏗️ Project Structure & Architecture

The project architecture separates the core game loop from the configuration data to ensure scalability.

### Entry Point (`src/main.js`)

This is the entry point that boots the `GameEngine`. It serves as the central hub, wiring together the following subsystems:

- **Renderer:** Handles visual output and canvas manipulation.
- **World & Player:** Manages game state, entity positioning, and procedural generation.
- **Input Controller:** processes keyboard/mouse events.
- **Audio & HUD:** Manages sound effects and the Heads-Up Display overlay.

### Core Systems (`src/core/`)

Handles the primary classes that drive the runtime loop. `GameEngine`, `Renderer`, and `AudioController` sit alongside subdirectories such as `core/system` and `core/ui`, making it easy to reason about the engine, factory-like helpers (floating text/presentation), and input wiring without touching configuration data.

### Folder Tree

```
src/
├── core/
│   ├── engine.js
│   ├── renderer.js
│   ├── audio.js
│   ├── system/
│   │   └── input-controller.js
│   └── ui/
│       └── hud.js
├── world/
│   ├── camera.js
│   ├── player.js
│   └── world.js
├── config/
│   ├── index.js
│   ├── styles.js
│   └── items.js
├── utils/
│   ├── environment.js
│   └── math.js
└── main.js
```

### Runtime Utilities (`src/utils/environment.js`)

Exports safe globals for `window`, `document`, `fetch`, and `AudioContext`, enabling audio helpers and network calls to fall back gracefully when the game runs outside a browser.

`src/utils/math.js` now holds deterministic helpers like `seededRandom`, `lerp`, and `clamp`, keeping pure functions isolated from the class-heavy entry points.

### Configuration (`src/config/index.js`)

Central configuration exports live under `src/config/`. They surface:

- **`styles.js`**: visual primitives like `ScreenConfig`, `LayoutConfig`, `Fonts`, `Colors`, and `HudConfig` plus the aggregated `UIConfig`.
- **`items.js`**: the `ITEM_REGISTRY` that drives in-game collectibles and lookup helpers.
- **`index.js`**: re-exports the physics/sprite stats, `TARGET_ITEMS`, `GameStates`, camera/collision constants, and `ITEM_REGISTRY` so gameplay modules can consume them from a single entry point.
- **`render.js`**: surface `ParticleConfig` for HUD/renderer helpers that draw floating text.
- **`sound.js`**: exposes `SoundPresets` (collect, damage, power-up) for procedural audio helpers without sprinkling constants across classes.
