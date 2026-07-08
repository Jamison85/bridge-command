function installHandoffScrollFix() {
  if (document.querySelector('#v2-handoff-scroll-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-handoff-scroll-style';
  style.textContent = `
    html.v2-clean-active,
    html.v2-clean-active body {
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      overscroll-behavior: none;
    }

    html.v2-clean-active #store-pilot-v2 {
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 156px) !important;
      box-sizing: border-box !important;
    }

    html.v2-clean-active .v2-stage {
      min-height: 0 !important;
      max-height: calc(100dvh - 168px) !important;
      overflow-y: auto !important;
      padding-bottom: 150px !important;
      -webkit-overflow-scrolling: touch;
    }

    html.v2-clean-active .v2-handoff {
      overflow: visible !important;
      padding: 14px !important;
    }

    html.v2-clean-active .v2-handoff h2 {
      margin-top: 4px !important;
      margin-bottom: 8px !important;
    }

    html.v2-clean-active .v2-stats {
      margin: 8px 0 !important;
      gap: 7px !important;
    }

    html.v2-clean-active .v2-stats b {
      padding: 8px 6px !important;
      font-size: 1.05rem !important;
      border-radius: 14px !important;
    }

    html.v2-clean-active .v2-recipient-label {
      margin-top: 6px !important;
    }

    html.v2-clean-active .v2-tone,
    html.v2-clean-active .v2-recipient {
      gap: 6px !important;
      margin: 6px 0 8px !important;
    }

    html.v2-clean-active .v2-tone button,
    html.v2-clean-active .v2-recipient button {
      min-height: 34px !important;
      border-radius: 12px !important;
    }

    html.v2-clean-active #v2-message {
      min-height: 130px !important;
      height: 26dvh !important;
      max-height: 260px !important;
      overflow-y: auto !important;
      resize: none !important;
      -webkit-overflow-scrolling: touch;
    }

    html.v2-clean-active .v2-handoff .v2-actions {
      position: fixed !important;
      left: 50% !important;
      bottom: calc(env(safe-area-inset-bottom) + 82px) !important;
      transform: translateX(-50%) !important;
      width: min(calc(100% - 24px), 720px) !important;
      z-index: 2300 !important;
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      margin: 0 !important;
      padding: 8px !important;
      box-sizing: border-box !important;
      border: 1px solid rgba(63,48,31,.12);
      border-radius: 22px;
      background: rgba(255,250,241,.98);
      box-shadow: 0 16px 42px rgba(44,31,16,.24);
      backdrop-filter: blur(18px);
    }

    html.v2-clean-active .v2-handoff .v2-actions button {
      min-height: 44px !important;
      border-radius: 14px !important;
    }

    html.v2-clean-active .v2-nav {
      z-index: 2200 !important;
    }

    @media (max-height: 720px) {
      html.v2-clean-active .v2-top {
        margin-bottom: 7px !important;
      }

      html.v2-clean-active .v2-shifts {
        margin-bottom: 8px !important;
        padding: 7px !important;
      }

      html.v2-clean-active .v2-shifts button {
        min-height: 38px !important;
      }

      html.v2-clean-active .v2-handoff h2 {
        font-size: 1.35rem !important;
      }

      html.v2-clean-active #v2-message {
        height: 22dvh !important;
        min-height: 105px !important;
      }

      html.v2-clean-active .v2-handoff .v2-actions {
        bottom: calc(env(safe-area-inset-bottom) + 76px) !important;
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
setInterval(keepHandoffActionsReachable, 300);
setTimeout(keepHandoffActionsReachable, 250);
