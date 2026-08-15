import assert from 'node:assert/strict';
import test from 'node:test';
import { hasLive2DViewportRoom, resolveLive2DLayout } from '../layout';
import { canvasPointFromClient } from '../runtime/pointer';

test('derives the canvas from the complete widget size', () => {
  assert.deepEqual(resolveLive2DLayout(300, 340), {
    widgetWidthPx: 300,
    widgetHeightPx: 340,
    canvasWidthPx: 300,
    canvasHeightPx: 300,
  });
  assert.deepEqual(resolveLive2DLayout(400, 500), {
    widgetWidthPx: 400,
    widgetHeightPx: 500,
    canvasWidthPx: 400,
    canvasHeightPx: 460,
  });
});

test('rejects a widget smaller than the accessible base layout', () => {
  assert.throws(() => resolveLive2DLayout(299, 340), RangeError);
  assert.throws(() => resolveLive2DLayout(300, 339), RangeError);
});

test('requires the whole widget to fit beside the sidebar and inside the viewport', () => {
  const measurements = { viewportHeightPx: 340, widgetHeightPx: 340, widgetWidthPx: 300 };
  assert.equal(hasLive2DViewportRoom(measurements), false);
  assert.equal(hasLive2DViewportRoom({ ...measurements, sidebarLeftPx: 299 }), false);
  assert.equal(hasLive2DViewportRoom({ ...measurements, sidebarLeftPx: 300 }), true);
  assert.equal(hasLive2DViewportRoom({ ...measurements, sidebarLeftPx: 300, viewportHeightPx: 339 }), false);
});

test('maps client coordinates to the scaled canvas backing resolution', () => {
  assert.deepEqual(
    canvasPointFromClient({ width: 600, height: 680 }, { left: 20, top: 100, width: 300, height: 340 }, 170, 270),
    { x: 300, y: 340 },
  );
});
