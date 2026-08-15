export function canvasPointFromClient(
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: (clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
    y: (clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
  };
}
