// 管理画面からファイルを保存する(CSV・QRコードの SVG)

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // すぐに消すと保存が始まらないブラウザがあるので、少し待ってから消す
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// CSV の 1 マス分
// 「,」「"」・改行を含むときは "" で囲む。= + - @ で始まると Excel が式として読むので、先頭に ' を付ける
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// rows: 1 行目が見出しの 2 次元配列
// Excel で開いても文字化けしないよう、先頭に BOM を付けた UTF-8 で保存する
export function downloadCsv(filename, rows) {
  const text = '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  downloadBlob(filename, new Blob([text], { type: 'text/csv;charset=utf-8' }));
}
