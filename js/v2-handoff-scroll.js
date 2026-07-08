function installHandoffScrollFix() {
  if (document.querySelector('#v2-handoff-scroll-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-handoff-scroll-style';
  style.textContent = `
    html.v2-handoff-active,
    html.v2-handoff-active body {
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      overscroll-behavior: none;
    }

    html.v2-handoff-active #store-pilot-v2 {
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      padding-top: calc(env(safe-area-inset-top) + 8px) !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 146px) !important;
      box-sizing: border-box !important;
    }

    html.v2-handoff-active .v2-top { margin-bottom: 8px !important; }
    html.v2-handoff-active .v2-shifts { margin-bottom: 8px !important; padding: 7px !important; gap: 7px !important; }
    html.v2-handoff-active .v2-shifts button { min-height: 38px !important; }
    html.v2-handoff-active .v2-stage { min-height: 0 !important; max-height: none !important; overflow: hidden !important; padding-bottom: 0 !important; display: block !important; }
    html.v2-handoff-active .v2-handoff { overflow: hidden !important; padding: 12px !important; border-radius: 22px !important; box-shadow: 0 14px 34px rgba(44,31,16,.13) !important; }
    html.v2-handoff-active .v2-handoff h2 { margin: 2px 0 7px !important; font-size: 1.45rem !important; line-height: 1 !important; }
    html.v2-handoff-active .v2-stats { margin: 7px 0 !important; gap: 6px !important; }
    html.v2-handoff-active .v2-stats b { padding: 7px 5px !important; font-size: 1rem !important; border-radius: 13px !important; }
    html.v2-handoff-active .v2-stats span { font-size: .58rem !important; }
    html.v2-handoff-active .v2-recipient-label { margin: 4px 0 4px !important; font-size: .66rem !important; }
    html.v2-handoff-active .v2-tone, html.v2-handoff-active .v2-recipient { gap: 6px !important; margin: 5px 0 7px !important; }
    html.v2-handoff-active .v2-tone button, html.v2-handoff-active .v2-recipient button { min-height: 32px !important; border-radius: 12px !important; font-size: .72rem !important; }
    html.v2-handoff-active #v2-message { min-height: 112px !important; height: 23dvh !important; max-height: 225px !important; overflow-y: auto !important; resize: none !important; padding: 12px !important; line-height: 1.34 !important; -webkit-overflow-scrolling: touch; }
    html.v2-handoff-active .v2-handoff .v2-actions { position: fixed !important; left: 50% !important; bottom: calc(env(safe-area-inset-bottom) + 82px) !important; transform: translateX(-50%) !important; width: min(calc(100% - 24px), 720px) !important; z-index: 2300 !important; display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; margin: 0 !important; padding: 7px !important; box-sizing: border-box !important; border: 1px solid rgba(63,48,31,.12); border-radius: 20px; background: rgba(255,250,241,.98); box-shadow: 0 12px 30px rgba(44,31,16,.2); backdrop-filter: blur(18px); }
    html.v2-handoff-active .v2-handoff .v2-actions button { min-height: 42px !important; border-radius: 14px !important; font-size: .78rem !important; }
    html.v2-handoff-active .v2-nav { z-index: 2200 !important; }

    .v2-walk-button { background: linear-gradient(180deg,#0f513d,#073f2f) !important; color: white !important; }
    .v2-task.v2-walk-task { cursor: pointer; }
    .v2-task.v2-walk-task div:last-child { grid-template-columns: repeat(4, 1fr) !important; }
    .v2-now.v2-walk-now .v2-actions { grid-template-columns: repeat(2, 1fr) !important; }
    .v2-walk-panel { position: fixed; inset: 0; z-index: 2600; display: grid; place-items: end center; padding: 12px; background: rgba(12,18,14,.42); }
    .v2-walk-card { width: min(100%, 560px); max-height: min(86dvh, 720px); overflow: hidden; display: grid; grid-template-rows: auto 1fr auto; border: 1px solid rgba(63,48,31,.12); border-radius: 26px; background: #fffaf1; color: #17221c; box-shadow: 0 24px 70px rgba(44,31,16,.32); }
    .v2-walk-head { padding: 16px 16px 10px; border-bottom: 1px solid rgba(63,48,31,.1); }
    .v2-walk-head p { margin: 0 0 4px; color: #7b471c; font-size: .7rem; font-weight: 1000; letter-spacing: .1em; text-transform: uppercase; }
    .v2-walk-head h2 { margin: 0; color: #073f2f; font-size: 1.35rem; line-height: 1.05; }
    .v2-walk-list { overflow-y: auto; padding: 10px 14px; -webkit-overflow-scrolling: touch; }
    .v2-walk-row { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: start; padding: 11px 4px; border-bottom: 1px solid rgba(63,48,31,.08); color: #17221c; font-weight: 850; }
    .v2-walk-row input { width: 22px; height: 22px; accent-color: #0f513d; }
    .v2-walk-notes { margin-top: 10px; display: grid; gap: 6px; color: #073f2f; font-weight: 950; }
    .v2-walk-notes textarea { min-height: 72px; width: 100%; box-sizing: border-box; border: 1px solid rgba(63,48,31,.14); border-radius: 16px; background: #fffdf8; color: #17221c; padding: 12px; font: inherit; line-height: 1.35; }
    .v2-walk-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 14px 14px; border-top: 1px solid rgba(63,48,31,.1); }
    .v2-walk-actions button { min-height: 46px; border: 0; border-radius: 16px; background: #e9eee6; color: #073f2f; font-weight: 1000; }
    .v2-walk-actions button:first-child { background: linear-gradient(180deg,#0f513d,#073f2f); color: white; }

    @media (max-height: 720px) {
      html.v2-handoff-active .v2-top { margin-bottom: 6px !important; }
      html.v2-handoff-active .v2-shifts { margin-bottom: 6px !important; padding: 6px !important; }
      html.v2-handoff-active .v2-shifts button { min-height: 34px !important; }
      html.v2-handoff-active .v2-handoff h2 { font-size: 1.24rem !important; }
      html.v2-handoff-active .v2-stats b { padding: 6px 4px !important; }
      html.v2-handoff-active #v2-message { height: 19dvh !important; min-height: 92px !important; }
      html.v2-handoff-active .v2-handoff .v2-actions { bottom: calc(env(safe-area-inset-bottom) + 74px) !important; }
    }
  `;
  document.head.appendChild(style);
}

const WALK_KEY = 'storePilot.walkChecklist.v1';
const WALK_ITEMS = {
  morning: [
    'Front doors, entry, and parking lot quick look',
    'Coffee area wiped, stocked, and ready',
    'Fountain area, cups, lids, straws, and BIBs checked',
    'Restrooms stocked and presentable',
    'Trash checked inside and outside',
    'Open-air cooler faced, rotated, and dates checked',
    'Food warmers quality and labels checked',
    'Front counter/register area cleaned up',
    'Floor, spills, and trip hazards checked',
    'Back room path clear enough to function'
  ],
  mid: [
    'Customer-facing floor reset',
    'Coffee/fountain recovery pass',
    'Restrooms and trash pass',
    'Open-air cooler faced and dates checked',
    'Fresh food/warmers quality check',
    'Front counter/register clutter checked',
    'High-traffic shelves faced',
    'Back room path and obvious trip hazards checked',
    'Outside quick glance if coverage allows'
  ],
  close: [
    'Front doors, entry, and outside quick look',
    'Coffee area cleaned and stocked for morning',
    'Fountain area reset and stocked',
    'Restrooms stocked, trash handled, and quick wipe',
    'Open-air cooler faced, rotated, and date issues noted',
    'Fresh food/warmers checked for quality and labels',
    'Floors, spills, mats, and trip hazards checked',
    'Trash checked inside and outside',
    'Front counter/register area reset',
    'Closing notes captured for anything not finished'
  ]
};
function walkRead() { try { return JSON.parse(localStorage.getItem(WALK_KEY)) || {}; } catch { return {}; } }
function walkWrite(value) { localStorage.setItem(WALK_KEY, JSON.stringify(value)); }
function walkShift() { const saved = JSON.parse(localStorage.getItem('storePilot.shift.v6') || '"close"'); return WALK_ITEMS[saved] ? saved : 'close'; }
function walkDay() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function walkSlug(title) { return String(title || 'store walk').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function walkKey(title) { return `${walkDay()}:${walkShift()}:${walkSlug(title)}`; }
function walkTitleFromNode(node) {
  return node?.querySelector?.('strong,h2')?.textContent?.trim() || 'Store walk';
}
function isWalkText(text) { return /walk|floor reset|recovery/i.test(String(text || '')); }
function openWalkChecklist(title = 'Store walk') {
  installHandoffScrollFix();
  document.querySelector('.v2-walk-panel')?.remove();
  const shift = walkShift();
  const key = walkKey(title);
  const all = walkRead();
  const saved = all[key] || { checked: {}, notes: '' };
  const items = WALK_ITEMS[shift] || WALK_ITEMS.close;
  const panel = document.createElement('div');
  panel.className = 'v2-walk-panel';
  panel.innerHTML = `
    <section class="v2-walk-card" role="dialog" aria-modal="true" aria-label="Store walk checklist">
      <div class="v2-walk-head"><p>${shift} store walk</p><h2>${title}</h2></div>
      <div class="v2-walk-list">
        ${items.map((item, index) => `<label class="v2-walk-row"><input type="checkbox" data-walk-index="${index}" ${saved.checked?.[index] ? 'checked' : ''}><span>${item}</span></label>`).join('')}
        <label class="v2-walk-notes">Notes / issues found<textarea placeholder="Cooler issue, restroom supply, trash, spill, dates, follow-up...">${String(saved.notes || '').replace(/[&<>"]/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]))}</textarea></label>
      </div>
      <div class="v2-walk-actions"><button type="button" data-walk-save>Save checklist</button><button type="button" data-walk-close>Close</button></div>
    </section>`;
  document.body.appendChild(panel);
  const save = () => {
    const checked = {};
    panel.querySelectorAll('[data-walk-index]').forEach((input) => { if (input.checked) checked[input.dataset.walkIndex] = true; });
    all[key] = { checked, notes: panel.querySelector('textarea')?.value || '', updatedAt: new Date().toISOString() };
    walkWrite(all);
  };
  panel.querySelector('[data-walk-save]').onclick = () => { save(); panel.remove(); };
  panel.querySelector('[data-walk-close]').onclick = () => { save(); panel.remove(); };
  panel.addEventListener('click', (event) => { if (event.target === panel) { save(); panel.remove(); } });
}
function enhanceWalkTasks() {
  installHandoffScrollFix();
  document.querySelectorAll('.v2-task').forEach((card) => {
    const text = card.textContent || '';
    if (!isWalkText(text)) return;
    card.classList.add('v2-walk-task');
    const actions = card.querySelector('div:last-child');
    if (actions && !actions.querySelector('[data-walk-open]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v2-walk-button';
      button.dataset.walkOpen = 'true';
      button.textContent = 'Checklist';
      actions.prepend(button);
    }
  });
  const now = document.querySelector('.v2-now');
  const nowTitle = now?.querySelector('h2')?.textContent || '';
  if (now && isWalkText(nowTitle)) {
    now.classList.add('v2-walk-now');
    const actions = now.querySelector('.v2-actions');
    if (actions && !actions.querySelector('[data-walk-open]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v2-walk-button';
      button.dataset.walkOpen = 'true';
      button.textContent = 'Checklist';
      actions.appendChild(button);
    }
  }
}

function keepHandoffActionsReachable() {
  installHandoffScrollFix();
  const handoff = document.querySelector('.v2-handoff');
  const actions = document.querySelector('.v2-handoff .v2-actions');
  document.documentElement.classList.toggle('v2-handoff-active', Boolean(handoff));
  if (actions) actions.setAttribute('aria-label', 'Handoff send actions');
  enhanceWalkTasks();
}

document.addEventListener('click', (event) => {
  const openButton = event.target.closest?.('[data-walk-open]');
  if (openButton) {
    event.preventDefault();
    event.stopPropagation();
    openWalkChecklist(walkTitleFromNode(openButton.closest('.v2-task,.v2-now')));
    return;
  }
  const walkCard = event.target.closest?.('.v2-walk-task');
  if (walkCard && !event.target.closest('button')) openWalkChecklist(walkTitleFromNode(walkCard));
  setTimeout(keepHandoffActionsReachable, 50);
}, true);
document.addEventListener('focusin', () => setTimeout(keepHandoffActionsReachable, 50));
setInterval(keepHandoffActionsReachable, 300);
setTimeout(keepHandoffActionsReachable, 250);
