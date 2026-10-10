// カメラの映像から QR コードを読む（QrCamera.jsx で使う）
// ブラウザに BarcodeDetector があればそれを使い（Android の Chrome など）、無ければ jsQR を使う（iPhone の Safari など）
// jsQR は使うときに初めて読み込む（BarcodeDetector が使えるスマホと、読み込み画面を開かない人は読み込まない）

// jsQR に渡す画像の長い辺(px)。カメラの映像をそのまま渡すと重いので縮める（スポットの QR はこの大きさで十分読める）
const JSQR_MAX_SIDE = 640;

// 読み取る関数 (video) => Promise<読み取った文字 | null> を返す
// jsQR を読み込めなかった（通信が切れていた）ときは name が 'QrDecoderLoadError' の例外を投げる
export async function createQrDecoder() {
  const native = await nativeDecoder();
  if (native) return native;

  let jsQR;
  try {
    ({ default: jsQR } = await import('jsqr'));
  } catch (cause) {
    const err = new Error('jsQR を読み込めませんでした', { cause });
    err.name = 'QrDecoderLoadError';
    throw err;
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const { videoWidth: w, videoHeight: h } = video;
    if (!hasFrame(video) || !w || !h) return null;
    const scale = Math.min(1, JSQR_MAX_SIDE / Math.max(w, h));
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    ctx.drawImage(video, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);
    // 会場の QR は白地に黒なので、白黒を反転させた読み取りはしない（そのぶん速い）
    return jsQR(data, cw, ch, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

// BarcodeDetector で読む関数。使えない（無い・QR コードに対応していない）ときは null
async function nativeDecoder() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    if (!formats.includes('qr_code')) return null;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    return async (video) => {
      if (!hasFrame(video)) return null;
      const codes = await detector.detect(video);
      return codes[0]?.rawValue || null;
    };
  } catch {
    return null;
  }
}

// 映像の 1 コマ目が届いているか(HAVE_CURRENT_DATA 以上)
function hasFrame(video) {
  return video.readyState >= 2;
}
