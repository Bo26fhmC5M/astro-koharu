import type { Live2DPageReaction } from './messages';
import { randomMessage } from './messages';
import { truncateText } from './utils';

const MAX_REACTION_LABEL_LENGTH = 100;

export interface PageReactionControllerOptions {
  root: HTMLElement;
  mouseover: readonly Live2DPageReaction[];
  click: readonly Live2DPageReaction[];
  onMessage(text: string): void;
}

export class PageReactionController {
  private lastHoverTarget?: Element;

  constructor(private readonly options: PageReactionControllerOptions) {}

  register(signal: AbortSignal): void {
    window.addEventListener('mouseover', (event) => this.handle('mouseover', event), { signal });
    window.addEventListener('mouseout', (event) => this.handleMouseOut(event), { signal });
    window.addEventListener('click', (event) => this.handle('click', event), { signal });
  }

  reset(): void {
    this.lastHoverTarget = undefined;
  }

  private handle(type: 'mouseover' | 'click', event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || this.options.root.contains(target)) return;

    for (const interaction of this.options[type]) {
      const matchedTarget = target.closest<HTMLElement>(interaction.selector);
      if (!matchedTarget) continue;
      if (type === 'mouseover' && this.lastHoverTarget === matchedTarget) return;
      if (type === 'mouseover') this.lastHoverTarget = matchedTarget;
      const label = truncateText(
        matchedTarget.innerText?.trim() || matchedTarget.getAttribute('aria-label')?.trim() || '',
        MAX_REACTION_LABEL_LENGTH,
      );
      this.options.onMessage(randomMessage(interaction.text).replace('{text}', label));
      return;
    }
  }

  private handleMouseOut(event: MouseEvent): void {
    const hoverTarget = this.lastHoverTarget;
    const target = event.target instanceof Element ? event.target : null;
    if (!hoverTarget || !target || !hoverTarget.contains(target)) return;

    const relatedElement = event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (!relatedElement || !hoverTarget.contains(relatedElement)) this.lastHoverTarget = undefined;
  }
}
