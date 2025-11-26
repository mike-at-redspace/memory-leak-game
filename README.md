# Memory Leak 🧠

> **Manage your RAM. Don’t crash.**

**Memory Leak** is a minimalist browser game focused on survival and resource management. Players collect cache fragments to keep their character alive while avoiding hazards inside a procedurally generated environment that simulates volatile computer memory.

---

## 🚀 Getting Started

Set up the game locally with these steps:

1. **Install dependencies**

```bash
npm install
```

2. **Run in development mode**

```bash
npm run dev
```

3. **Build for production**

```bash
npm run build
```

4. **Preview the built output**

```bash
npm run preview
```

---

## 🏗️ Project Architecture

The codebase separates the core game loop from configuration and utilities to ensure maintainability and scalability.

### Entry Point (`src/main.js`)

Bootstraps the `GameEngine` and orchestrates all subsystems:

- **Renderer** – handles canvas rendering and visual output.
- **World & Player** – manages game state, entity positions, and procedural generation.
- **Input Controller** – processes keyboard and mouse events.
- **Audio & HUD** – manages sound effects and the heads-up display overlay.

### Core Systems (`src/core/`)

Contains classes that drive the runtime:

- `GameEngine`, `Renderer`, `AudioController`
- Subdirectories:
  - `system/` – input controllers, event wiring
  - `ui/` – HUD, floating text, and other presentation helpers

This structure keeps runtime logic and helper systems separate from configuration, making the engine easier to reason about.

### Folder Structure

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

### Runtime Utilities (`src/utils/`)

- **`environment.js`** – safe globals for `window`, `document`, `fetch`, and `AudioContext`, enabling audio and network helpers to gracefully fallback outside the browser.
- **`math.js`** – deterministic, pure functions like `seededRandom`, `lerp`, and `clamp`.

### Configuration (`src/config/`)

Centralized configuration for maintainable gameplay logic:

- **`styles.js`** – visual primitives, fonts, colors, HUD settings, and the aggregated `UIConfig`.
- **`items.js`** – `ITEM_REGISTRY` for collectibles and lookup helpers.
- **`index.js`** – re-exports physics, sprite stats, `TARGET_ITEMS`, `GameStates`, camera/collision constants, and `ITEM_REGISTRY` for easy consumption across modules.
- **`render.js`** – exposes `ParticleConfig` for HUD and renderer helpers.
- **`sound.js`** – `SoundPresets` for collection, damage, and power-up events, keeping procedural audio constants centralized.
