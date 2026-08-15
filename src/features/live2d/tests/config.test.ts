import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultLive2DConfig, defineLive2DConfig } from '../define-config';

test('merges user overrides without mutating the defaults', () => {
  const config = defineLive2DConfig({
    draggable: false,
    interactionDurationMs: 750,
    messages: {
      goodbye: 'custom goodbye',
      mouseover: [{ selector: '[data-custom-hover]', text: ['custom hover'] }],
    },
  });

  assert.equal(config.draggable, false);
  assert.equal(config.interactionDurationMs, 750);
  assert.equal(config.widgetWidthPx, defaultLive2DConfig.widgetWidthPx);
  assert.equal(config.messages.goodbye, 'custom goodbye');
  assert.deepEqual(config.messages.mouseover, [{ selector: '[data-custom-hover]', text: ['custom hover'] }]);
  assert.deepEqual(config.messages.click, defaultLive2DConfig.messages.click);
  assert.equal(defaultLive2DConfig.messages.goodbye, '다음에 또 만나요!');
  assert.equal(defaultLive2DConfig.draggable, true);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.messages), true);
});

test('rejects invalid user overrides', () => {
  assert.throws(() => defineLive2DConfig({ modelUrl: '  ' }), TypeError);
  assert.throws(() => defineLive2DConfig({ widgetWidthPx: 299 }), RangeError);
  assert.throws(() => defineLive2DConfig({ widgetHeightPx: Number.NaN }), RangeError);
  assert.throws(() => defineLive2DConfig({ dragThresholdPx: -1 }), RangeError);
  assert.throws(() => defineLive2DConfig({ idleRepeatIntervalMs: 0 }), RangeError);
  assert.throws(() => defineLive2DConfig({ interactionDurationMs: Number.NaN }), RangeError);
  assert.throws(
    () =>
      defineLive2DConfig({
        messages: {
          time: [
            { fromHour: 0, toHour: 12, text: 'first' },
            { fromHour: 12, toHour: 23, text: 'overlap' },
          ],
        },
      }),
    RangeError,
  );
  assert.throws(() => defineLive2DConfig({ messages: { mouseover: [{ selector: '', text: ['message'] }] } }), TypeError);
});

test('default messages cover Koharu page reactions', () => {
  const hoverSelectors = defaultLive2DConfig.messages.mouseover.map(({ selector }) => selector);
  const clickSelectors = defaultLive2DConfig.messages.click.map(({ selector }) => selector);

  assert.ok(hoverSelectors.includes('#site-header :is(a, button)'));
  assert.ok(hoverSelectors.includes(':is(.post-item-card, .flip-card)'));
  assert.ok(hoverSelectors.includes('article img'));
  assert.ok(clickSelectors.includes(':is(.post-item-card, .flip-card)'));
});
