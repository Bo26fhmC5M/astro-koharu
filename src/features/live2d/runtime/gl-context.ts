import type { Live2DGlContext } from './contracts';

export class KoharuGlContext implements Live2DGlContext {
  private gl: WebGL2RenderingContext | null = null;

  initialize(canvas: HTMLCanvasElement): boolean {
    this.gl = canvas.getContext('webgl2', {
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    return this.gl !== null;
  }

  getGl(): WebGL2RenderingContext {
    if (!this.gl) throw new Error('Live2D WebGL context is not initialized');
    return this.gl;
  }

  release(): void {
    this.gl = null;
  }
}
