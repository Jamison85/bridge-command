# Audio placeholders

The simulator currently generates fallback sounds in the browser through the Web Audio API.

Optional real files can be added here later using these names:

- `bridge_ambience_loop.mp3`
- `engine_pulse_loop.mp3`
- `button_confirm_01.wav`
- `panel_beep_01.wav`
- `lever_clunk_01.wav`
- `scan_ping_01.wav`
- `alert_soft_loop.mp3`
- `warp_charge_01.wav`

If a file is missing, the app keeps running with generated placeholder audio instead of failing silently like a dramatic little toaster.
