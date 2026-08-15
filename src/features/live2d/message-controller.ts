export interface MessageStep {
  text: string;
  duration: number;
}

export class MessageController {
  private timer: number | undefined;
  private priority = 0;
  private sequenceRevision = 0;

  constructor(private readonly element: HTMLElement) {}

  show(text: string, timeout = 4000, priority = 8, override = true): boolean {
    if (!text || (override ? this.priority > priority : this.priority >= priority)) return false;

    this.sequenceRevision += 1;
    this.clearTimer();
    this.display(text, priority);
    this.timer = window.setTimeout(() => this.hide(), timeout);
    return true;
  }

  showSequence(steps: readonly MessageStep[], priority: number): boolean {
    const visibleSteps = steps.filter(({ text }) => text.length > 0);
    if (visibleSteps.length === 0 || this.priority > priority) return false;

    this.sequenceRevision += 1;
    const revision = this.sequenceRevision;
    this.clearTimer();

    const showStep = (index: number) => {
      if (revision !== this.sequenceRevision) return;
      const step = visibleSteps[index];
      if (!step) {
        this.hide();
        return;
      }

      this.display(step.text, priority);
      this.timer = window.setTimeout(() => showStep(index + 1), step.duration);
    };

    showStep(0);
    return true;
  }

  hide(): void {
    this.sequenceRevision += 1;
    this.clearTimer();
    this.priority = 0;
    this.element.dataset.visible = 'false';
    this.element.setAttribute('aria-hidden', 'true');
  }

  destroy(): void {
    this.hide();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private display(text: string, priority: number): void {
    this.priority = priority;
    this.element.textContent = text;
    this.element.dataset.visible = 'true';
    this.element.setAttribute('aria-hidden', 'false');
  }
}
