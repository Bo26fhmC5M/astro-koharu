import type { Live2DConfig, Live2DConfigOverrides } from '../define-config';

const TEST_LIVE2D_CONFIG: Live2DConfig = {
  modelUrl: 'https://example.test/model/model3.json',
  infoUrl: 'https://example.test/live2d-info',
  hitokotoApiUrl: 'https://example.test/hitokoto',
  messages: {
    defaults: ['test default'],
    console: 'test console',
    copy: 'test copy',
    visibilitychange: 'test visibility change',
    photo: 'test photo',
    goodbye: 'test goodbye',
    hitokotoError: 'test hitokoto error',
    hitokotoAttribution: (from, creator) => (creator ? `test ${from} ${creator}` : `test ${from}`),
    welcome: (title) => `test welcome ${title}`,
    referrer: (hostname) => `test referrer ${hostname}`,
    hoverBody: ['test hover body'],
    tapBody: ['test tap body'],
    time: [{ fromHour: 0, toHour: 23, text: 'test time' }],
    mouseover: [
      { selector: '[data-test-control]', text: ['{text} test control'] },
      { selector: '[data-test-hover-card]', text: ['test hover card'] },
    ],
    click: [{ selector: '[data-test-click-card]', text: ['test click card'] }],
  },
  draggable: true,
  widgetWidthPx: 300,
  widgetHeightPx: 340,
  dragThresholdPx: 6,
  idleTimeoutMs: 60_000,
  idleRepeatIntervalMs: 60_000,
  welcomeDurationMs: 100,
  interactionDurationMs: 100,
  systemMessageDurationMs: 100,
  hitokotoQuoteDurationMs: 100,
  hitokotoAttributionDurationMs: 100,
  goodbyeDurationMs: 100,
};

export function createTestConfig(overrides: Live2DConfigOverrides = {}): Readonly<Live2DConfig> {
  return Object.freeze({
    ...TEST_LIVE2D_CONFIG,
    ...overrides,
    messages: Object.freeze({
      ...TEST_LIVE2D_CONFIG.messages,
      ...overrides.messages,
    }),
  });
}
