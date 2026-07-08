const TONE_KEY = 'storePilot.handoffTone.v1';
const VARIANT_KEY = 'storePilot.handoffVariant.v1';
const DATA_KEYS = {
  completed: 'storePilot.completed.v6',
  customTasks: 'storePilot.customTasks.v6',
  shift: 'storePilot.shift.v6',
  states: 'storePilot.taskStates.v6',
  templates: 'storePilot.templates.v7'
};
const SHIFT_LABELS = { morning: 'Morning', mid: 'Mid', close: 'Close' };
const FALLBACK_TASKS = {
  morning: ['Bookwork / SmartSafe match', 'Smart Counts', 'LTO screenshot to Loretta', 'Morning walk', 'Coffee and fountain reset', 'Open-air cooler dates', 'Food warmers check', 'Morning handoff note'],
  mid: ['Mid-shift floor reset walk', 'Coffee / fountain recovery', 'Cooler and fresh food check', 'Restrooms and trash pass', 'Backstock / back room quick reset', 'Mid-shift handoff note'],
  close: ['Closing walk and recovery', 'Fresh food / cooler date pass', 'Coffee and fountain close reset', 'Restrooms, trash, and floor', 'Lock doors / closing timing', 'Closing handoff note']
};
const TONES = [
  ['normal', 'Normal'],
  ['busy', 'Busy'],
  ['short', 'Short'],
  ['pro', 'Professional'],
  ['rough', 'Rough Day'],
  ['smooth', 'Smooth']
];
let lastSignature = '';
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function shift() { const saved = read(DATA_KEYS.shift, 'close'); return SHIFT_LABELS[saved] ? saved : 'close'; }
function key() { return `${dayKey()}:${shift()}`; }
function taskFromTitle(title, index) { return { id: `fallback-${shift()}-${index}`, title, area: 'Shift', minutes: 10 }; }
function allTasks() {
  const templates = read(DATA_KEYS.templates, {});
  const custom = read(DATA_KEYS.customTasks, {})[key()] || [];
  const base = templates[shift()] || FALLBACK_TASKS[shift()].map(taskFromTitle);
  return [...base, ...custom];
}
function handoffData() {
  const tasks = allTasks();
  const done = new Set(read(DATA_KEYS.completed, {})[key()] || []);
  const states = read(DATA_KEYS.states, {})[key()] || {};
  const completed = tasks.filter((task) => done.has(task.id));
  const unfinished = tasks.filter((task) => !done.has(task.id));
  const delayed = unfinished.filter((task) => states[task.id]?.type === 'delayed');
  const carried = unfinished.filter((task) => states[task.id]?.type === 'carry');
  const open = unfinished.filter((task) => !states[task.id]);
  return { completed, delayed, carried, open, states };
}
function lineItems(items, empty, data) {
  if (!items.length) return `- ${empty}`;
  return items.slice(0, 10).map((item) => {
    const note = data.states[item.id]?.reason;
    return `- ${item.title}${note ? ` - ${note}` : ''}`;
  }).join('\n');
}
function combinedFollowups(data) { return [...data.delayed, ...data.carried, ...data.open]; }
function currentChoices(tone, data) {
  const label = SHIFT_LABELS[shift()];
  const followups = combinedFollowups(data);
  const done = lineItems(data.completed, 'Nothing checked off yet.', data);
  const still = lineItems(followups, 'Nothing major still left on the list.', data);
  const set = {
    normal: [
      `Hey Loretta, quick update from today.\n\nDone:\n${done}\n\nStill needs attention:\n${still}\n\nI documented what had to move so it does not get lost.`,
      `Hey Loretta, here is where I landed today.\n\nGot done:\n${done}\n\nStill not finished:\n${still}\n\nI marked the stuff that had to wait so it is clear for follow-up.`,
      `Hey Loretta, quick ${label.toLowerCase()} handoff.\n\nChecked off:\n${done}\n\nStill left:\n${still}\n\nThat is where it landed today.`
    ],
    busy: [
      `Hey Loretta, today got pretty busy, so I had to prioritize what I could.\n\nDone:\n${done}\n\nStill not finished:\n${still}\n\nI marked what had to wait so it is clear what happened.`,
      `Hey Loretta, quick update. With the rush/coverage today, this is where things landed.\n\nGot done:\n${done}\n\nStill needs attention:\n${still}\n\nI documented the rest instead of leaving it vague.`,
      `Hey Loretta, today was one of those busy ones.\n\nChecked off:\n${done}\n\nHad to wait:\n${still}\n\nI noted the reasons so it is easy to see what happened.`
    ],
    short: [
      `Hey Loretta, quick handoff:\n\nDone:\n${done}\n\nStill needs attention:\n${still}\n\nThat is where I landed.`,
      `Hey Loretta, quick update:\n\nGot done:\n${done}\n\nStill not finished:\n${still}`,
      `Hey Loretta, ${label.toLowerCase()} update:\n\nDone:\n${done}\n\nStill needs attention:\n${still}`
    ],
    pro: [
      `Hey Loretta, here is my shift update.\n\nCompleted:\n${done}\n\nStill needs attention:\n${still}\n\nI noted the unfinished items with reasons so they are easy to follow up on.`,
      `Hey Loretta, here is the ${label.toLowerCase()} update.\n\nCompleted items:\n${done}\n\nItems still needing attention:\n${still}\n\nI documented the reasons where something had to wait.`,
      `Hey Loretta, quick shift summary.\n\nCompleted:\n${done}\n\nPending / still needs attention:\n${still}\n\nEverything unfinished is noted with the reason I had.`
    ],
    rough: [
      `Hey Loretta, today had a few things that slowed me down.\n\nI got these done:\n${done}\n\nThese are still not finished:\n${still}\n\nI wanted to document it clearly so it does not look like it was just missed.`,
      `Hey Loretta, today did not go as clean as I wanted.\n\nDone:\n${done}\n\nStill needs attention:\n${still}\n\nI noted what happened so there is a clear record.`,
      `Hey Loretta, rougher day today.\n\nGot done:\n${done}\n\nHad to leave / move:\n${still}\n\nI documented the reasons so it is not vague later.`
    ],
    smooth: [
      `Hey Loretta, today went pretty smooth overall.\n\nDone:\n${done}\n\nStill watching:\n${still}\n\nNothing major, just sending the update so it is all in one place.`,
      `Hey Loretta, pretty normal day overall.\n\nChecked off:\n${done}\n\nStill needs attention:\n${still}\n\nNothing too wild.`,
      `Hey Loretta, smooth shift overall.\n\nDone:\n${done}\n\nStill left:\n${still}\n\nJust wanted it documented in one spot.`
    ]
  };
  return set[tone] || set.normal;
}
function messageFor(tone, variant, data) {
  const choices = currentChoices(tone, data);
  return choices[variant % choices.length];
}
function installToneStyles() {
  if (document.querySelector('#v2-tone-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-tone-style';
  style.textContent = '.v2-tone{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.v2-tone button{min-height:38px;border:0;border-radius:14px;background:#e9eee6;color:#073f2f;font-weight:950;font-size:.78rem}.v2-tone button.active{background:linear-gradient(180deg,#0f513d,#073f2f);color:white}@media(max-width:430px){.v2-tone{grid-template-columns:repeat(2,1fr)}}';
  document.head.appendChild(style);
}
function rotateToneVersion(event) {
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  const tone = read(TONE_KEY, 'normal');
  const data = handoffData();
  const count = currentChoices(tone, data).length;
  write(VARIANT_KEY, (read(VARIANT_KEY, 0) + 1) % count);
  lastSignature = '';
  applyToneHandoff(true);
}
function applyToneHandoff(force = false) {
  installToneStyles();
  const box = document.querySelector('#v2-message');
  const handoff = document.querySelector('.v2-handoff');
  if (!box || !handoff) return;
  const tone = read(TONE_KEY, 'normal');
  const variant = read(VARIANT_KEY, 0);
  const data = handoffData();
  const signature = JSON.stringify({ tone, variant, done: data.completed.map((x) => x.id), delayed: data.delayed.map((x) => x.id), carried: data.carried.map((x) => x.id), open: data.open.map((x) => x.id), states: data.states });
  let selector = handoff.querySelector('.v2-tone');
  if (!selector) {
    selector = document.createElement('div');
    selector.className = 'v2-tone';
    selector.innerHTML = TONES.map(([id, label]) => `<button type="button" data-v2-tone="${id}">${label}</button>`).join('');
    handoff.querySelector('.v2-stats')?.insertAdjacentElement('afterend', selector);
  }
  selector.querySelectorAll('[data-v2-tone]').forEach((button) => {
    button.classList.toggle('active', button.dataset.v2Tone === tone);
    button.onclick = () => { write(TONE_KEY, button.dataset.v2Tone); write(VARIANT_KEY, 0); lastSignature = ''; applyToneHandoff(true); };
  });
  const version = document.querySelector('#v2-version');
  if (version && !version.dataset.toneBound) {
    version.dataset.toneBound = 'true';
    version.addEventListener('click', rotateToneVersion, true);
  }
  if (force || signature !== lastSignature || /needs another window|highest-impact work|No reply needed unless|hanging from the list|Still hanging/i.test(box.value)) {
    box.value = messageFor(tone, variant, data);
    lastSignature = signature;
  }
}
document.addEventListener('click', (event) => {
  if (event.target?.closest?.('#v2-version')) rotateToneVersion(event);
  setTimeout(applyToneHandoff, 60);
}, true);
document.addEventListener('change', () => setTimeout(applyToneHandoff, 60));
setInterval(applyToneHandoff, 500);
setTimeout(applyToneHandoff, 400);
