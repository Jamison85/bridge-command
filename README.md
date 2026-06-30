# Store Pilot

Store Pilot is a calm, mobile-first retail shift command center built for fast-moving store work. It is designed to reduce cognitive load, keep the next action obvious, and create professional end-of-shift handoffs.

Live app:

```txt
https://jamison85.github.io/bridge-command/
```

## Current production direction

The active `main` branch is now a polished mobile PWA. The older cockpit / Three.js experiment is archived on:

```txt
cockpit-experiment-archive
```

That branch preserves the visual experiment without affecting the live app.

## Core workflow

Store Pilot supports:

- Morning / Mid / Close shift modes
- Next Best Action dashboard
- shift progress tracking
- editable shift templates
- task checklist with Done, Delay, and Carry controls
- Active Task focus mode with timer, pause, done, delay, carry, and note actions
- voice/text command capture
- incident and delay reports
- positive end-of-day review and handoff message
- Loretta / Richard / Both handoff targeting
- quick, detailed, issue-focused, and positive handoff tones
- local device storage
- installable PWA behavior
- basic offline app shell after first load
- production tools for QA and resets

## Task behavior

Tasks are stored locally by date and shift using `localStorage`.

A task can be:

- completed
- delayed with a reason
- carried forward to another shift or tomorrow
- created from voice/text capture
- created from a shift template

Delayed and carried items are removed from the active workflow and remain documented for the End-of-Day Review.

## Voice commands

The app understands simple text or speech commands such as:

```txt
mark coffee done
delay cooler because short staffed
carry restrooms to close
note IT was called
report power outage and register issue
add wipe down cooler doors
```

## End-of-day handoff

The Log screen becomes an End-of-Day Review. It summarizes:

- completed work
- delayed work
- carry-forward items
- still-watching items
- saved notes and reports

The handoff can be adjusted by recipient and tone before sending through native share/text.

## Production tools

The Templates screen includes a Production Tools card with:

- Run QA
- Reset Shift
- Reset Today
- Reset Install Hint
- Reset Templates

These tools are meant for safe maintenance during testing and daily use. Reset buttons clear local device data only. They do not change repository files or any external system.

## Active files

```txt
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── icons/
│   └── store-pilot-icon.svg
├── css/
│   ├── style.css
│   ├── handoff.css
│   ├── followups.css
│   ├── review.css
│   ├── templates.css
│   ├── polish.css
│   ├── manager-mode.css
│   ├── pwa.css
│   └── production-tools.css
├── js/
│   ├── main-v7.js
│   ├── review-layer.js
│   ├── review-template-aware.js
│   ├── voice-commands.js
│   ├── voice-template-aware.js
│   ├── active-task.js
│   ├── followup-cleanup.js
│   ├── state-polish.js
│   ├── production-tools.js
│   └── pwa.js
└── README.md
```

## Local development

This is a static app. Serve it from a small local server:

```bash
python -m http.server 5173
```

Then open:

```txt
http://localhost:5173
```

## GitHub Pages deployment

Use:

```txt
Settings → Pages → Deploy from branch → main → root
```

After deployment, the app is available at:

```txt
https://jamison85.github.io/bridge-command/
```

## Installed app notes

On Android Chrome, use:

```txt
Menu → Add to Home screen / Install app
```

After code updates, the installed PWA may need to be fully closed and reopened so the service worker can update cached files.
