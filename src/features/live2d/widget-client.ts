import { live2dConfig } from './config';
import { Live2DController } from './controller';
import { hasLive2DViewportRoom } from './layout';

declare global {
  interface Window {
    __koharuLive2dController?: Live2DController;
    __koharuLive2dViewportAbort?: AbortController;
  }
}

export function mountLive2DWidget(): void {
  const root = document.querySelector<HTMLElement>('[data-live2d-root]');
  if (!root) return;

  window.__koharuLive2dViewportAbort?.abort();
  const viewportAbort = new AbortController();
  window.__koharuLive2dViewportAbort = viewportAbort;

  const syncViewport = () => {
    const sidebar = [...document.querySelectorAll<HTMLElement>('.page-home-sider')].find(
      (element) => getComputedStyle(element).display !== 'none',
    );
    const viewportHidden = !hasLive2DViewportRoom({
      sidebarLeftPx: sidebar?.getBoundingClientRect().left,
      viewportHeightPx: window.innerHeight,
      widgetHeightPx: live2dConfig.widgetHeightPx,
      widgetWidthPx: live2dConfig.widgetWidthPx,
    });
    root.toggleAttribute('data-viewport-hidden', viewportHidden);
    root.inert = viewportHidden;
    root.setAttribute('aria-hidden', String(viewportHidden));

    if (!viewportHidden && !window.__koharuLive2dController) {
      const controller = new Live2DController(root);
      window.__koharuLive2dController = controller;
      void controller.initialize();
    }
  };

  window.addEventListener('resize', syncViewport, { signal: viewportAbort.signal });
  document.addEventListener('astro:page-load', syncViewport, { signal: viewportAbort.signal });
  syncViewport();
}
