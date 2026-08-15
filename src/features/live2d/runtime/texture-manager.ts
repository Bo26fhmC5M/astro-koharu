/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { csmVector, type iterator } from '@cubism-framework/type/csmvector';
import type { Live2DGlContext, Live2DTextureStore } from './contracts';

/**
 * テクスチャ管理クラス
 * 画像読み込み、管理を行うクラス。
 */
export class Live2DTextureManager implements Live2DTextureStore {
  /**
   * コンストラクタ
   */
  public constructor() {
    this._textures = new csmVector<TextureInfo>();
  }

  /**
   * 解放する。
   */
  public release(): void {
    for (let ite: iterator<TextureInfo> = this._textures.begin(); ite.notEqual(this._textures.end()); ite.preIncrement()) {
      this._glManager.getGl().deleteTexture(ite.ptr().id);
    }
    this._textures.clear();
  }

  /**
   * 画像読み込み
   *
   * @param fileName 読み込む画像ファイルパス名
   * @param usePremultiply Premult処理を有効にするか
   * @return 画像情報、読み込み失敗時はnullを返す
   */
  public createTextureFromPngFile(
    fileName: string,
    usePremultiply: boolean,
    callback: (textureInfo: TextureInfo) => void,
    onError: (error: Error) => void,
  ): void {
    // search loaded texture already
    for (let ite: iterator<TextureInfo> = this._textures.begin(); ite.notEqual(this._textures.end()); ite.preIncrement()) {
      if (ite.ptr().fileName === fileName && ite.ptr().usePremultply === usePremultiply) {
        // 2回目以降はキャッシュが使用される(待ち時間なし)
        // WebKitでは同じImageのonloadを再度呼ぶには再インスタンスが必要
        // 詳細：https://stackoverflow.com/a/5024181
        ite.ptr().img = new Image();
        ite.ptr().img.crossOrigin = 'anonymous';
        ite.ptr().img.addEventListener('load', (): void => callback(ite.ptr()), {
          passive: true,
        });
        ite.ptr().img.addEventListener('error', () => onError(new Error(`Failed to load texture ${fileName}`)), {
          once: true,
        });
        ite.ptr().img.src = fileName;
        return;
      }
    }

    // データのオンロードをトリガーにする
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.addEventListener(
      'load',
      (): void => {
        // テクスチャオブジェクトの作成
        const tex = this._glManager.getGl().createTexture();
        if (!tex) return;

        // テクスチャを選択
        this._glManager.getGl().bindTexture(this._glManager.getGl().TEXTURE_2D, tex);

        // テクスチャにピクセルを書き込む
        this._glManager
          .getGl()
          .texParameteri(
            this._glManager.getGl().TEXTURE_2D,
            this._glManager.getGl().TEXTURE_MIN_FILTER,
            this._glManager.getGl().LINEAR_MIPMAP_LINEAR,
          );
        this._glManager
          .getGl()
          .texParameteri(
            this._glManager.getGl().TEXTURE_2D,
            this._glManager.getGl().TEXTURE_MAG_FILTER,
            this._glManager.getGl().LINEAR,
          );

        // Premult処理を行わせる
        if (usePremultiply) {
          this._glManager.getGl().pixelStorei(this._glManager.getGl().UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        }

        // テクスチャにピクセルを書き込む
        this._glManager
          .getGl()
          .texImage2D(
            this._glManager.getGl().TEXTURE_2D,
            0,
            this._glManager.getGl().RGBA,
            this._glManager.getGl().RGBA,
            this._glManager.getGl().UNSIGNED_BYTE,
            img,
          );

        // ミップマップを生成
        this._glManager.getGl().generateMipmap(this._glManager.getGl().TEXTURE_2D);

        // テクスチャをバインド
        this._glManager.getGl().bindTexture(this._glManager.getGl().TEXTURE_2D, null);

        const textureInfo: TextureInfo = new TextureInfo();
        if (textureInfo != null) {
          textureInfo.fileName = fileName;
          textureInfo.width = img.width;
          textureInfo.height = img.height;
          textureInfo.id = tex;
          textureInfo.img = img;
          textureInfo.usePremultply = usePremultiply;
          if (this._textures != null) {
            this._textures.pushBack(textureInfo);
          }
        }

        callback(textureInfo);
      },
      { passive: true },
    );
    img.addEventListener('error', () => onError(new Error(`Failed to load texture ${fileName}`)), { once: true });
    img.src = fileName;
  }

  /**
   * setter
   * @param glManager
   */
  public setGlManager(glManager: Live2DGlContext): void {
    this._glManager = glManager;
  }

  _textures: csmVector<TextureInfo>;
  private _glManager!: Live2DGlContext;
}

/**
 * 画像情報構造体
 */
export class TextureInfo {
  img!: HTMLImageElement; // 画像
  id!: WebGLTexture; // テクスチャ
  width = 0; // 横幅
  height = 0; // 高さ
  usePremultply = false; // Premult処理を有効にするか
  fileName = ''; // ファイル名
}
