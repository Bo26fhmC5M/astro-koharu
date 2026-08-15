export interface Live2DTexture {
  id: WebGLTexture;
}

export interface Live2DTextureStore {
  createTextureFromPngFile(
    fileName: string,
    usePremultiply: boolean,
    onLoad: (texture: Live2DTexture) => void,
    onError: (error: Error) => void,
  ): void;
}

export interface Live2DGlContext {
  getGl(): WebGL2RenderingContext;
}

export interface Live2DRenderContext {
  getCanvas(): HTMLCanvasElement;
  getFrameBuffer(): WebGLFramebuffer | null;
  getGlManager(): Live2DGlContext;
  getTextureManager(): Live2DTextureStore;
}

export interface Live2DRuntimeEvents {
  onHover(): void;
  onTap(): void;
}
