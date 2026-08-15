const MESSAGE_SPACE_PX = 40;
const MIN_WIDGET_WIDTH_PX = 300;
const MIN_WIDGET_HEIGHT_PX = 340;

export interface Live2DLayout {
  widgetWidthPx: number;
  widgetHeightPx: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
}

export function resolveLive2DLayout(widgetWidthPx: number, widgetHeightPx: number): Live2DLayout {
  if (widgetWidthPx < MIN_WIDGET_WIDTH_PX || widgetHeightPx < MIN_WIDGET_HEIGHT_PX) {
    throw new RangeError(`Live2D widget must be at least ${MIN_WIDGET_WIDTH_PX}x${MIN_WIDGET_HEIGHT_PX}px.`);
  }

  return {
    widgetWidthPx,
    widgetHeightPx,
    canvasWidthPx: widgetWidthPx,
    canvasHeightPx: widgetHeightPx - MESSAGE_SPACE_PX,
  };
}

export function hasLive2DViewportRoom({
  sidebarLeftPx,
  viewportHeightPx,
  widgetHeightPx,
  widgetWidthPx,
}: {
  sidebarLeftPx?: number;
  viewportHeightPx: number;
  widgetHeightPx: number;
  widgetWidthPx: number;
}): boolean {
  return sidebarLeftPx !== undefined && sidebarLeftPx >= widgetWidthPx && viewportHeightPx >= widgetHeightPx;
}
