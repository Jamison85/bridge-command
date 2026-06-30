# Store Pilot Stabilization + Intelligence Pass

This pass preserves the existing Store Pilot app and adds an integration layer instead of redesigning the app from scratch.

## Preserved working features

- Shift selector: Morning / Mid / Close
- Next Best Action
- Tasks list
- Daily Walk / Finish Walk behavior
- Delay and carry-forward task states
- Report generator
- Log / handoff generator
- Handoff Variety v4
- New Message Version button
- Smart Shift Brain panel
- Make Smart Handoff button
- Optional API endpoint flow
- Local fallback if API fails
- Production tools
- PWA install support

## Added

### `js/stability-intelligence.js`

Adds a coordinated stabilization and intelligence layer:

- Reads existing Store Pilot localStorage keys without renaming them.
- Computes store status: Green / Yellow / Red.
- Computes recommendation confidence: Low / Medium / High.
- Explains the recommended next task.
- Explains what happens if the task waits.
- Adds a Shift Intelligence card to the Next Best Action hero area.
- Polishes handoff buttons for readability and consistent tap targets.
- Adds a lightweight `window.StorePilotQA()` check for critical UI pieces.

### `js/handoff-controls.js`

Now dynamically loads `stability-intelligence.js` so the stabilization layer reaches the main runtime without disturbing the existing `pwa.js` import chain.

## QA checks

Open the app and run this in the browser console if needed:

```js
window.StorePilotQA()
```

Expected critical flows:

- Log renders.
- Smart Shift Brain appears in Log.
- New Message Version is visible and readable.
- Finish Walk adds follow-ups and marks the walk complete.
- Make Smart Handoff rewrites the editable handoff message.
- Next Best Action shows a Shift Intelligence explanation.

## Test URL

Use a versioned URL after deployment:

```text
https://jamison85.github.io/bridge-command/?v=stabilization-pass
```
