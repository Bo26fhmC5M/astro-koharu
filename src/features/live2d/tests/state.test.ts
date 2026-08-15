import assert from 'node:assert/strict';
import test from 'node:test';
import { reduceLive2DStatus } from '../state';

test('keeps a user-hidden widget hidden when the runtime becomes ready', () => {
  assert.equal(reduceLive2DStatus('hidden', { type: 'runtime-ready' }), 'hidden');
});

test('supports a hide and show cycle without reinitializing the runtime', () => {
  const hidden = reduceLive2DStatus('visible', { type: 'hide' });
  assert.equal(hidden, 'hidden');
  assert.equal(reduceLive2DStatus(hidden, { type: 'show' }), 'visible');
});

test('does not revive a failed or destroyed runtime', () => {
  assert.equal(reduceLive2DStatus('error', { type: 'show' }), 'error');
  assert.equal(reduceLive2DStatus('destroyed', { type: 'show' }), 'destroyed');
});
