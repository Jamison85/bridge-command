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

    html.v2-handoff-active .v2-top {
      margin-bottom: 8px !important;
    }

    html.v2-handoff-active .v2-shifts {
      margin-bottom: 8px !important;
      padding: 7px !important;
      gap: 7px !important;
    }

    html.v2-handoff-active .v2-shifts button {
      min-height: 38px !important;
    }

    html.v2-handoff-active .v2-stage {
      min-height: 0 !important;
      max-height: none !important;
      overflow: hidden !important;
      padding-bottom: 0 !important;
      display: block !important;
    }

    html.v2-handoff-active .v2-handoff {
      overflow: hidden !important;
      padding: 12px !important;
      border-radius: 22px !important;
      box-shadow: 0 14px 34px rgba(44,31,16,.13) !important;
    }

    html.v2-handoff-active .v2-handoff h2 {
      margin: 2px 0 7px !important;
      font-size: 1.45rem !important;
      line-height: 1 !important;
    }

    html.v2-handoff-active .v2-stats {
      margin: 7px 0 !important;
      gap: 6px !important;
    }

    html.v2-handoff-active .v2-stats b {
      padding: 7px 5px !important;
      font-size: 1rem !important;
      border-radius: 13px !important;
    }

    html.v2-handoff-active .v2-stats span {
      font-size: .58rem !important;
    }

    html.v2-handoff-active .v2-recipient-label {
      margin: 4px 0 4px !important;
      font-size: .66rem !important;
    }

    html.v2-handoff-active .v2-tone,
    html.v2-handoff-active .v2-recipient {
      gap: 6px !important;
      margin: 5px 0 7px !important;
    }

    html.v2-handoff-active .v2-tone button,
    html.v2-handoff-active .v2-recipient button {
      min-height: 32px !important;
      border-radius: 12px !important;
      font-size: .72rem !important;
    }

    html.v2-handoff-active #v2-message {
      min-height: 112px !important;
      height: 23dvh !important;
      max-height: 225px !important;
      overflow-y: auto !important;
      resize: none !important;
      padding: 12px !important;
      line-height: 1.34 !important;
      -webkit-overflow-scrolling: touch;
    }

    html.v2-handoff-active .v2-handoff .v2-actions {
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
      padding: 7px !important;
      box-sizing: border-box !important;
      border: 1px solid rgba(63,48,31,.12);
      border-radius: 20px;
      background: rgba(255,250,241,.98);
      box-shadow: 0 12px 30px rgba(44,31,16,.2);
      backdrop-filter: blur(18px);
    }

    html.v2-handoff-active .v2-handoff .v2-actions button {
      min-height: 42px !important;
      border-radius: 14px !important;
      font-size: .78rem !important;
    }

    html.v2-handoff-active .v2-nav {
      z-index: 2200 !important;
    }

    @media (max-height: 720px) {
      html.v2-handoff-active .v2-top {
        margin-bottom: 6px !important;
      }

      html.v2-handoff-active .v2-shifts {
        margin-bottom: 6px !important;
        padding: 6px !important;
      }

      html.v2-handoff-active .v2-shifts button {
        min-height: 34px !important;
      }

      html.v2-handoff-active .v2-handoff h2 {
        font-size: 1.24rem !important;
      }

      html.v2-handoff-active .v2-stats b {
        padding: 6px 4px !important;
      }

      html.v2-handoff-active #v2-message {
        height: 19dvh !important;
        min-height: 92px !important;
      }

      html.v2-handoff-active .v2-handoff .v2-actions {
        bottom: calc(env(safe-area-inset-bottom) + 74px) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function keepHandoffActionsReachable() {
  installHandoffScrollFix();
  const handoff = document.querySelector('.v2-handoff');
  const actions = document.querySelector('.v2-handoff .v2-actions');
  document.documentElement.classList.toggle('v2-handoff-active', Boolean(handoff));
  if (!handoff || !actions) return;
  actions.setAttribute('aria-label', 'Handoff send actions');
}

document.addEventListener('click', () => setTimeout(keepHandoffActionsReachable, 50));
document.addEventListener('focusin', () => setTimeout(keepHandoffActionsReachable, 50));
setInterval(keepHandoffActionsReachable, 300);
setTimeout(keepHandoffActionsReachable, 250);
