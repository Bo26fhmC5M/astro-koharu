export type Live2DStatus = 'loading' | 'visible' | 'hidden' | 'error' | 'destroyed';

export type Live2DAction =
  | { type: 'runtime-ready' }
  | { type: 'hide' }
  | { type: 'show' }
  | { type: 'fail' }
  | { type: 'destroy' };

export function reduceLive2DStatus(status: Live2DStatus, action: Live2DAction): Live2DStatus {
  if (status === 'destroyed') return status;

  switch (action.type) {
    case 'runtime-ready':
      return status === 'hidden' ? 'hidden' : 'visible';
    case 'hide':
      return 'hidden';
    case 'show':
      return status === 'error' ? 'error' : 'visible';
    case 'fail':
      return 'error';
    case 'destroy':
      return 'destroyed';
  }
}
