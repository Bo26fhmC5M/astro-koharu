import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageController } from '../message-controller';

interface FakeElement {
  textContent: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  setAttribute(name: string, value: string): void;
}

function createElement(): FakeElement {
  return {
    textContent: '',
    dataset: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function installWindowTimers(): { pendingCount(): number; restore(): void; runNext(): void } {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const timers = new Map<number, () => void>();
  let nextId = 1;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout(callback: () => void) {
        const id = nextId;
        nextId += 1;
        timers.set(id, callback);
        return id;
      },
      clearTimeout(id: number) {
        timers.delete(id);
      },
    },
  });

  return {
    pendingCount: () => timers.size,
    restore() {
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
      else Reflect.deleteProperty(globalThis, 'window');
    },
    runNext() {
      const next = timers.entries().next().value as [number, () => void] | undefined;
      assert.ok(next, 'expected a pending timer');
      const [id, callback] = next;
      timers.delete(id);
      callback();
    },
  };
}

test('shows sequence steps in order and then hides', () => {
  const timers = installWindowTimers();
  const element = createElement();
  const message = new MessageController(element as unknown as HTMLElement);

  try {
    message.showSequence(
      [
        { text: 'quote', duration: 15 },
        { text: 'attribution', duration: 15 },
      ],
      12,
    );
    assert.equal(element.textContent, 'quote');

    timers.runNext();
    assert.equal(element.textContent, 'attribution');

    timers.runNext();
    assert.equal(element.dataset.visible, 'false');
  } finally {
    message.destroy();
    timers.restore();
  }
});

test('a newer direct message cancels the remaining sequence', () => {
  const timers = installWindowTimers();
  const element = createElement();
  const message = new MessageController(element as unknown as HTMLElement);

  try {
    message.showSequence(
      [
        { text: 'old quote', duration: 15 },
        { text: 'old attribution', duration: 15 },
      ],
      12,
    );
    message.show('tap response', 50, 12);

    assert.equal(element.textContent, 'tap response');
    assert.equal(element.dataset.visible, 'true');
    assert.equal(timers.pendingCount(), 1);

    timers.runNext();
    assert.equal(element.textContent, 'tap response');
    assert.equal(element.dataset.visible, 'false');
    assert.equal(timers.pendingCount(), 0);
  } finally {
    message.destroy();
    timers.restore();
  }
});
