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
- Real store-manager workflow panel
- Next Action engine for shift priorities
- Task completion tracking with local storage
- Incident / delay report generator
- Captain's Log notes
- Voice note capture with speech recognition fallback
- History screen for saved reports, notes, voice notes, and completed tasks

## Directory structure

```txt
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── controls.js
│   ├── storePilot.js
│   └── audio.js
└── assets/
    ├── README.md
    ├── audio/
    │   └── README.md
    └── textures/
        └── README.md
```

## Store workflow modules

The `js/storePilot.js` module contains the retail workflow brain:

- Morning opening priorities
- SmartSafe / bookwork flow
- Smart Counts
- LTO screenshot reminder
- Daily walk
- Coffee / fountain supplies
- BIB checks
- Food warmers
- Open-air cooler rotation
- Restrooms
- Shift notes
- Monday store order
- Tuesday cigarette audits and backstock
- Wednesday truck prep and truck triage
- Sunday outs

The app scores tasks by due time, shift, day of week, weekly routines, and urgency. It saves completed tasks and logs locally on the device.

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
