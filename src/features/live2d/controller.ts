import { live2dConfig } from './config';
import type { Live2DConfig } from './define-config';
import { DragController } from './drag-controller';
import { fetchHitokoto } from './hitokoto-client';
import { MessageController } from './message-controller';
import { randomMessage } from './messages';
import { PageReactionController } from './page-reactions';
import type { Live2DRuntimeEvents } from './runtime/contracts';
import { createLive2DInstance, type Live2DInstance } from './runtime-loader';
import { type Live2DAction, type Live2DStatus, reduceLive2DStatus } from './state';

const HIDDEN_KEY = 'koharu-live2d-hidden';

const MESSAGE_PRIORITY = {
  idle: 7,
  interaction: 8,
  system: 9,
  lifecycle: 11,
  direct: 12,
} as const;

export type Live2DInstanceFactory = (
  modelUrl: string,
  canvas: HTMLCanvasElement,
  events: Live2DRuntimeEvents,
) => Promise<Live2DInstance>;

export interface Live2DControllerOptions {
  config?: Readonly<Live2DConfig>;
  instanceFactory?: Live2DInstanceFactory;
}

export class Live2DController {
  private status: Live2DStatus;
  private readonly message: MessageController;
  private readonly widget: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly canvas: HTMLCanvasElement;
  private instance?: Live2DInstance;
  private readonly drag: DragController;
  private readonly pageReactions: PageReactionController;
  private idleTimeoutTimer?: number;
  private idleRepeatTimer?: number;
  private hideTimer?: number;
  private hitokotoAbort?: AbortController;
  private readonly abort = new AbortController();
  private readonly config: Readonly<Live2DConfig>;
  private readonly instanceFactory: Live2DInstanceFactory;

  constructor(
    private readonly root: HTMLElement,
    options: Live2DControllerOptions = {},
  ) {
    this.config = options.config ?? live2dConfig;
    this.instanceFactory = options.instanceFactory ?? createLive2DInstance;
    this.widget = this.requireElement<HTMLElement>('[data-live2d-widget]');
    this.toggle = this.requireElement<HTMLButtonElement>('[data-live2d-toggle]');
    this.canvas = this.requireElement<HTMLCanvasElement>('#live2d');
    this.message = new MessageController(this.requireElement<HTMLElement>('[data-live2d-message]'));
    this.drag = new DragController(this.widget, this.canvas, this.config.draggable, this.config.dragThresholdPx);
    this.pageReactions = new PageReactionController({
      root: this.root,
      mouseover: this.config.messages.mouseover,
      click: this.config.messages.click,
      onMessage: (text) => this.message.show(text, this.config.interactionDurationMs, MESSAGE_PRIORITY.interaction),
    });
    this.status = localStorage.getItem(HIDDEN_KEY) === 'true' ? 'hidden' : 'loading';
    this.renderStatus();
  }

  async initialize(): Promise<void> {
    this.registerEvents();
    this.showPageWelcome();

    try {
      this.instance = await this.instanceFactory(this.config.modelUrl, this.canvas, {
        onHover: () => this.showHoverMessage(),
        onTap: () => this.showTapMessage(),
      });
      this.dispatch({ type: 'runtime-ready' });
    } catch (error) {
      this.dispatch({ type: 'fail' });
      console.error('[Koharu Live2D] Failed to initialize.', error);
    }
  }

  destroy(): void {
    this.abort.abort();
    if (this.idleTimeoutTimer !== undefined) window.clearTimeout(this.idleTimeoutTimer);
    if (this.idleRepeatTimer !== undefined) window.clearInterval(this.idleRepeatTimer);
    if (this.hideTimer !== undefined) window.clearTimeout(this.hideTimer);
    this.hitokotoAbort?.abort();
    this.message.destroy();
    this.instance?.release();
    this.dispatch({ type: 'destroy' });
  }

  private registerEvents(): void {
    const options = { signal: this.abort.signal };

    this.toggle.addEventListener('click', () => this.show(), options);
    this.root.querySelector('[data-live2d-tool="quit"]')?.addEventListener('click', () => this.hide(), options);
    this.root.querySelector('[data-live2d-tool="photo"]')?.addEventListener('click', () => this.takePhoto(), options);
    this.root.querySelector('[data-live2d-tool="info"]')?.addEventListener('click', () => this.openInfo(), options);
    this.root.querySelector('[data-live2d-tool="hitokoto"]')?.addEventListener('click', () => this.showHitokoto(), options);

    this.drag.register(this.abort.signal);
    this.pageReactions.register(this.abort.signal);

    window.addEventListener(
      'copy',
      () => this.message.show(this.config.messages.copy, this.config.systemMessageDurationMs, MESSAGE_PRIORITY.system),
      options,
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden)
          this.message.show(
            this.config.messages.visibilitychange,
            this.config.systemMessageDurationMs,
            MESSAGE_PRIORITY.system,
          );
      },
      options,
    );
    document.addEventListener('astro:page-load', () => this.onPageLoad(), options);
    window.addEventListener('mousemove', () => this.markActive(), options);
    window.addEventListener('keydown', () => this.markActive(), options);

    this.scheduleIdleMessages();

    const devtoolsProbe = () => undefined;
    devtoolsProbe.toString = () => {
      this.message.show(this.config.messages.console, this.config.systemMessageDurationMs, MESSAGE_PRIORITY.system);
      return '';
    };
    console.debug('%c', devtoolsProbe);
  }

  private showTapMessage(): void {
    this.message.show(randomMessage(this.config.messages.tapBody), this.config.interactionDurationMs, MESSAGE_PRIORITY.direct);
  }

  private showHoverMessage(): void {
    if (this.drag.isDragging()) return;
    this.message.show(
      randomMessage(this.config.messages.hoverBody),
      this.config.interactionDurationMs,
      MESSAGE_PRIORITY.interaction,
      false,
    );
  }

  private hide(): void {
    if (this.hideTimer !== undefined) window.clearTimeout(this.hideTimer);
    this.message.show(this.config.messages.goodbye, this.config.goodbyeDurationMs, MESSAGE_PRIORITY.lifecycle);
    localStorage.setItem(HIDDEN_KEY, 'true');
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = undefined;
      this.dispatch({ type: 'hide' });
    }, this.config.goodbyeDurationMs);
  }

  private show(): void {
    if (this.hideTimer !== undefined) window.clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
    localStorage.removeItem(HIDDEN_KEY);
    this.dispatch({ type: 'show' });
    this.message.show(
      randomMessage(this.config.messages.defaults),
      this.config.interactionDurationMs,
      MESSAGE_PRIORITY.interaction,
    );
  }

  private takePhoto(): void {
    this.message.show(this.config.messages.photo, this.config.interactionDurationMs, MESSAGE_PRIORITY.system);
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL('image/png');
    link.download = 'live2d-photo.png';
    link.click();
  }

  private openInfo(): void {
    window.open(this.config.infoUrl, '_blank', 'noopener,noreferrer');
  }

  private async showHitokoto(): Promise<void> {
    this.hitokotoAbort?.abort();
    const abort = new AbortController();
    this.hitokotoAbort = abort;

    try {
      const result = await fetchHitokoto(this.config.hitokotoApiUrl, abort.signal);
      if (abort.signal.aborted || this.hitokotoAbort !== abort) return;

      const quote = result.text;
      const attribution = result.from ? this.config.messages.hitokotoAttribution(result.from, result.creator) : '';
      this.message.showSequence(
        [
          { text: quote, duration: this.config.hitokotoQuoteDurationMs },
          { text: attribution, duration: this.config.hitokotoAttributionDurationMs },
        ],
        MESSAGE_PRIORITY.direct,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.message.show(this.config.messages.hitokotoError, this.config.interactionDurationMs, MESSAGE_PRIORITY.direct);
    } finally {
      if (this.hitokotoAbort === abort) this.hitokotoAbort = undefined;
    }
  }

  private onPageLoad(): void {
    this.pageReactions.reset();
    this.markActive();
  }

  private showPageWelcome(): void {
    const hour = new Date().getHours();
    const timeMessage = this.config.messages.time.find(({ fromHour, toHour }) => fromHour <= hour && hour <= toHour)?.text;
    let text =
      location.pathname === '/' || /^\/[a-z]{2}\/?$/.test(location.pathname)
        ? timeMessage
        : this.config.messages.welcome(document.title);

    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.hostname !== location.hostname) text = `${this.config.messages.referrer(referrer.hostname)} ${text}`;
    }
    if (text) this.message.show(text, this.config.welcomeDurationMs, MESSAGE_PRIORITY.lifecycle);
  }

  private markActive(): void {
    this.scheduleIdleMessages();
  }

  private scheduleIdleMessages(): void {
    if (this.idleTimeoutTimer !== undefined) {
      window.clearTimeout(this.idleTimeoutTimer);
      this.idleTimeoutTimer = undefined;
    }
    if (this.idleRepeatTimer !== undefined) {
      window.clearInterval(this.idleRepeatTimer);
      this.idleRepeatTimer = undefined;
    }

    const showIdleMessage = () => {
      this.message.show(
        randomMessage(this.config.messages.defaults),
        this.config.systemMessageDurationMs,
        MESSAGE_PRIORITY.idle,
        false,
      );
    };

    this.idleTimeoutTimer = window.setTimeout(() => {
      this.idleTimeoutTimer = undefined;
      showIdleMessage();
      this.idleRepeatTimer = window.setInterval(showIdleMessage, this.config.idleRepeatIntervalMs);
    }, this.config.idleTimeoutMs);
  }

  private dispatch(action: Live2DAction): void {
    this.status = reduceLive2DStatus(this.status, action);
    this.renderStatus();
  }

  private renderStatus(): void {
    this.root.dataset.status = this.status;
    this.widget.setAttribute('aria-hidden', String(this.status === 'hidden' || this.status === 'error'));
    this.toggle.hidden = this.status !== 'hidden';
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing Live2D element: ${selector}`);
    return element;
  }
}
