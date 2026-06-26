# Bridge Command

A mobile-optimized Three.js Starship Bridge Simulator designed for GitHub Pages.

## Local structure

```txt
/
├── index.html           # Main entry point, sets up the Three.js canvas and UI overlay
├── css/
│   └── style.css        # All HUD and tactile dashboard styling
├── js/
│   ├── main.js          # Main Three.js loop and scene initialization
│   ├── controls.js      # Lever/button creation, raycasting, and interaction logic
│   └── audio.js         # Web Audio API handler for bridge hums and sound effects
└── assets/
    ├── audio/           # Placeholder for premium CC0 sounds
    └── textures/        # Placeholder for space/console textures
```

## GitHub Pages

Use **Settings → Pages → Deploy from a branch → main / root**.

After deployment, the app should be available at:

```txt
https://jamison85.github.io/bridge-command/
```

## Audio assets

The simulator now has procedural generated audio fallback, so it makes sound even if no audio files are uploaded. Fancy? Sort of. Legally boring? Blessedly, yes.

Optional premium CC0/Public Domain audio files can still be placed in:

```txt
assets/audio/
```

Expected filenames:

- `bridge_ambience_loop.mp3`
- `engine_pulse_loop.mp3`
- `button_confirm_01.wav`
- `panel_beep_01.wav`
- `lever_clunk_01.wav`
- `scan_ping_01.wav`
- `alert_soft_loop.mp3`
- `warp_charge_01.wav`

If any file is missing, the app generates a fallback sound in the browser instead of crashing like a dramatic toaster.
