# Store Bridge Simulator

A high-performance, mobile-first Starship Bridge Simulator for piloting a retail shift.

## What is included

- Full-screen Three.js scene
- EffectComposer bloom pass
- Procedural starfield
- Programmatic 3D dashboard primitives
- Large tactile button banks
- Draggable 3D throttle lever
- Warp threshold particle-streak animation
- Glassmorphism HUD overlay
- Generated placeholder Web Audio effects
- Static GitHub Pages friendly architecture

## Directory structure

```txt
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── controls.js
│   └── audio.js
└── assets/
    ├── README.md
    ├── audio/
    │   └── README.md
    └── textures/
        └── README.md
```

## Run locally

Because this uses ES modules and an import map, serve it from a local web server instead of opening the file directly.

```bash
python -m http.server 5173
```

Then open:

```txt
http://localhost:5173
```

## GitHub Pages

Use:

```txt
Settings → Pages → Deploy from branch → main → root
```

After deployment, the app should be available at:

```txt
https://jamison85.github.io/bridge-command/
```

## Audio

Audio is currently generated with Web Audio placeholders. Real files can be dropped into `assets/audio/` later and wired into `js/audio.js` without changing the rest of the simulator.
