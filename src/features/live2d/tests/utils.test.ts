import assert from 'node:assert/strict';
import test from 'node:test';
import { truncateText } from '../utils';

test('returns text at or below the maximum length unchanged', () => {
  assert.equal(truncateText('가'.repeat(100), 100), '가'.repeat(100));
});

test('truncates text above the maximum length and appends the suffix', () => {
  assert.equal(truncateText(`${'가'.repeat(100)}나`, 100), `${'가'.repeat(100)}...`);
});

test('supports a custom suffix', () => {
  assert.equal(truncateText('abcdef', 3, '…'), 'abc…');
});
