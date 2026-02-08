# Subway Runner 3D

A 3D endless runner game built with HTML5, JavaScript, and Three.js.

## How to Run

This game runs directly in the browser but requires a local web server to load assets correctly (due to CORS security policies).

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, etc.)
- Python (recommended) OR Node.js OR a simple web server extension.

### Quick Start (Windows)

1.  Double-click `run_game.bat` in this folder.
2.  It will attempt to start a local server and open the game in your browser.

### Manual Start

If the script doesn't work, open a terminal/command prompt in this folder and run one of the following commands:

**Using Python:**
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Using Node.js (npx):**
```bash
npx http-server .
```

**Using VS Code:**
- Install the "Live Server" extension.
- Right-click `index.html` and select "Open with Live Server".

## Controls

- **Jump**: Up Arrow / W / Space
- **Roll**: Down Arrow / S
- **Left**: Left Arrow / A
- **Right**: Right Arrow / D
- **Pause**: P / ESC

## Credits

Built with [Three.js](https://threejs.org/).
