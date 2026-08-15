import type { Live2DRuntimeEvents } from './runtime/contracts';

const CORE_URL = new URL('./vendor/CubismSdkForWeb-5-r.4/Core/live2dcubismcore.min.js', import.meta.url).href;

export interface Live2DInstance {
  release(): void;
}

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

function loadScript(src: string): Promise<void> {
  if (window.Live2DCubismCore) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export async function createLive2DInstance(
  modelUrl: string,
  canvas: HTMLCanvasElement,
  events: Live2DRuntimeEvents,
): Promise<Live2DInstance> {
  await loadScript(CORE_URL);
  const { KoharuLive2DRuntime } = await import('./runtime/runtime');
  const runtime = new KoharuLive2DRuntime();

  if (!runtime.initialize(canvas, events)) throw new Error('Live2D runtime initialization failed');
  try {
    await runtime.changeModel(modelUrl);
    runtime.run();
    return runtime;
  } catch (error) {
    runtime.release();
    throw error;
  }
}
