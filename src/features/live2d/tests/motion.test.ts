import assert from 'node:assert/strict';
import test from 'node:test';
import { readInitialPartOpacities } from '../runtime/motion-part-opacity';
import { readParameterValues, saveParametersWithTransientState } from '../runtime/parameter-state';
import { findTapMotionGroup } from '../runtime/tap-motion';

test('maps model-defined hit areas directly to Tap{name} without assuming a language', () => {
  for (const name of ['Body', '中间刘海']) {
    assert.equal(
      findTapMotionGroup([name], (group) => group === `Tap${name}`),
      `Tap${name}`,
    );
  }
});

test('selects the first hit area with a matching tap motion', () => {
  const groups = new Set(['TapArm', 'TapRibbon']);
  assert.equal(
    findTapMotionGroup(['Hair', 'Arm', 'Ribbon'], (group) => groups.has(group)),
    'TapArm',
  );
});

test('does not invent a fallback when no hit area has a matching motion', () => {
  assert.equal(
    findTapMotionGroup(['Accessory'], (group) => group === 'TapBody'),
    undefined,
  );
});

test('reads authored initial part visibility without treating parameter curves as parts', () => {
  assert.deepEqual(
    readInitialPartOpacities({
      Curves: [
        { Target: 'PartOpacity', Id: 'Accessory', Segments: [0, 0, 0, 1, 1] },
        { Target: 'Parameter', Id: 'ParamEyeLOpen', Segments: [0, 1, 0, 1, 0] },
      ],
    }),
    [{ id: 'Accessory', value: 0 }],
  );
});

test('renders transient eye values without leaking them into the next motion baseline', () => {
  const values = new Map([
    ['ParamEyeLOpen', 1],
    ['ParamEyeROpen', 1],
    ['ParamAngleX', 0],
  ]);
  let savedValues = new Map<string, number>();
  const store = {
    getParameterValueById: (id: string) => values.get(id) ?? 0,
    setParameterValueById: (id: string, value: number) => values.set(id, value),
    saveParameters: () => {
      savedValues = new Map(values);
    },
  };
  const eyeBaseline = readParameterValues(store, ['ParamEyeLOpen', 'ParamEyeROpen']);

  values.set('ParamEyeLOpen', 0);
  values.set('ParamEyeROpen', 0);
  values.set('ParamAngleX', 20);
  saveParametersWithTransientState(store, eyeBaseline);

  assert.equal(values.get('ParamEyeLOpen'), 0);
  assert.equal(values.get('ParamEyeROpen'), 0);
  assert.equal(savedValues.get('ParamEyeLOpen'), 1);
  assert.equal(savedValues.get('ParamEyeROpen'), 1);
  assert.equal(savedValues.get('ParamAngleX'), 20);
});
