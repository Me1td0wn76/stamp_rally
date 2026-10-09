import { errorMessage } from '../api/errors';

// 管理画面で使う表示の整え方

// スポットの種類の表示名(来場者画面の Bingo.jsx と同じ)
export const TYPE_LABEL = {
  food: '飲食',
  activity: '企画',
  codeflow: 'Codeflow',
};

// 管理用 API が失敗したときの文
// 401・404 はログインし直し・設定の見直しが必要なので、ほかのエラーと分けて伝える
export function adminErrorMessage(status) {
  if (status === 401) return 'パスワードが違います';
  if (status === 404) return '管理用 API が無効です。サーバーの環境変数 ADMIN_PASSWORD(16文字以上)を設定して、再起動してください';
  return errorMessage(status);
}

// 手動 API(POST /api/stamps)で取ったスタンプはスタッフがわからない(staff が空)
export function staffLabel(staff) {
  return staff || '不明(手動 API)';
}

// ランキングの順位を付ける。同じ数は同じ順位にする(1, 2, 2, 4 …)。rows は数(value)の多い順に並べておく
export function withRanks(rows) {
  return rows.map((row) => ({ ...row, rank: rows.findIndex((r) => r.value === row.value) + 1 }));
}

const numberFormat = new Intl.NumberFormat('ja-JP');
export function fmtNum(n) {
  return numberFormat.format(n);
}

const timeFormat = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const dateTimeSecFormat = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

// 12:34:56
export function fmtTime(value) {
  return timeFormat.format(new Date(value));
}
// 10/31 12:34
export function fmtDateTime(value) {
  return dateTimeFormat.format(new Date(value));
}
// 10/31 12:34:56
export function fmtDateTimeSec(value) {
  return dateTimeSecFormat.format(new Date(value));
}
// 時間帯の始まりの「時」(グラフの目盛り用)
export function fmtHour(value) {
  return new Date(value).getHours();
}

// 3時間12分
export function fmtDuration(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// CSV に書く日時(2026-10-31 12:34:56。表計算ソフトが日時として読める形)
export function fmtCsvDate(value) {
  const d = new Date(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 保存するファイル名に付ける日時(20261031-1234)
export function fileStamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
}
