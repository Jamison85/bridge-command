function installTaskPageScrollStyle() {
  if (document.querySelector('#v2-task-page-scroll-style')) return;
  const style = document.createElement('style');
  style.id = 'v2-task-page-scroll-style';
  style.textContent = `
    html.v2-tasks-active,
    html.v2-tasks-active body {
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      overscroll-behavior: none;
    }

    html.v2-tasks-active #store-pilot-v2 {
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 88px) !important;
    }

    html.v2-tasks-active .v2-stage {
      display: block !important;
      height: calc(100dvh - 178px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: 0 0 118px !important;
      -webkit-overflow-scrolling: touch;
      scroll-padding-bottom: 130px;
    }

    html.v2-tasks-active .v2-truck-tool {
      margin-bottom: 10px !important;
    }

    html.v2-tasks-active .v2-group {
      margin-bottom: 12px !important;
      padding: 16px !important;
    }

    html.v2-tasks-active .v2-group:last-child {
      margin-bottom: 24px !important;
    }

    html.v2-tasks-active .v2-task {
      margin-top: 10px !important;
    }

    html.v2-tasks-active .v2-nav {
      z-index: 2400 !important;
    }

    @media (max-height: 720px) {
      html.v2-tasks-active .v2-stage {
        height: calc(100dvh - 156px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
        padding-bottom: 108px !important;
      }

      html.v2-tasks-active .v2-top {
        margin-bottom: 7px !important;
      }

      html.v2-tasks-active .v2-shifts {
        margin-bottom: 7px !important;
        padding: 7px !important;
      }

      html.v2-tasks-active .v2-shifts button {
        min-height: 38px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function isTasksScreen() {
  const activeNav = document.querySelector('.v2-nav button.active');
  if (/tasks/i.test(activeNav?.textContent || '')) return true;
  const stage = document.querySelector('.v2-stage');
  return Boolean(stage?.querySelector('.v2-group')) && !stage?.querySelector('.v2-handoff,.v2-incident,.v2-now');
}

function applyTaskPageScrollFix() {
  installTaskPageScrollStyle();
  const active = isTasksScreen();
  document.documentElement.classList.toggle('v2-tasks-active', active);
  if (!active) return;
  const stage = document.querySelector('.v2-stage');
  if (stage && !stage.dataset.taskScrollBound) {
    stage.dataset.taskScrollBound = 'true';
    stage.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    stage.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
  }
}

document.addEventListener('click', () => setTimeout(applyTaskPageScrollFix, 80), true);
document.addEventListener('change', () => setTimeout(applyTaskPageScrollFix, 80), true);
setInterval(applyTaskPageScrollFix, 300);
setTimeout(applyTaskPageScrollFix, 400);
