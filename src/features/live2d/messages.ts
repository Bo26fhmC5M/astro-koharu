export interface Live2DTimeMessage {
  fromHour: number;
  toHour: number;
  text: string;
}

export interface Live2DPageReaction {
  selector: string;
  text: readonly string[];
}

export interface Live2DMessages {
  defaults: readonly string[];
  console: string;
  copy: string;
  visibilitychange: string;
  photo: string;
  goodbye: string;
  hitokotoError: string;
  hitokotoAttribution: (from: string, creator?: string) => string;
  welcome: (title: string) => string;
  referrer: (hostname: string) => string;
  hoverBody: readonly string[];
  tapBody: readonly string[];
  time: readonly Live2DTimeMessage[];
  mouseover: readonly Live2DPageReaction[];
  click: readonly Live2DPageReaction[];
}

export const defaultLive2DMessages = {
  defaults: ['오늘도 찾아와 주셔서 고마워요!', '천천히 둘러보세요~'],
  console: '개발자 도구에서 무엇을 찾고 있나요?',
  copy: '내용을 복사했어요. 출처를 함께 남겨 주시면 좋아요~',
  visibilitychange: '다시 돌아오셨군요!',
  photo: '예쁘게 찍어 주세요!',
  goodbye: '다음에 또 만나요!',
  hitokotoError: '문장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
  hitokotoAttribution: (from: string, creator?: string) =>
    creator ? `이 문장은 ${from}에서 가져왔고, ${creator} 님이 등록했어요.` : `이 문장은 ${from}에서 가져왔어요.`,
  welcome: (title: string) => `${title}에 오신 것을 환영해요!`,
  referrer: (hostname: string) => `${hostname}에서 오셨군요.`,
  hoverBody: ['간지러워요.', '무슨 일이에요?'],
  tapBody: ['앗, 깜짝이야!', '저를 부르셨나요?'],
  time: [
    {
      fromHour: 0,
      toHour: 5,
      text: '늦은 시간까지 함께해 주셔서 고마워요.',
    },
    {
      fromHour: 6,
      toHour: 11,
      text: '좋은 아침이에요. 멋진 하루를 시작해 봐요.',
    },
    {
      fromHour: 12,
      toHour: 17,
      text: '어서 오세요. 잠시 쉬어 가도 좋아요.',
    },
    {
      fromHour: 18,
      toHour: 23,
      text: '좋은 저녁이에요. 오늘은 어떤 이야기를 읽어 볼까요?',
    },
  ],
  mouseover: [
    {
      selector: '#site-header :is(a, button)',
      text: ['어디로 가볼까요?', '메뉴를 둘러보고 있군요.'],
    },
    {
      selector: 'article a[href] img',
      text: ['링크된 이미지를 발견했어요!'],
    },
    {
      selector: 'article img',
      text: ['멋진 이미지네요!', '자세히 보고 싶다면 클릭해 보세요.'],
    },
    {
      selector: ':is(.post-item-card, .flip-card)',
      text: ['새로운 글을 발견했어요!', '새로운 이야기가 이어질 것 같아요.'],
    },
    {
      selector: ':is(button, a)[aria-label]:not([aria-label=""])',
      text: ['{text} 버튼이에요.'],
    },
  ],
  click: [
    {
      selector: ':is(.post-item-card, .flip-card)',
      text: ['좋은 글을 만나고 오세요!'],
    },
  ],
} as const satisfies Live2DMessages;

export function randomMessage(messages: readonly string[]): string {
  return messages[Math.floor(Math.random() * messages.length)] ?? '';
}
