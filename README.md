# VIRAMAYAK'26 — 3D Interactive Flipbook & Digital Booklet Viewer

A modern, responsive, 3D interactive digital booklet viewer engineered for **"VIRAMAYAK'26 - An Evening of Music, Rhythm & Memories"**, organized by the **Students' Union, Faculty of Engineering, University of Sri Jayewardenepura**.

---

## 🌟 Key Features

### 1. Dynamic & Adaptive Multi-Device Layout
- **Desktop & Large Displays (≥ 1024px)**: Realistic dual-page spread (Booklet mode) with 3D spine depth, dynamic page shadows, hardcover textures, and perspective folding.
- **Tablets & Foldables (768px – 1023px)**: Smart auto-adapting layout that intuitively switches between **Dual-Page Spread** in landscape orientation and **Single-Page Mode** in portrait orientation.
- **Mobile Phones (< 768px)**: Seamless auto-fit vertical single-page presentation with zero overflow, optimized touch margins, and notch / safe-area support (`env(safe-area-inset-*)`).
- **Dynamic Auto-Scaling**: The flipbook container automatically recalculates dimensions, preserves exact ISO A4 aspect ratio (`1230 : 1754`), and centers itself on window resize or orientation shift.

### 2. High-Fidelity Concert Aesthetics
- **Theme**: Deep Violet (`#06020e`), royal purple gradients, concert stage spotlights, and luminous accent gold (`#f59e0b`).
- **Ambient Lighting**: Animated stage spotlights and an interactive HTML5 Canvas particle system generating rising golden concert dust and violet bokeh.

### 3. Touch Interactions & Zoom Engine
- **Touch Swipe & Page Drag**: Realistic drag-to-turn from page corners and edges on mobile and desktop.
- **Pinch-to-Zoom**: Two-finger pinch gesture on mobile devices.
- **Double-Tap / Double-Click**: Fast zoom to 2x centered at the tapped position; double-tap again to reset.
- **Pan & Navigate**: Smooth mouse drag and touch pan when zoomed in.

### 4. Interactive Glassmorphic Control Dock
- **Navigation**: Previous / Next buttons, First / Last page buttons, and interactive page counter badge.
- **Interactive Scrubber**: Timeline slider to scrub across pages with live progress.
- **Page Overview / Thumbnails Drawer**: Visual grid of all 8 pages for instant jumping.
- **Realistic Page-Turn Sound Effects**: Realistic paper flutter sound with zero-latency Web Audio API synthesis fallback.
- **Ethereal Concert Ambience**: Optional orchestral strings / ambient drone pad created with Web Audio API.
- **Auto-Flip Slideshow**: Automated presentation mode with a synchronized progress bar.
- **PDF Download**: Direct one-click download of the original `VIRAMAYAK-26-Souvenir-Booklet.pdf`.
- **Teaser Video Player**: Built-in video modal playing the official `viramayak-preview.mp4`.
- **Alumni Messages Transcript**: Full text and profile photos of distinguished alumni messages (Windhula Gammanpila, Daham T. Adikari, Chamod Jayasinghe).

---

## 📂 Project Directory Structure

```
├── index.html                     # Main application entry point
├── css/
│   └── styles.css                 # Responsive stylesheet, animations & safe areas
├── js/
│   ├── page-flip.browser.js       # StPageFlip 3D flipbook engine
│   ├── audio.js                   # Web Audio & sound effect controller
│   └── app.js                     # Main application controller, gestures & particles
├── assets/
│   ├── images/
│   │   ├── page-01.jpg            # Page 1: Cover "VIRAMAYAK'26"
│   │   ├── page-02.jpg            # Page 2: Windhula Gammanpila's message
│   │   ├── page-03.jpg            # Page 3: Daham T. Adikari's message
│   │   ├── page-04.jpg            # Page 4: Chamod Jayasinghe's message
│   │   ├── page-05.jpg            # Page 5: Sith Paura commemorative
│   │   ├── page-06.jpg            # Page 6: USJ Engineering parchment
│   │   ├── page-07.jpg            # Page 7: Symphony & Memories
│   │   └── page-08.jpg            # Page 8: Back cover
│   ├── audio/
│   │   └── page-flip.wav          # High-fidelity page turn sound effect
│   ├── pdf/
│   │   └── 1000033374.pdf         # Original souvenir booklet PDF
│   └── video/
│       └── viramayak-preview.mp4  # Official concert teaser preview video
├── package.json
└── README.md
```

---

## 🚀 How to Run

You can open `index.html` directly in any modern web browser, or run a local development server:

```bash
# Using Node / npx:
npx serve -l 3000 .

# Or using Python:
python -m http.server 3000
```

Then visit **`http://localhost:3000`** in your browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `←` / `Page Up` | Flip to Previous Page |
| `→` / `Space` / `Page Down` | Flip to Next Page |
| `Home` | Jump to Front Cover (Page 1) |
| `End` | Jump to Back Cover (Page 8) |
| `F` | Toggle Fullscreen |
| `Esc` | Close any active modal / Reset Zoom |
| `Ctrl + Scroll` | Zoom In / Out |

