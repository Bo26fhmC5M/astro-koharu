import { CubismMatrix44 } from '@cubism-framework/math/cubismmatrix44';
import { CubismViewMatrix } from '@cubism-framework/math/cubismviewmatrix';
import { canvasPointFromClient } from './pointer';

const VIEW_SCALE = 1;
const VIEW_MIN_SCALE = 0.8;
const VIEW_MAX_SCALE = 2;
const VIEW_LOGICAL_BOTTOM = -1;
const VIEW_LOGICAL_TOP = 1;
const VIEW_LOGICAL_MAX_LEFT = -2;
const VIEW_LOGICAL_MAX_RIGHT = 2;
const VIEW_LOGICAL_MAX_BOTTOM = -2;
const VIEW_LOGICAL_MAX_TOP = 2;

export class Live2DViewport {
  readonly viewMatrix = new CubismViewMatrix();
  private readonly deviceToScreen = new CubismMatrix44();

  resize(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext): void {
    const width = Math.max(1, Math.round(canvas.clientWidth * window.devicePixelRatio));
    const height = Math.max(1, Math.round(canvas.clientHeight * window.devicePixelRatio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const ratio = width / height;
    const left = -ratio;
    const right = ratio;
    this.viewMatrix.loadIdentity();
    this.viewMatrix.setScreenRect(left, right, VIEW_LOGICAL_BOTTOM, VIEW_LOGICAL_TOP);
    this.viewMatrix.scale(VIEW_SCALE, VIEW_SCALE);
    this.viewMatrix.setMaxScale(VIEW_MAX_SCALE);
    this.viewMatrix.setMinScale(VIEW_MIN_SCALE);
    this.viewMatrix.setMaxScreenRect(
      VIEW_LOGICAL_MAX_LEFT,
      VIEW_LOGICAL_MAX_RIGHT,
      VIEW_LOGICAL_MAX_BOTTOM,
      VIEW_LOGICAL_MAX_TOP,
    );

    this.deviceToScreen.loadIdentity();
    if (width > height) {
      const screenWidth = Math.abs(right - left);
      this.deviceToScreen.scaleRelative(screenWidth / width, -screenWidth / width);
    } else {
      const screenHeight = Math.abs(VIEW_LOGICAL_TOP - VIEW_LOGICAL_BOTTOM);
      this.deviceToScreen.scaleRelative(screenHeight / height, -screenHeight / height);
    }
    this.deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);
  }

  toViewCoordinates(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const point = canvasPointFromClient(canvas, rect, clientX, clientY);
    const deviceX = point.x;
    const deviceY = point.y;
    const screenX = this.deviceToScreen.transformX(deviceX);
    const screenY = this.deviceToScreen.transformY(deviceY);
    return {
      x: this.viewMatrix.invertTransformX(screenX),
      y: this.viewMatrix.invertTransformY(screenY),
    };
  }

  createProjection(canvas: HTMLCanvasElement, modelCanvasWidth: number): CubismMatrix44 {
    const projection = new CubismMatrix44();
    if (modelCanvasWidth > 1 && canvas.width < canvas.height) {
      projection.scale(1, canvas.width / canvas.height);
    } else {
      projection.scale(canvas.height / canvas.width, 1);
    }
    projection.multiplyByMatrix(this.viewMatrix);
    return projection;
  }
}
