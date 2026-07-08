const ADMIN_KEYS = {
  completed: 'storePilot.completed.v6',
  customTasks: 'storePilot.customTasks.v6',
  shift: 'storePilot.shift.v6',
  states: 'storePilot.taskStates.v6',
  recipient: 'storePilot.handoffRecipient.v1'
};
const ADMIN_SHIFTS = ['morning', 'mid', 'close'];
const ADMIN_RECIPIENTS = [
  ['loretta', 'Loretta'],
  ['richard', 'Richard']
];
let managedMessage = '';
function readAdmin(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeAdmin(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function todayAdmin(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function shiftAdmin() { const value = readAdmin(ADMIN_KEYS.shift, 'close'); return ADMIN_SHIFTS.includes(value) ? value : 'close'; }
function shiftKeyAdmin(targetShift = shiftAdmin()) { return `${todayAdmin()}:${targetShift}`; }
function recipientAdmin() { const value = readAdmin(ADMIN_KEYS.recipient, 'loretta'); return value === 'richard' ? 'richard' : 'loretta'; }
function recipientNameAdmin() { return recipientAdmin() === 'richard' ? 'Richard' : 'Loretta'; }
function messageForRecipient(text) {
  const name = recipientNameAdmin();
  let output = String(text || '').replace(/^Hey\s+(Loretta|Richard),/i, `Hey ${name},`);
  if (!/^Hey\s+(Loretta|Richard),/i.test(output)) output = `Hey ${name}, ${output.replace(/^hey\s+/i, '')}`;
  if (recipientAdmin() === 'richard') {
    output = output
      .replace(/so it does not get lost\./g, 'so the follow-up is clear.')
      .replace(/Nothing too wild\./g, 'Nothing major to add.')
      .replace(/so it does not look like it was just missed\./g, 'so it is clear why those items were not completed.')
      .replace(/just sending the update so it is all in one place\./g, 'keeping the update in one place.')
      .replace(/That is where I landed\./g, 'That is where the shift landed.');
  }
  return output;
}
function installAdminStyles() {
  if (document.querySelector('#v2-admin-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-admin-style';
  style.textContent = `
    .v2-recipient-label{margin:10px 0 6px;color:#073f2f;font-size:.72rem;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}
    .v2-recipient{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:0 0 12px}
    .v2-recipient button{min-height:38px;border:0;border-radius:14px;background:#e9eee6;color:#073f2f;font-weight:950;font-size:.78rem}
    .v2-recipient button.active{background:linear-gradient(180deg,#0f513d,#073f2f);color:white}
    .v2-reset-panel{position:fixed;inset:0;display:grid;place-items:end center;background:rgba(12,18,14,.38);z-index:2000;padding:16px}
    .v2-reset-card{width:min(100%,520px);padding:18px;border-radius:24px;background:#fffaf1;color:#17221c;box-shadow:0 22px 60px rgba(44,31,16,.28)}
    .v2-reset-card h2{margin:0 0 8px;color:#073f2f;font-size:1.35rem}
    .v2-reset-card p{margin:0 0 14px;color:#6d675e;line-height:1.35}
    .v2-reset-grid{display:grid;gap:10px}
    .v2-reset-grid button{min-height:46px;border:0;border-radius:16px;background:#e9eee6;color:#073f2f;font-weight:1000}
    .v2-reset-grid button.danger{background:#8d2d25;color:white}
    .v2-reset-grid button.safe{background:linear-gradient(180deg,#0f513d,#073f2f);color:white}
  `;
  document.head.appendChild(style);
}
function ensureRecipientSelector() {
  installAdminStyles();
  const handoff = document.querySelector('.v2-handoff');
  if (!handoff) return;
  let selector = handoff.querySelector('.v2-recipient');
  if (!selector) {
    const label = document.createElement('div');
    label.className = 'v2-recipient-label';
    label.textContent = 'Send to';
    selector = document.createElement('div');
    selector.className = 'v2-recipient';
    selector.innerHTML = ADMIN_RECIPIENTS.map(([id, labelText]) => `<button type="button" data-v2-recipient="${id}">${labelText}</button>`).join('');
    const stats = handoff.querySelector('.v2-stats');
    stats?.insertAdjacentElement('afterend', label);
    label.insertAdjacentElement('afterend', selector);
  }
  selector.querySelectorAll('[data-v2-recipient]').forEach((button) => {
    button.classList.toggle('active', button.dataset.v2Recipient === recipientAdmin());
    button.onclick = () => {
      writeAdmin(ADMIN_KEYS.recipient, button.dataset.v2Recipient);
      managedMessage = '';
      setTimeout(() => applyRecipientMessage(true), 20);
    };
  });
}
function applyRecipientMessage(force = false) {
  ensureRecipientSelector();
  const box = document.querySelector('#v2-message');
  if (!box) return;
  const active = document.activeElement === box;
  const transformed = messageForRecipient(box.value);
  const autoLooking = /^Hey\s+(Loretta|Richard),/i.test(box.value) && /\n\n(Done|Got done|Checked off|Completed|Still|Pending)/i.test(box.value);
  if (!active && (force || box.value === managedMessage || autoLooking || /^Hey\s+Loretta,/i.test(box.value))) {
    box.value = transformed;
    managedMessage = transformed;
  }
}
function resetStoreData(scope) {
  const targets = scope === 'day' ? ADMIN_SHIFTS.map(shiftKeyAdmin) : [shiftKeyAdmin()];
  [ADMIN_KEYS.completed, ADMIN_KEYS.states, ADMIN_KEYS.customTasks].forEach((storageKey) => {
    const all = readAdmin(storageKey, {});
    targets.forEach((target) => delete all[target]);
    writeAdmin(storageKey, all);
  });
  managedMessage = '';
  location.reload();
}
function showResetPanel() {
  installAdminStyles();
  document.querySelector('.v2-reset-panel')?.remove();
  const panel = document.createElement('div');
  panel.className = 'v2-reset-panel';
  panel.innerHTML = `
    <section class="v2-reset-card" role="dialog" aria-modal="true" aria-label="Reset tools">
      <h2>Reset tools</h2>
      <p>Reset clears today's task progress, delayed/carry notes, and today-only added tasks. It does not erase your recurring templates. Because apparently we do need a tiny eject button.</p>
      <div class="v2-reset-grid">
        <button class="safe" type="button" data-reset-scope="shift">Reset this shift</button>
        <button class="danger" type="button" data-reset-scope="day">Reset whole day</button>
        <button type="button" data-reset-close>Cancel</button>
      </div>
    </section>`;
  document.body.appendChild(panel);
  panel.querySelector('[data-reset-close]').onclick = () => panel.remove();
  panel.querySelectorAll('[data-reset-scope]').forEach((button) => {
    button.onclick = () => {
      const scope = button.dataset.resetScope;
      const label = scope === 'day' ? 'the whole day' : 'this shift';
      if (confirm(`Reset ${label}? This clears today's progress and notes for that scope.`)) resetStoreData(scope);
    };
  });
  panel.addEventListener('click', (event) => { if (event.target === panel) panel.remove(); });
}
function wireResetButton() {
  const menu = document.querySelector('.v2-menu');
  if (!menu || menu.dataset.adminResetBound) return;
  menu.dataset.adminResetBound = 'true';
  menu.textContent = '↻';
  menu.title = 'Reset shift or day';
  menu.setAttribute('aria-label', 'Reset shift or day');
  menu.addEventListener('click', showResetPanel);
}
function runAdminTools() {
  wireResetButton();
  applyRecipientMessage(false);
}
document.addEventListener('click', () => setTimeout(runAdminTools, 80));
document.addEventListener('change', () => setTimeout(runAdminTools, 80));
setInterval(runAdminTools, 350);
setTimeout(runAdminTools, 500);
