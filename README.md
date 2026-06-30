# Coin Collect

A browser-based dungeon crawler built with TypeScript and Vite. Explore procedurally generated floors, collect coins, find a sword, fight snakes, and descend deeper into the dungeon.

## How to play

| Action | Controls |
|--------|----------|
| Move | `WASD` or `Arrow keys` |
| Attack (with sword) | `Space` |

### Goal

- Collect **gold coins** for points
- Survive snake attacks — you have an **HP bar**, not instant death
- Find the **sword** in your first room on Depth 1
- Locate the **▼ Down** stairs (purple tile in the **center** of a room) to reach deeper, harder floors
- Go as deep as you can and rack up a high **score**

### Scoring

- **+1** per coin collected
- **+3** per snake slain
- **+15** each time you descend to a new depth

## Game features

- **Procedural dungeons** — each run generates a new layout of connected rooms
- **Depth progression** — snakes get longer and faster as you go deeper
- **Multiple rooms per floor** — use gold doors on the edges to move between rooms
- **Center stairs** — down/up stairs are floor tiles in the middle of a room (they do not replace edge doors)
- **Sword combat** — pick up the sword, face a snake with the white direction indicator, and swing with Space
- **HP system** — brief invincibility after each hit; game over only when HP reaches zero

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)

### Install and run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

The built files are output to `dist/`.

## Project structure

```
coin-collect/
├── index.html          # Entry HTML
├── src/
│   ├── main.ts         # Game logic, rendering, procedural generation
│   └── style.css       # Menu and UI styles
├── package.json
└── tsconfig.json
```

## Tech stack

- **TypeScript**
- **Vite** — dev server and bundler
- **Canvas 2D** — all gameplay rendering

## License

Private project — all rights reserved unless otherwise specified.
