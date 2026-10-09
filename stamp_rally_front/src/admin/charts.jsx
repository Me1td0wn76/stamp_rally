import { fmtNum } from './format.js';

// 管理画面のグラフ・数字の部品
// 紙(--paper)の箱の上に置く。棒はどれも 1 色(濃いオレンジ)で、数は文字(インクの色)で書く
// どのグラフも、数は棒の横の文字・ツールチップ・「表で見る」のどれかで読める(色だけに頼らない)

// 数字 1 つの札(はじめた人・スタンプ総数など)
export function Stat({ label, value, unit, sub }) {
  return (
    <section className="rd-box ad-stat">
      <h2 className="ad-stat-label">{label}</h2>
      <p className="ad-stat-value">{fmtNum(value)}<small>{unit}</small></p>
      {sub && <p className="ad-stat-sub">{sub}</p>}
    </section>
  );
}

// 上限に対してどれだけ使ったか(ユーザー数 / MAX_USERS)
export function Meter({ value, max, label }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="ad-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      {/* 0 でなければ、少なくても見えるよう最低 4px は塗る */}
      <span className="ad-meter-fill" style={{ width: ratio > 0 ? `max(4px, ${ratio * 100}%)` : 0 }} />
    </div>
  );
}

// 縦軸の上端:最大値以上のきりのよい数。真ん中の目盛り(半分)も整数になるよう、偶数か 10 の倍数にする
function niceMax(peak) {
  if (peak <= 2) return 2;
  const pow = 10 ** Math.floor(Math.log10(peak));
  for (const m of [1, 2, 4, 6, 8, 10]) {
    if (m * pow >= peak) return m * pow;
  }
  return 10 * pow;
}

// 縦棒グラフ(時間帯ごと・マスの数ごと)
// items: [{ key, x: 目盛りの文字, value, tip: ツールチップ・読み上げ用の説明 }]
// いちばん大きい棒にだけ数を書き、ほかの棒の数はツールチップ(マウスを乗せる・Tab で選ぶ)と「表で見る」で読む
export function ColumnChart({ items, unit, xUnit, label }) {
  const peak = Math.max(0, ...items.map((item) => item.value));
  const yMax = niceMax(peak);
  const peakIndex = peak > 0 ? items.findIndex((item) => item.value === peak) : -1;
  // 目盛りの文字が重ならないよう、多いときは間引く(12 本くらいまで)
  const every = Math.ceil(items.length / 12);
  // 端の棒のツールチップは、枠からはみ出さないよう内側に寄せる
  const edge = (i) => (i < items.length / 3 ? ' is-start' : i >= (items.length * 2) / 3 ? ' is-end' : '');

  return (
    <figure className="ad-chart" aria-label={label}>
      <div className="ad-chart-y" aria-hidden="true">
        <span>{fmtNum(yMax)}</span>
        <span>{fmtNum(yMax / 2)}</span>
        <span>0</span>
      </div>
      <div className="ad-chart-plot">
        {items.map((item, i) => (
          <div key={item.key} className={`ad-col${edge(i)}`} tabIndex={0} role="img" aria-label={`${item.tip}:${fmtNum(item.value)}${unit}`}>
            {i === peakIndex && <span className="ad-col-peak" aria-hidden="true">{fmtNum(item.value)}</span>}
            <span className="ad-col-bar" style={{ height: `${(item.value / yMax) * 100}%` }} />
            <span className="ad-tip" aria-hidden="true"><b>{fmtNum(item.value)}{unit}</b>{item.tip}</span>
          </div>
        ))}
      </div>
      <div className="ad-chart-x" aria-hidden="true">
        {items.map((item, i) => <span key={item.key}>{i % every === 0 ? item.x : ''}</span>)}
      </div>
      {xUnit && <figcaption className="ad-chart-unit" aria-hidden="true">{xUnit}</figcaption>}
    </figure>
  );
}

// 横棒のランキング(スタッフごと・スポットごと)
// rows: [{ key, rank, name, sub, image, value }](並べ替え・順位は呼び出し側で決める。順位は format.js の withRanks)
// 数は棒の先に書くので、これ自体が表の代わりになる
export function BarList({ rows, unit }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ol className="ad-rank">
      {rows.map((row) => (
        <li key={row.key} className={row.image ? 'has-img' : undefined}>
          <span className="ad-rank-no">{row.rank}</span>
          {row.image}
          <div className="ad-rank-body">
            <span className="ad-rank-name">{row.name}</span>
            {row.sub && <span className="ad-rank-sub">{row.sub}</span>}
            <span className="ad-rank-track">
              <span
                className="ad-rank-fill"
                style={{ width: row.value > 0 ? `max(2px, calc((100% - 5em) * ${row.value / max}))` : 0 }}
              />
              <span className="ad-rank-val">{fmtNum(row.value)}{unit}</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// グラフと同じ数を表でも見られるようにする(色・マウス操作に頼らずに読めるように)
export function TableView({ head, rows }) {
  return (
    <details className="ad-table-wrap">
      <summary>表で見る</summary>
      <table className="ad-table">
        <thead>
          <tr>{head.map((h, i) => <th key={h} className={i > 0 ? 'num' : undefined}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>{row.map((cell, i) => <td key={i} className={i > 0 ? 'num' : undefined}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
