# Store Pilot

A calm, mobile-first Store Pilot for running a retail shift without turning the screen into a haunted spaceship dashboard.

## Current direction

The active `main` branch has been reset from the cockpit experiment into a clean premium mobile app.

The useful Store Pilot workflow remains:

- Next Best Action
- task checklist
- shift progress
- incident / delay report generator
- saved reports and notes
- voice / dictation note capture
- local device storage
- GitHub Pages deployment

The failed cockpit / Three.js visual experiment has been archived on this branch:

```txt
cockpit-experiment-archive
```

That branch preserves the previous sci-fi prototype for reference without letting it keep bullying the live app.

## Active files

```txt
/
├── index.html        # Clean mobile app shell
├── css/
│   └── style.css     # Premium Store Pilot UI styling
├── js/
│   └── main.js       # Store Pilot app controller and local storage
└── README.md
```

Some old experimental files may still exist in the repo history or directory, but the active app no longer depends on them.

## Store workflow modules

The reset app includes practical shift tools for a Casey's store manager:

- Bookwork / SmartSafe match
- Smart Counts
- LTO screenshot reminder
- Daily walk
- coffee and fountain reset
- open-air cooler dates
- food warmers
- restrooms
- shift note / handoff
- Monday store order
- Tuesday cigarette audits
- Tuesday backstock reset
- Wednesday truck prep and triage
- Sunday outs

Tasks are saved by local date in `localStorage`, so the device remembers what is complete for the day.

## Run locally

This is a static app. Serve it from a small local server:

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
