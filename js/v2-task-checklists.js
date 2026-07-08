const TASK_CHECKLIST_KEY = 'storePilot.taskChecklists.v1';
const TASK_CHECKLISTS = {
  bookwork: ['SmartSafe totals matched', 'Deposits checked', 'Lottery audit checked', 'Safe/cash counts checked', 'Post-voids or exceptions reviewed', 'Any mismatch documented'],
  smartCounts: ['Open Smart Counts', 'Count assigned items', 'Double-check unusual variance', 'Submit counts', 'Note anything missing or questionable'],
  lto: ['Open item sales report', 'Select required LTO items', 'Confirm date/time range', 'Take screenshot', 'Send screenshot to Loretta', 'Mark sent once confirmed'],
  coffee: ['Coffee area wiped', 'Coffee supplies stocked', 'Creamer/sugar area stocked', 'Fountain area checked', 'Cups/lids/straws stocked', 'BIB or issue noted if needed'],
  cooler: ['Open-air cooler faced', 'Dates checked', 'Expired/questionable items pulled', 'Rotation fixed where needed', 'Shelf labels or empty spots noted', 'Cooler issue documented if needed'],
  fresh: ['Warmer quality checked', 'Labels and hold times checked', 'Questionable items pulled', 'Presentation cleaned up', 'Kitchen follow-up noted if needed'],
  restrooms: ['Restrooms stocked', 'Quick wipe completed', 'Inside trash checked', 'Outside trash checked if coverage allows', 'Floors checked for spills or hazards', 'Anything skipped documented'],
  backstock: ['Priority outs identified', 'Customer-facing outs filled first', 'Back room path checked', 'Obvious clutter reduced', 'Unfinished backstock documented'],
  closing: ['Closing process checked', 'Customer-facing areas reviewed', 'Final safety/cleanliness pass', 'Anything left for morning documented'],
  handoff: ['Completed items reviewed', 'Delayed items have reasons', 'Carried items have follow-up notes', 'Incident notes added if needed', 'Recipient selected', 'Message reviewed before sending']
};
const TASK_CHECKLIST_LABELS = {
  bookwork: 'Bookwork', smartCounts: 'Smart Counts', lto: 'LTO Screenshot', coffee: 'Coffee / Fountain', cooler: 'Cooler / Dates', fresh: 'Fresh Food', restrooms: 'Restrooms / Trash', backstock: 'Backstock', closing: 'Closing', handoff: 'Handoff'
};
function tcRead() { try { return JSON.parse(localStorage.getItem(TASK_CHECKLIST_KEY)) || {}; } catch { return {}; } }
function tcWrite(value) { localStorage.setItem(TASK_CHECKLIST_KEY, JSON.stringify(value)); }
function tcShift() { try { return JSON.parse(localStorage.getItem('storePilot.shift.v6') || '"close"'); } catch { return 'close'; } }
function tcDay() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function tcSlug(value) { return String(value || 'task').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function tcEscape(value) { return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
function tcType(text) {
  const t = String(text || '').toLowerCase();
  if (/walk|floor reset walk|store walk/.test(t)) return '';
  if (/handoff/.test(t)) return 'handoff';
  if (/bookwork|smartsafe|smart safe|deposit|safe|lottery/.test(t)) return 'bookwork';
  if (/smart count/.test(t)) return 'smartCounts';
  if (/lto|screenshot/.test(t)) return 'lto';
  if (/coffee|fountain|bib/.test(t)) return 'coffee';
  if (/open-air|open air|cooler|date|dates|rotate/.test(t)) return 'cooler';
  if (/warmer|warmers|fresh food|label|quality/.test(t)) return 'fresh';
  if (/restroom|trash|floor/.test(t)) return 'restrooms';
  if (/backstock|back stock|back room/.test(t)) return 'backstock';
  if (/closing timing|lock/.test(t)) return 'closing';
  return '';
}
function tcTitle(node) { return node?.querySelector?.('strong,h2')?.textContent?.trim() || 'Task checklist'; }
function tcKey(type, title) { return `${tcDay()}:${tcShift()}:${type}:${tcSlug(title)}`; }
function tcStyle() {
  if (document.querySelector('#v2-task-checklist-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-task-checklist-style';
  style.textContent = `.v2-task-checklist-btn{background:linear-gradient(180deg,#0f513d,#073f2f)!important;color:white!important}.v2-task.has-task-checklist{cursor:pointer}.v2-task.has-task-checklist div:last-child,.v2-now.has-task-checklist .v2-actions{grid-template-columns:repeat(auto-fit,minmax(76px,1fr))!important}.tc-panel{position:fixed;inset:0;z-index:2700;display:grid;place-items:end center;padding:12px;background:rgba(12,18,14,.42)}.tc-card{width:min(100%,560px);max-height:min(86dvh,720px);overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;border-radius:26px;background:#fffaf1;color:#17221c;box-shadow:0 24px 70px rgba(44,31,16,.32)}.tc-head{padding:16px 16px 10px;border-bottom:1px solid rgba(63,48,31,.1)}.tc-head p{margin:0 0 4px;color:#7b471c;font-size:.7rem;font-weight:1000;letter-spacing:.1em;text-transform:uppercase}.tc-head h2{margin:0;color:#073f2f;font-size:1.35rem;line-height:1.05}.tc-list{overflow-y:auto;padding:10px 14px;-webkit-overflow-scrolling:touch}.tc-row{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:start;padding:11px 4px;border-bottom:1px solid rgba(63,48,31,.08);font-weight:850}.tc-row input{width:22px;height:22px;accent-color:#0f513d}.tc-notes{margin-top:10px;display:grid;gap:6px;color:#073f2f;font-weight:950}.tc-notes textarea{min-height:72px;width:100%;box-sizing:border-box;border:1px solid rgba(63,48,31,.14);border-radius:16px;background:#fffdf8;color:#17221c;padding:12px;font:inherit;line-height:1.35}.tc-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 14px 14px;border-top:1px solid rgba(63,48,31,.1)}.tc-actions button{min-height:46px;border:0;border-radius:16px;background:#e9eee6;color:#073f2f;font-weight:1000}.tc-actions button:first-child{background:linear-gradient(180deg,#0f513d,#073f2f);color:white}`;
  document.head.appendChild(style);
}
function openTaskChecklist(type, title) {
  tcStyle();
  document.querySelector('.tc-panel')?.remove();
  const all = tcRead();
  const key = tcKey(type, title);
  const saved = all[key] || { checked: {}, notes: '' };
  const items = TASK_CHECKLISTS[type] || [];
  const panel = document.createElement('div');
  panel.className = 'tc-panel';
  panel.innerHTML = `<section class="tc-card" role="dialog" aria-modal="true"><div class="tc-head"><p>${tcEscape(TASK_CHECKLIST_LABELS[type] || 'Checklist')} · ${tcEscape(tcShift())}</p><h2>${tcEscape(title)}</h2></div><div class="tc-list">${items.map((item, index) => `<label class="tc-row"><input type="checkbox" data-tc-index="${index}" ${saved.checked?.[index] ? 'checked' : ''}><span>${tcEscape(item)}</span></label>`).join('')}<label class="tc-notes">Notes / issues found<textarea placeholder="Anything blocked, delayed, skipped, or needing follow-up...">${tcEscape(saved.notes || '')}</textarea></label></div><div class="tc-actions"><button type="button" data-tc-save>Save checklist</button><button type="button" data-tc-close>Close</button></div></section>`;
  document.body.appendChild(panel);
  const save = () => {
    const checked = {};
    panel.querySelectorAll('[data-tc-index]').forEach((input) => { if (input.checked) checked[input.dataset.tcIndex] = true; });
    all[key] = { type, title, checked, notes: panel.querySelector('textarea')?.value || '', updatedAt: new Date().toISOString() };
    tcWrite(all);
  };
  panel.querySelector('[data-tc-save]').onclick = () => { save(); panel.remove(); };
  panel.querySelector('[data-tc-close]').onclick = () => { save(); panel.remove(); };
  panel.addEventListener('click', (event) => { if (event.target === panel) { save(); panel.remove(); } });
}
function enhanceTaskChecklists() {
  tcStyle();
  document.querySelectorAll('.v2-task').forEach((card) => {
    const title = tcTitle(card);
    const type = tcType(title || card.textContent);
    if (!type) return;
    card.classList.add('has-task-checklist');
    card.dataset.tcType = type;
    const actions = card.querySelector('div:last-child');
    if (actions && !actions.querySelector('[data-tc-open]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v2-task-checklist-btn';
      button.dataset.tcOpen = type;
      button.textContent = 'Checklist';
      actions.prepend(button);
    }
  });
  const now = document.querySelector('.v2-now');
  const nowTitle = now?.querySelector('h2')?.textContent || '';
  const nowType = tcType(nowTitle);
  if (now && nowType) {
    now.classList.add('has-task-checklist');
    now.dataset.tcType = nowType;
    const actions = now.querySelector('.v2-actions');
    if (actions && !actions.querySelector('[data-tc-open]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v2-task-checklist-btn';
      button.dataset.tcOpen = nowType;
      button.textContent = 'Checklist';
      actions.appendChild(button);
    }
  }
}
document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-tc-open]');
  if (button) {
    event.preventDefault();
    event.stopPropagation();
    const parent = button.closest('.v2-task,.v2-now');
    openTaskChecklist(button.dataset.tcOpen, tcTitle(parent));
    return;
  }
  const card = event.target.closest?.('.has-task-checklist');
  if (card && !event.target.closest('button')) openTaskChecklist(card.dataset.tcType, tcTitle(card));
}, true);
document.addEventListener('click', () => setTimeout(enhanceTaskChecklists, 70));
document.addEventListener('change', () => setTimeout(enhanceTaskChecklists, 70));
setInterval(enhanceTaskChecklists, 400);
setTimeout(enhanceTaskChecklists, 500);
