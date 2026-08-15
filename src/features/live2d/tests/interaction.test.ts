import assert from 'node:assert/strict';
import test from 'node:test';
import { Live2DController } from '../controller';
import type { Live2DRuntimeEvents } from '../runtime/contracts';
import { createTestConfig } from './test-config';

const testMessages = createTestConfig().messages;

function createRuntimeHarness() {
  let events: Live2DRuntimeEvents | undefined;
  return {
    factory: async (_modelUrl: string, _canvas: HTMLCanvasElement, nextEvents: Live2DRuntimeEvents) => {
      events = nextEvents;
      return { release() {} };
    },
    hover: () => events?.onHover(),
    tap: () => events?.onTap(),
  };
}

class FakeElement extends EventTarget {
  readonly attributes = new Map<string, string>();
  readonly children = new Map<string, FakeElement>();
  readonly closestMatches = new Map<string, FakeElement>();
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  hidden = false;
  innerText = '';
  offsetHeight = 340;
  offsetWidth = 300;
  textContent = '';

  constructor(private rect = { left: 0, top: 0, width: 300, height: 340 }) {
    super();
  }

  contains(target: EventTarget | null): boolean {
    return target === this || [...this.children.values()].includes(target as FakeElement);
  }

  closest<T extends Element>(selector: string): T | null {
    return (this.closestMatches.get(selector) as T | undefined) ?? null;
  }

  getBoundingClientRect(): DOMRect {
    const { left, top, width, height } = this.rect;
    return {
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
      x: left,
      y: top,
      toJSON: () => ({}),
    };
  }

  querySelector<T extends Element>(selector: string): T | null {
    return (this.children.get(selector) as T | undefined) ?? null;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  setPointerCapture(): void {}
}

function createPointerEvent(
  type: string,
  init: { pointerId: number; button?: number; clientX: number; clientY: number },
): Event {
  const event = new Event(type);
  for (const [key, value] of Object.entries({ button: 0, ...init })) {
    Object.defineProperty(event, key, { value });
  }
  return event;
}

function createTargetEvent(type: string, target: EventTarget, relatedTarget?: EventTarget): Event {
  const event = new Event(type);
  Object.defineProperty(event, 'target', { value: target });
  if (relatedTarget !== undefined) Object.defineProperty(event, 'relatedTarget', { value: relatedTarget });
  return event;
}

function installDomGlobals(): {
  root: FakeElement;
  widget: FakeElement;
  canvas: FakeElement;
  message: FakeElement;
  restore(): void;
} {
  const globalNames = ['window', 'document', 'localStorage', 'location', 'Element', 'HTMLElement'] as const;
  const descriptors = new Map(globalNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const storage = new Map<string, string>();
  const fakeWindow = Object.assign(new EventTarget(), {
    innerHeight: 720,
    innerWidth: 1280,
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  });
  const fakeDocument = Object.assign(new EventTarget(), {
    hidden: false,
    referrer: '',
    title: 'Live2D interaction test',
  });
  const root = new FakeElement();
  const widget = new FakeElement({ left: 0, top: 380, width: 300, height: 340 });
  const toggle = new FakeElement();
  const canvas = new FakeElement({ left: 0, top: 420, width: 300, height: 300 });
  const message = new FakeElement();

  root.children.set('[data-live2d-widget]', widget);
  root.children.set('[data-live2d-toggle]', toggle);
  root.children.set('#live2d', canvas);
  root.children.set('[data-live2d-message]', message);
  for (const tool of ['quit', 'photo', 'info', 'hitokoto']) {
    root.children.set(`[data-live2d-tool="${tool}"]`, new FakeElement());
  }

  const globals: Record<(typeof globalNames)[number], unknown> = {
    window: fakeWindow,
    document: fakeDocument,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    location: { hostname: 'localhost', pathname: '/post/test' },
    Element: FakeElement,
    HTMLElement: FakeElement,
  };

  for (const name of globalNames) {
    Object.defineProperty(globalThis, name, { configurable: true, value: globals[name] });
  }

  return {
    root,
    widget,
    canvas,
    message,
    restore() {
      for (const name of globalNames) {
        const descriptor = descriptors.get(name);
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

test('canvas interaction only shows messages for hits reported by the runtime', async () => {
  const dom = installDomGlobals();
  const runtime = createRuntimeHarness();
  const controller = new Live2DController(dom.root as unknown as HTMLElement, {
    config: createTestConfig(),
    instanceFactory: runtime.factory,
  });

  try {
    await controller.initialize();
    const internalMessage = (controller as unknown as { message: { hide(): void } }).message;
    internalMessage.hide();

    // A transparent part of the rectangular canvas is not a model hit.
    dom.canvas.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 1, clientX: 145, clientY: 445 }));
    assert.equal(dom.message.dataset.visible, 'false');

    // The runtime emits this event only after its Body hit test.
    dom.canvas.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1, clientX: 145, clientY: 445 }));
    runtime.tap();
    assert.equal(dom.message.dataset.visible, 'true');
    assert.ok(testMessages.tapBody.includes(dom.message.textContent));
    internalMessage.hide();

    // Entering the transparent canvas around the model must not count as a
    // hover. Upstream intentionally reports hover only for its Body hit area.
    dom.canvas.dispatchEvent(new Event('pointerenter'));
    assert.equal(dom.message.dataset.visible, 'false');

    runtime.hover();
    assert.equal(dom.message.dataset.visible, 'true');
    assert.ok(testMessages.hoverBody.includes(dom.message.textContent));
  } finally {
    controller.destroy();
    dom.restore();
  }
});

test('page interaction hover responds again after leaving the matched element', async () => {
  const dom = installDomGlobals();
  const controller = new Live2DController(dom.root as unknown as HTMLElement, {
    config: createTestConfig(),
    instanceFactory: async () => ({ release() {} }),
  });
  const selector = '[data-test-control]';
  const matchedTarget = new FakeElement();
  const outsideTarget = new FakeElement();
  matchedTarget.setAttribute('aria-label', '검색');
  matchedTarget.closestMatches.set(selector, matchedTarget);

  const internal = controller as unknown as { message: { hide(): void } };

  try {
    await controller.initialize();
    internal.message.hide();

    window.dispatchEvent(createTargetEvent('mouseover', matchedTarget));
    assert.equal(dom.message.dataset.visible, 'true');
    assert.equal(dom.message.textContent, '검색 test control');

    // Repeated mouseover events inside one element are deduplicated.
    internal.message.hide();
    window.dispatchEvent(createTargetEvent('mouseover', matchedTarget));
    assert.equal(dom.message.dataset.visible, 'false');

    // Leaving and entering the same element again must be a new interaction.
    window.dispatchEvent(createTargetEvent('mouseout', matchedTarget, outsideTarget));
    window.dispatchEvent(createTargetEvent('mouseover', matchedTarget));
    assert.equal(dom.message.dataset.visible, 'true');
    assert.equal(dom.message.textContent, '검색 test control');
  } finally {
    controller.destroy();
    dom.restore();
  }
});

test('page interaction truncates text placeholders longer than 100 characters', async () => {
  const dom = installDomGlobals();
  const controller = new Live2DController(dom.root as unknown as HTMLElement, {
    config: createTestConfig(),
    instanceFactory: async () => ({ release() {} }),
  });
  const matchedTarget = new FakeElement();
  const label = `${'가'.repeat(100)}나`;
  matchedTarget.setAttribute('aria-label', label);
  matchedTarget.closestMatches.set('[data-test-control]', matchedTarget);
  const internal = controller as unknown as { message: { hide(): void } };

  try {
    await controller.initialize();
    internal.message.hide();
    window.dispatchEvent(createTargetEvent('mouseover', matchedTarget));

    assert.equal(dom.message.textContent, `${'가'.repeat(100)}... test control`);
  } finally {
    controller.destroy();
    dom.restore();
  }
});

test('injected mouseover and click reactions show their configured messages', async () => {
  const dom = installDomGlobals();
  const controller = new Live2DController(dom.root as unknown as HTMLElement, {
    config: createTestConfig(),
    instanceFactory: async () => ({ release() {} }),
  });
  const internal = controller as unknown as { message: { hide(): void } };
  const cases: {
    event: 'mouseover' | 'click';
    selector: string;
    messages: string[];
  }[] = [
    {
      event: 'mouseover',
      selector: '[data-test-hover-card]',
      messages: ['test hover card'],
    },
    {
      event: 'click',
      selector: '[data-test-click-card]',
      messages: ['test click card'],
    },
  ] as const;

  try {
    await controller.initialize();

    for (const { event, selector, messages } of cases) {
      const eventTarget = new FakeElement();
      const matchedTarget = new FakeElement();
      eventTarget.closestMatches.set(selector, matchedTarget);
      internal.message.hide();

      window.dispatchEvent(createTargetEvent(event, eventTarget));
      assert.equal(dom.message.dataset.visible, 'true');
      assert.ok(messages.includes(dom.message.textContent));
    }
  } finally {
    controller.destroy();
    dom.restore();
  }
});

test('drag waits for the movement threshold and clamps the widget to the viewport', async () => {
  const dom = installDomGlobals();
  const controller = new Live2DController(dom.root as unknown as HTMLElement, {
    config: createTestConfig(),
    instanceFactory: async () => ({ release() {} }),
  });

  try {
    await controller.initialize();

    dom.canvas.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 1, clientX: 145, clientY: 445 }));
    dom.canvas.dispatchEvent(createPointerEvent('pointermove', { pointerId: 1, clientX: 150, clientY: 445 }));
    assert.equal(dom.widget.style.left, undefined);
    assert.equal(dom.widget.style.top, undefined);

    dom.canvas.dispatchEvent(createPointerEvent('pointermove', { pointerId: 1, clientX: 2_000, clientY: 2_000 }));
    assert.equal(dom.widget.style.left, '980px');
    assert.equal(dom.widget.style.top, '380px');
    assert.equal(dom.widget.style.bottom, 'auto');
  } finally {
    controller.destroy();
    dom.restore();
  }
});

test('disabling drag is a supported configuration and leaves the widget fixed', async () => {
  const dom = installDomGlobals();
  const controller = new Live2DController(dom.root as unknown as HTMLElement, {
    config: createTestConfig({ draggable: false }),
    instanceFactory: async () => ({ release() {} }),
  });

  try {
    await controller.initialize();

    dom.canvas.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 1, clientX: 145, clientY: 445 }));
    dom.canvas.dispatchEvent(createPointerEvent('pointermove', { pointerId: 1, clientX: 400, clientY: 300 }));

    assert.equal(dom.widget.style.left, undefined);
    assert.equal(dom.widget.style.top, undefined);
  } finally {
    controller.destroy();
    dom.restore();
  }
});
