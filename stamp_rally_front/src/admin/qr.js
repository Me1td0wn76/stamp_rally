import { encode } from 'uqr';

// QR コードのマス目
// uqr でマス目(白黒の 2 次元配列)を作り、黒いマスを 1 本の path にする
// 印刷して少し汚れても読めるよう、誤り訂正は M(15%)、まわりの白い余白は規格どおり 4 マスにする
const QR_OPTIONS = { ecc: 'M', border: 4 };
export const QR_DARK = '#120A16';

export function qrModules(text) {
  const { size, data } = encode(text, QR_OPTIONS);
  let path = '';
  data.forEach((row, y) => {
    row.forEach((on, x) => {
      if (on) path += `M${x} ${y}h1v1h-1z`;
    });
  });
  return { size, path };
}

// 保存用の SVG ファイルの中身(印刷物を作るとき用。1 マス 10px)
export function qrSvgFile(text) {
  const { size, path } = qrModules(text);
  const px = size * 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`
    + `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="${QR_DARK}"/></svg>`;
}
