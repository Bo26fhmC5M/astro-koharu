/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

/**
 * プラットフォーム依存機能を抽象化する Cubism Platform Abstraction Layer.
 *
 * ファイル読み込みや時刻取得等のプラットフォームに依存する関数をまとめる。
 */
let currentFrame = 0;
let lastFrame = 0;
let deltaTime = 0;

export const Live2DClock = {
  /**
   * デルタ時間（前回フレームとの差分）を取得する
   * @return デルタ時間[ms]
   */
  getDeltaTime(): number {
    return deltaTime;
  },

  updateTime(): void {
    currentFrame = Date.now();
    deltaTime = (currentFrame - lastFrame) / 1000;
    lastFrame = currentFrame;
  },
};
