interface PointerSession {
  id: number;
  x: number;
  y: number;
  left: number;
  top: number;
  moved: boolean;
}

export class DragController {
  private pointer?: PointerSession;

  constructor(
    private readonly widget: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly enabled: boolean,
    private readonly thresholdPx: number,
  ) {}

  register(signal: AbortSignal): void {
    const options = { signal };
    this.canvas.addEventListener('pointerdown', (event) => this.start(event), options);
    this.canvas.addEventListener('pointermove', (event) => this.move(event), options);
    this.canvas.addEventListener('pointerup', (event) => this.end(event), options);
    this.canvas.addEventListener('pointercancel', () => this.cancel(), options);
  }

  isDragging(): boolean {
    return this.pointer !== undefined;
  }

  private start(event: PointerEvent): void {
    if (event.button !== 0 || !this.enabled) return;
    const rect = this.widget.getBoundingClientRect();
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    this.canvas.setPointerCapture(event.pointerId);
  }

  private move(event: PointerEvent): void {
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    if (!pointer.moved && Math.hypot(deltaX, deltaY) < this.thresholdPx) return;

    pointer.moved = true;
    const maxLeft = Math.max(0, window.innerWidth - this.widget.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - this.widget.offsetHeight);
    this.widget.style.left = `${Math.min(maxLeft, Math.max(0, pointer.left + deltaX))}px`;
    this.widget.style.top = `${Math.min(maxTop, Math.max(0, pointer.top + deltaY))}px`;
    this.widget.style.bottom = 'auto';
  }

  private end(event: PointerEvent): void {
    if (this.pointer?.id === event.pointerId) this.cancel();
  }

  private cancel(): void {
    this.pointer = undefined;
  }
}
