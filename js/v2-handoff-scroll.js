function installHandoffScrollFix() {
  if (document.querySelector('#v2-handoff-scroll-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-handoff-scroll-style';
  style.textContent = `
    html.v2-clean-active,
    html.v2-clean-active body {
      height: auto !important;
      min-height: 100dvh !important;
      overflow-y: auto !important;
      overscroll-behavior-y: contain;
      -webkit-overflow-scrolling: touch;
    }

    html.v2-clean-active #store-pilot-v2 {
      height: auto !important;
      min-height: 100dvh !important;
      overflow: visible !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 156px) !important;
    }

    html.v2-clean-active .v2-stage {
      min-height: 0 !important;
      overflow: visible !important;
      padding-bottom: 84px !important;
    }

    html.v2-clean-active .v2-handoff {
      overflow: visible !important;
      padding-bottom: 14px !important;
    }

    html.v2-clean-active #v2-message {
      min-height: 180px !important;
      height: 34dvh !important;
      max-height: 330px !important;
      overflow-y: auto !important;
      resize: vertical;
      -webkit-overflow-scrolling: touch;
    }

    html.v2-clean-active .v2-handoff .v2-actions {
      position: sticky !important;
      bottom: calc(env(safe-area-inset-bottom) + 84px) !important;
      z-index: 1600 !important;
      margin: 14px -4px 0 !important;
      padding: 8px !important;
      border: 1px solid rgba(63,48,31,.12);
      border-radius: 20px;
      background: rgba(255,250,241,.96);
      box-shadow: 0 16px 38px rgba(44,31,16,.22);
      backdrop-filter: blur(18px);
    }

    html.v2-clean-active .v2-handoff .v2-actions button {
      min-height: 46px !important;
    }

    html.v2-clean-active .v2-nav {
      z-index: 1500 !important;
    }

    @media (max-height: 720px) {
      html.v2-clean-active #v2-message {
        height: 28dvh !important;
        min-height: 150px !important;
      }

      html.v2-clean-active .v2-stats {
        margin: 10px 0 !important;
      }

      html.v2-clean-active .v2-tone,
      html.v2-clean-active .v2-recipient {
        margin-bottom: 8px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function keepHandoffActionsReachable() {
  installHandoffScrollFix();
  const handoff = document.querySelector('.v2-handoff');
  const actions = document.querySelector('.v2-handoff .v2-actions');
  if (!handoff || !actions) return;
  actions.setAttribute('aria-label', 'Handoff send actions');
}

document.addEventListener('click', () => setTimeout(keepHandoffActionsReachable, 50));
document.addEventListener('focusin', () => setTimeout(keepHandoffActionsReachable, 50));
setInterval(keepHandoffActionsReachable, 400);
setTimeout(keepHandoffActionsReachable, 300);
