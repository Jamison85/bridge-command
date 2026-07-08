const SHIFT_FIX_KEY = 'storePilot.shift.v6';
const TRUCK_KEY = 'storePilot.truckDay.v1';
const VALID_SHIFTS = ['morning', 'mid', 'close'];
const TRUCK_ITEMS = [
  'Confirm register coverage before truck work starts',
  'Clear receiving / front-door path for truck staging',
  'Stage carts, totes, or flatbed for Center Store product',
  'Separate priority outs from regular backstock',
  'Work open-air cooler and fresh priority first if needed',
  'Work customer-facing Center Store outs before deep backstock',
  'Keep back room path clear and stacks safe',
  'Break down cardboard and trash as coverage allows',
  'Document what could not be worked because of coverage or rush',
  'Send follow-up note if truck work pushes normal shift tasks'
];
const TRUCK_TASKS = [
  { id: 'truck-receiving-staging', title: 'Truck receiving / staging', area: 'Truck', minutes: 25, detail: 'Clear receiving path, stage carts/totes, and keep coverage protected.' },
  { id: 'truck-priority-outs', title: 'Truck priority outs', area: 'Center Store', minutes: 30, detail: 'Work customer-facing outs first before regular backstock.' },
  { id: 'truck-open-air-fresh', title: 'Truck open-air / fresh priority', area: 'Fresh', minutes: 20, detail: 'Work open-air cooler and fresh priority items if they came on truck.' },
  { id: 'truck-backroom-cardboard', title: 'Truck back room / cardboard reset', area: 'Backroom', minutes: 20, detail: 'Keep paths clear, stacks safe, and cardboard handled as coverage allows.' },
  { id: 'truck-delay-note', title: 'Truck delay / follow-up note', area: 'Closeout', minutes: 7, detail: 'Document what truck pushed back so it does not look missed.' }
];
function fixRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function fixWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function timeShift() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'mid';
  return 'close';
}
function normalizeShift(value) {
  const raw = String(value || '').toLowerCase();
  if (['morning', 'open', 'opening', 'am', 'day'].includes(raw)) return 'morning';
  if (['mid', 'middle', 'afternoon'].includes(raw)) return 'mid';
  if (['close', 'closing', 'night', 'evening', 'pm'].includes(raw)) return 'close';
  return '';
}
function activeShiftFromUi() {
  const active = document.querySelector('.v2-shifts button.active');
  const text = active?.textContent?.trim().toLowerCase() || '';
  if (/morning/.test(text)) return 'morning';
  if (/mid/.test(text)) return 'mid';
  if (/close|night/.test(text)) return 'close';
  return '';
}
function currentShiftFixed() { return normalizeShift(fixRead(SHIFT_FIX_KEY, '')) || activeShiftFromUi() || timeShift(); }
function persistVisibleShift() {
  const fixed = activeShiftFromUi() || normalizeShift(fixRead(SHIFT_FIX_KEY, '')) || timeShift();
  if (VALID_SHIFTS.includes(fixed)) fixWrite(SHIFT_FIX_KEY, fixed);
}
function installShiftDefault() {
  const saved = fixRead(SHIFT_FIX_KEY, '');
  const normalized = normalizeShift(saved);
  if (!normalized || normalized !== saved) fixWrite(SHIFT_FIX_KEY, normalized || timeShift());
}
function truckDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}:${currentShiftFixed()}`;
}
function truckRead() { try { return JSON.parse(localStorage.getItem(TRUCK_KEY)) || {}; } catch { return {}; } }
function truckWrite(value) { localStorage.setItem(TRUCK_KEY, JSON.stringify(value)); }
function truckEscape(value) { return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
function installTruckStyles() {
  if (document.querySelector('#v2-truck-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-truck-style';
  style.textContent = `.v2-truck-tool{margin:0 0 12px;padding:14px;border:1px solid rgba(63,48,31,.12);border-radius:22px;background:rgba(255,250,241,.96);box-shadow:0 14px 34px rgba(44,31,16,.1)}.v2-truck-tool p{margin:0 0 4px;color:#7b471c;font-size:.7rem;font-weight:1000;letter-spacing:.1em;text-transform:uppercase}.v2-truck-tool h3{margin:0 0 5px;color:#073f2f;font-size:1.2rem}.v2-truck-tool small{display:block;margin:0 0 10px;color:#6d675e;font-weight:850;line-height:1.25}.v2-truck-tool div{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v2-truck-tool button{min-height:42px;border:0;border-radius:15px;background:#e9eee6;color:#073f2f;font-weight:1000}.v2-truck-tool button:first-child{background:linear-gradient(180deg,#0f513d,#073f2f);color:white}.truck-panel{position:fixed;inset:0;z-index:2750;display:grid;place-items:end center;padding:12px;background:rgba(12,18,14,.42)}.truck-card{width:min(100%,560px);max-height:min(86dvh,720px);overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;border-radius:26px;background:#fffaf1;color:#17221c;box-shadow:0 24px 70px rgba(44,31,16,.32)}.truck-head{padding:16px 16px 10px;border-bottom:1px solid rgba(63,48,31,.1)}.truck-head p{margin:0 0 4px;color:#7b471c;font-size:.7rem;font-weight:1000;letter-spacing:.1em;text-transform:uppercase}.truck-head h2{margin:0;color:#073f2f;font-size:1.35rem;line-height:1.05}.truck-head small{display:block;margin-top:5px;color:#6d675e;font-weight:850}.truck-list{overflow-y:auto;padding:10px 14px;-webkit-overflow-scrolling:touch}.truck-row{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:start;padding:11px 4px;border-bottom:1px solid rgba(63,48,31,.08);font-weight:850}.truck-row input{width:22px;height:22px;accent-color:#0f513d}.truck-notes{margin-top:10px;display:grid;gap:6px;color:#073f2f;font-weight:950}.truck-notes textarea{min-height:72px;width:100%;box-sizing:border-box;border:1px solid rgba(63,48,31,.14);border-radius:16px;background:#fffdf8;color:#17221c;padding:12px;font:inherit;line-height:1.35}.truck-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 14px 14px;border-top:1px solid rgba(63,48,31,.1)}.truck-actions button{min-height:46px;border:0;border-radius:16px;background:#e9eee6;color:#073f2f;font-weight:1000}.truck-actions button:first-child{background:linear-gradient(180deg,#0f513d,#073f2f);color:white}`;
  document.head.appendChild(style);
}
function openTruckDay() {
  persistVisibleShift();
  installTruckStyles();
  document.querySelector('.truck-panel')?.remove();
  const all = truckRead();
  const key = truckDayKey();
  const saved = all[key] || { checked: {}, notes: '' };
  const panel = document.createElement('div');
  panel.className = 'truck-panel';
  panel.innerHTML = `<section class="truck-card" role="dialog" aria-modal="true"><div class="truck-head"><p>${currentShiftFixed()} shift</p><h2>Truck Day</h2><small>Truck only: no books/bookwork and no Smart Counts.</small></div><div class="truck-list">${TRUCK_ITEMS.map((item, index) => `<label class="truck-row"><input type="checkbox" data-truck-index="${index}" ${saved.checked?.[index] ? 'checked' : ''}><span>${truckEscape(item)}</span></label>`).join('')}<label class="truck-notes">Truck notes<textarea placeholder="Truck time, priority outs, coverage issue, what got finished, what had to wait...">${truckEscape(saved.notes || '')}</textarea></label></div><div class="truck-actions"><button type="button" data-truck-save>Save truck note</button><button type="button" data-truck-close>Close</button></div></section>`;
  document.body.appendChild(panel);
  const save = () => {
    const checked = {};
    panel.querySelectorAll('[data-truck-index]').forEach((input) => { if (input.checked) checked[input.dataset.truckIndex] = true; });
    all[key] = { checked, notes: panel.querySelector('textarea')?.value || '', updatedAt: new Date().toISOString() };
    truckWrite(all);
  };
  panel.querySelector('[data-truck-save]').onclick = () => { save(); panel.remove(); };
  panel.querySelector('[data-truck-close]').onclick = () => { save(); panel.remove(); };
  panel.addEventListener('click', (event) => { if (event.target === panel) { save(); panel.remove(); } });
}
function addTruckTaskToShift() {
  persistVisibleShift();
  const shift = currentShiftFixed();
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const key = `${day}:${shift}`;
  const all = fixRead('storePilot.customTasks.v6', {});
  const list = all[key] || [];
  TRUCK_TASKS.forEach((task) => {
    const id = `${task.id}-${day}-${shift}`;
    if (!list.some((existing) => existing.id === id || existing.title === task.title)) list.push({ ...task, id });
  });
  all[key] = list;
  fixWrite('storePilot.customTasks.v6', all);
  location.reload();
}
function injectTruckTool() {
  installShiftDefault();
  installTruckStyles();
  const stage = document.querySelector('.v2-stage');
  if (!stage || stage.querySelector('.v2-truck-tool')) return;
  const screenText = document.querySelector('.v2-nav button.active')?.textContent || '';
  if (!/now|tasks/i.test(screenText)) return;
  const tool = document.createElement('section');
  tool.className = 'v2-truck-tool';
  tool.innerHTML = `<p>Optional shift tool</p><h3>Truck Day</h3><small>Adds truck work only. Books/bookwork stay with Loretta, and Smart Counts are not added.</small><div><button type="button" data-truck-open>Open checklist</button><button type="button" data-truck-add>Add truck tasks</button></div>`;
  stage.prepend(tool);
}
document.addEventListener('click', (event) => {
  if (event.target.closest?.('[data-v2-shift]')) setTimeout(persistVisibleShift, 0);
  if (event.target.closest?.('[data-v2-done],[data-v2-delay],[data-v2-carry],[data-v2-reopen]')) persistVisibleShift();
  if (event.target.closest?.('[data-truck-open]')) { event.preventDefault(); openTruckDay(); return; }
  if (event.target.closest?.('[data-truck-add]')) { event.preventDefault(); addTruckTaskToShift(); return; }
  setTimeout(injectTruckTool, 80);
}, true);
installShiftDefault();
setInterval(() => { persistVisibleShift(); injectTruckTool(); }, 500);
setTimeout(injectTruckTool, 500);
