import { resolveLive2DLayout } from './layout';
import { defaultLive2DMessages, type Live2DMessages, type Live2DPageReaction, type Live2DTimeMessage } from './messages';

export interface Live2DConfig {
  /** Cubism 3/4 `model3.json` file rendered by the widget. */
  modelUrl: string;
  /** Page opened by the information tool. */
  infoUrl: string;
  /** JSON API endpoint used by the Hitokoto tool. */
  hitokotoApiUrl: string;
  /** Text and page-reaction rules shown by the widget. */
  messages: Readonly<Live2DMessages>;
  /** Whether dragging the canvas moves the entire widget. */
  draggable: boolean;
  /** Width of the complete widget, including the character and message. */
  widgetWidthPx: number;
  /** Height of the complete widget, including the character and message. */
  widgetHeightPx: number;
  /** Pointer travel, in CSS pixels, required before a gesture becomes a drag. */
  dragThresholdPx: number;
  /** Inactivity before the first idle message is shown. */
  idleTimeoutMs: number;
  /** Delay between subsequent idle messages while the user remains inactive. */
  idleRepeatIntervalMs: number;
  /** Duration of the page-entry welcome message. */
  welcomeDurationMs: number;
  /** Duration of hover, tap, page interaction, photo, and reopen messages. */
  interactionDurationMs: number;
  /** Duration of copy, visibility, and developer-console messages. */
  systemMessageDurationMs: number;
  /** Duration of the quote returned by the Hitokoto API. */
  hitokotoQuoteDurationMs: number;
  /** Duration of the source attribution shown after a Hitokoto quote. */
  hitokotoAttributionDurationMs: number;
  /** Time the goodbye message remains visible before the widget is hidden. */
  goodbyeDurationMs: number;
}

export type Live2DConfigOverrides = Omit<Partial<Live2DConfig>, 'messages'> & {
  messages?: Partial<Live2DMessages>;
};

export const defaultLive2DConfig = {
  /** 표시할 Cubism 3/4 모델의 `model3.json` 주소입니다. */
  modelUrl: 'https://fastly.jsdelivr.net/gh/Live2D/CubismWebSamples/Samples/Resources/Hiyori/Hiyori.model3.json',
  /** 정보 버튼을 눌렀을 때 새 창으로 열 페이지입니다. */
  infoUrl: 'https://www.live2d.com/en/sdk/about/',
  /** 한 문장 기능이 요청할 Hitokoto JSON API 주소입니다. */
  hitokotoApiUrl: 'https://v1.hitokoto.cn',
  /** 위젯이 사용하는 기본 문구와 페이지 반응 규칙입니다. */
  messages: defaultLive2DMessages,
  /** 캐릭터를 포인터로 드래그하여 이동할 수 있는지 결정합니다. */
  draggable: true,
  /** 캐릭터, 말풍선, 도구를 모두 포함한 위젯 전체 너비(px)입니다. */
  widgetWidthPx: 300,
  /** 캐릭터, 말풍선, 도구를 모두 포함한 위젯 전체 높이(px)입니다. */
  widgetHeightPx: 340,
  /** 클릭과 드래그를 구분하기 위해 필요한 최소 이동 거리(px)입니다. */
  dragThresholdPx: 6,
  /** 마지막 사용자 활동 후 첫 idle 문구를 표시하기까지의 시간(ms)입니다. */
  idleTimeoutMs: 20_000,
  /** 비활성 상태가 계속될 때 idle 문구를 다시 표시하는 간격(ms)입니다. */
  idleRepeatIntervalMs: 20_000,
  /** 페이지 진입 환영 문구의 표시 시간(ms)입니다. */
  welcomeDurationMs: 4_000,
  /** hover, 클릭, 페이지 반응, 사진 및 다시 표시 문구의 표시 시간(ms)입니다. */
  interactionDurationMs: 2_000,
  /** 복사, 탭 복귀 및 개발자 도구 관련 문구의 표시 시간(ms)입니다. */
  systemMessageDurationMs: 2_000,
  /** Hitokoto에서 가져온 문장 본문의 표시 시간(ms)입니다. */
  hitokotoQuoteDurationMs: 4_000,
  /** Hitokoto 문장 뒤에 이어지는 출처 문구의 표시 시간(ms)입니다. */
  hitokotoAttributionDurationMs: 2_000,
  /** 종료 문구를 보여 준 뒤 위젯을 숨기기까지의 시간(ms)입니다. */
  goodbyeDurationMs: 2_000,
} as const satisfies Live2DConfig;

function assertNonEmpty(name: string, value: string): void {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`live2d.${name} must not be empty.`);
}

function assertFiniteAtLeast(name: string, value: number, minimum: number): void {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`live2d.${name} must be a finite number greater than or equal to ${minimum}.`);
  }
}

function validateTimeMessages(messages: readonly Live2DTimeMessage[]): void {
  const occupiedHours = new Set<number>();

  for (const { fromHour, text, toHour } of messages) {
    if (
      !Number.isInteger(fromHour) ||
      !Number.isInteger(toHour) ||
      fromHour < 0 ||
      fromHour > 23 ||
      toHour < 0 ||
      toHour > 23
    ) {
      throw new RangeError('live2d.messages.time hours must be integers between 0 and 23.');
    }
    if (fromHour > toHour) throw new RangeError('live2d.messages.time fromHour must not exceed toHour.');
    if (!text.trim()) throw new TypeError('live2d.messages.time text must not be empty.');

    for (let hour = fromHour; hour <= toHour; hour += 1) {
      if (occupiedHours.has(hour)) throw new RangeError(`live2d.messages.time overlaps at hour ${hour}.`);
      occupiedHours.add(hour);
    }
  }
}

function validatePageReactions(name: 'click' | 'mouseover', reactions: readonly Live2DPageReaction[]): void {
  for (const reaction of reactions) {
    if (!reaction.selector.trim()) throw new TypeError(`live2d.messages.${name} selector must not be empty.`);
    if (reaction.text.length === 0 || reaction.text.some((text) => !text.trim())) {
      throw new TypeError(`live2d.messages.${name} text must contain non-empty messages.`);
    }
  }
}

function freezeMessages(messages: Live2DMessages): Readonly<Live2DMessages> {
  return Object.freeze({
    ...messages,
    defaults: Object.freeze([...messages.defaults]),
    hoverBody: Object.freeze([...messages.hoverBody]),
    tapBody: Object.freeze([...messages.tapBody]),
    time: Object.freeze(messages.time.map((message) => Object.freeze({ ...message }))),
    mouseover: Object.freeze(
      messages.mouseover.map((reaction) => Object.freeze({ ...reaction, text: Object.freeze([...reaction.text]) })),
    ),
    click: Object.freeze(
      messages.click.map((reaction) => Object.freeze({ ...reaction, text: Object.freeze([...reaction.text]) })),
    ),
  });
}

export function defineLive2DConfig(overrides: Live2DConfigOverrides): Readonly<Live2DConfig> {
  const messages: Live2DMessages = {
    ...defaultLive2DMessages,
    ...overrides.messages,
  };
  const config: Live2DConfig = {
    ...defaultLive2DConfig,
    ...overrides,
    messages: freezeMessages(messages),
  };

  assertNonEmpty('modelUrl', config.modelUrl);
  assertNonEmpty('infoUrl', config.infoUrl);
  assertNonEmpty('hitokotoApiUrl', config.hitokotoApiUrl);
  if (typeof config.draggable !== 'boolean') throw new TypeError('live2d.draggable must be a boolean.');
  assertFiniteAtLeast('widgetWidthPx', config.widgetWidthPx, 0);
  assertFiniteAtLeast('widgetHeightPx', config.widgetHeightPx, 0);
  resolveLive2DLayout(config.widgetWidthPx, config.widgetHeightPx);
  assertFiniteAtLeast('dragThresholdPx', config.dragThresholdPx, 0);
  assertFiniteAtLeast('idleTimeoutMs', config.idleTimeoutMs, 1);
  assertFiniteAtLeast('idleRepeatIntervalMs', config.idleRepeatIntervalMs, 1);
  assertFiniteAtLeast('welcomeDurationMs', config.welcomeDurationMs, 0);
  assertFiniteAtLeast('interactionDurationMs', config.interactionDurationMs, 0);
  assertFiniteAtLeast('systemMessageDurationMs', config.systemMessageDurationMs, 0);
  assertFiniteAtLeast('hitokotoQuoteDurationMs', config.hitokotoQuoteDurationMs, 0);
  assertFiniteAtLeast('hitokotoAttributionDurationMs', config.hitokotoAttributionDurationMs, 0);
  assertFiniteAtLeast('goodbyeDurationMs', config.goodbyeDurationMs, 0);
  validateTimeMessages(config.messages.time);
  validatePageReactions('mouseover', config.messages.mouseover);
  validatePageReactions('click', config.messages.click);

  return Object.freeze(config);
}
