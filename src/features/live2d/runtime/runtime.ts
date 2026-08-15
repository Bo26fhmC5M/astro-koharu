import { CubismFramework, LogLevel, type Option } from '@cubism-framework/live2dcubismframework';
import { Live2DClock } from './clock';
import type { Live2DRenderContext, Live2DRuntimeEvents } from './contracts';
import { KoharuGlContext } from './gl-context';
import { Live2DModel } from './model';
import { motionPriority } from './motion-constants';
import { findTapMotionGroup } from './tap-motion';
import { Live2DTextureManager } from './texture-manager';
import { Live2DViewport } from './viewport';

export interface RuntimePointerEvent {
  pageX: number;
  pageY: number;
}

/**
 * Single-canvas Cubism runtime for the Koharu widget.
 *
 * This owns the application layer that the Cubism SDK Demo normally supplies:
 * WebGL lifecycle, model loading, viewport transforms, the frame loop, and
 * pointer hit testing. Core and Framework remain unmodified vendor code.
 */
export class KoharuLive2DRuntime implements Live2DRenderContext {
  private canvas: HTMLCanvasElement | null = null;
  private readonly glManager = new KoharuGlContext();
  private readonly textureManager = new Live2DTextureManager();
  private readonly viewport = new Live2DViewport();
  private frameBuffer: WebGLFramebuffer | null = null;
  private model: Live2DModel | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frameId: number | null = null;
  private needsResize = false;
  private initialized = false;
  private events: Live2DRuntimeEvents | null = null;

  private readonly onMouseMove = (event: MouseEvent): void => {
    const point = this.transformOffset({ pageX: event.clientX, pageY: event.clientY });
    this.model?.setDragging(point.x, point.y);
    const hitAreas = this.model?.hitTestAll(point.x, point.y) ?? [];
    this.reactToPointer(hitAreas);
    if (hitAreas.length > 0) this.events?.onHover();
  };

  private readonly onMouseOut = (): void => {
    this.model?.setDragging(0, 0);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const point = this.transformOffset({ pageX: event.clientX, pageY: event.clientY });
    const hitAreas = this.model?.hitTestAll(point.x, point.y) ?? [];
    this.reactToPointer(hitAreas);
    if (hitAreas.length > 0) this.events?.onTap();
  };

  initialize(canvas: HTMLCanvasElement, events: Live2DRuntimeEvents): boolean {
    if (this.initialized) return true;

    if (!this.glManager.initialize(canvas)) return false;
    this.canvas = canvas;
    this.events = events;

    const gl = this.glManager.getGl();
    this.frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.textureManager.setGlManager(this.glManager);

    const option = {
      loggingLevel: LogLevel.LogLevel_Off,
      logFunction: () => {},
    } as Option;
    if (!CubismFramework.startUp(option)) return false;
    CubismFramework.initialize();
    Live2DClock.updateTime();

    this.resize();
    this.resizeObserver = new ResizeObserver(() => {
      this.needsResize = true;
    });
    this.resizeObserver.observe(canvas);
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.addEventListener('mouseout', this.onMouseOut, { passive: true });
    document.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    this.initialized = true;
    return true;
  }

  async changeModel(modelSettingUrl: string): Promise<void> {
    if (!this.initialized) throw new Error('Live2D runtime is not initialized');
    const separator = modelSettingUrl.lastIndexOf('/');
    if (separator < 0 || separator === modelSettingUrl.length - 1) {
      throw new Error(`Invalid Live2D model URL: ${modelSettingUrl}`);
    }

    this.model?.release();
    const model = new Live2DModel();
    model.setRenderContext(this);
    this.model = model;
    try {
      await model.loadAssets(modelSettingUrl.slice(0, separator + 1), modelSettingUrl.slice(separator + 1));
    } catch (error) {
      if (this.model === model) this.model = null;
      model.release();
      throw error;
    }
  }

  run(): void {
    if (this.frameId !== null) return;
    const frame = (): void => {
      this.frameId = window.requestAnimationFrame(frame);
      Live2DClock.updateTime();
      this.renderFrame();
    };
    frame();
  }

  stop(): void {
    if (this.frameId === null) return;
    window.cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  release(): void {
    this.stop();
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseout', this.onMouseOut);
    document.removeEventListener('pointerdown', this.onPointerDown);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.model?.release();
    this.model = null;
    this.textureManager.release();
    this.glManager.release();
    if (CubismFramework.isInitialized()) CubismFramework.dispose();
    if (CubismFramework.isStarted()) CubismFramework.cleanUp();
    this.canvas = null;
    this.events = null;
    this.frameBuffer = null;
    this.initialized = false;
  }

  resize(): void {
    if (!this.canvas) return;
    this.viewport.resize(this.canvas, this.glManager.getGl());
    this.needsResize = false;
  }

  transformOffset(event: RuntimePointerEvent): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    return this.viewport.toViewCoordinates(this.canvas, event.pageX, event.pageY);
  }

  getCanvas(): HTMLCanvasElement {
    if (!this.canvas) throw new Error('Live2D canvas is not initialized');
    return this.canvas;
  }

  getFrameBuffer(): WebGLFramebuffer | null {
    return this.frameBuffer;
  }

  getGlManager(): KoharuGlContext {
    return this.glManager;
  }

  getTextureManager(): Live2DTextureManager {
    return this.textureManager;
  }

  private renderFrame(): void {
    if (!this.canvas) return;
    if (this.needsResize) this.resize();

    const gl = this.glManager.getGl();
    if (gl.isContextLost()) return;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearDepth(1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const cubismModel = this.model?.getModel();
    if (!cubismModel || !this.model) return;
    if (cubismModel.getCanvasWidth() > 1 && this.canvas.width < this.canvas.height) {
      this.model.getModelMatrix().setWidth(2);
    }
    const projection = this.viewport.createProjection(this.canvas, cubismModel.getCanvasWidth());
    this.model.update();
    this.model.draw(projection);
  }

  private reactToPointer(hitAreas: readonly string[]): void {
    if (!this.model || hitAreas.length === 0) return;
    const model = this.model;
    const motionGroup = findTapMotionGroup(hitAreas, (group) => model.hasMotionGroup(group));
    if (motionGroup) model.startRandomMotion(motionGroup, motionPriority.normal);
  }
}
