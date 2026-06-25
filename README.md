# Bridge Command

A mobile-optimized Three.js Starship Bridge Simulator designed for GitHub Pages.

## Local structure

```txt
/index.html
/css/style.css
/js/main.js
/assets/audio/
/assets/textures/
```

## GitHub Pages

Use **Settings → Pages → Deploy from a branch → main / root**.

After deployment, the app should be available at:

```txt
https://jamison85.github.io/bridge-command/
```

## Audio assets

Place CC0/Public Domain audio files in:

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

The simulator still runs if audio files are missing. It will log a warning instead of crashing, because that is the bare minimum we ask from civilization.
