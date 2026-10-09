import { useState } from 'react';
import { Pumpkin } from '../redesign/parts.jsx';
import { BarList } from './charts.jsx';
import { downloadCsv } from './download.js';
import { fileStamp, fmtCsvDate, fmtDateTimeSec, fmtNum, staffLabel, withRanks } from './format.js';

// CodeFlow:どのスタッフが何回スタンプを押したか(GET /api/admin/staff-stamps)

// 記録を一度に出す件数(「もっと見る」で増やす)
const PAGE = 30;
// 絞り込みの「すべて」(スタッフ名は空のこともあるので、選択肢の値は staff: を付けて区別する)
const ALL = 'all';
const filterValue = (staff) => `staff:${staff}`;

// スタッフのスタンプ画像(#36)。画像がない・読み込めないときは来場者画面と同じかぼちゃ
function StaffImage({ image }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="ad-staff-img" aria-hidden="true">
      {image && !broken ? <img src={`/stamps/${image}`} alt="" onError={() => setBroken(true)} /> : <Pumpkin />}
    </span>
  );
}

export default function Codeflow({ staff }) {
  const [filter, setFilter] = useState(ALL);
  const [shown, setShown] = useState(PAGE);

  const total = staff.counts.reduce((n, c) => n + c.count, 0);
  const imageOf = new Map(staff.counts.map((c) => [c.staff, c.stamp_image]));
  const ranking = withRanks(
    [...staff.counts]
      .sort((a, b) => b.count - a.count)
      .map((c) => ({
        key: filterValue(c.staff),
        name: staffLabel(c.staff),
        sub: total > 0 ? `${Math.round((c.count / total) * 100)}%` : '',
        image: <StaffImage image={c.stamp_image} />,
        value: c.count,
      })),
  );
  const records = filter === ALL ? staff.stamps : staff.stamps.filter((r) => filterValue(r.staff) === filter);

  const changeFilter = (e) => {
    setFilter(e.target.value);
    setShown(PAGE);
  };
  const saveRecords = () => {
    downloadCsv(`codeflow-records-${fileStamp()}.csv`, [
      ['日時', 'スタッフ'],
      ...records.map((r) => [fmtCsvDate(r.stamped_at), staffLabel(r.staff)]),
    ]);
  };
  const saveCounts = () => {
    downloadCsv(`codeflow-counts-${fileStamp()}.csv`, [
      ['スタッフ', '回数'],
      ...ranking.map((row) => [row.name, row.value]),
    ]);
  };

  return (
    <>
      <section className="rd-box">
        <h2>スタッフごとの回数</h2>
        <p>
          合計 {fmtNum(total)} 回
          {staff.stamps.length > 0 && <>(最後に押されたのは {fmtDateTimeSec(staff.stamps[0].stamped_at)})</>}
        </p>
        <BarList rows={ranking} unit="回" />
        <button type="button" className="rd-btn ad-btn-small ad-noprint" onClick={saveCounts}>回数を CSV で保存</button>
      </section>

      <section className="rd-box">
        <h2>記録(新しい順)</h2>
        <label className="ad-field">
          <span>スタッフで絞り込む</span>
          <select value={filter} onChange={changeFilter}>
            <option value={ALL}>すべて</option>
            {staff.counts.map((c) => (
              <option key={filterValue(c.staff)} value={filterValue(c.staff)}>{staffLabel(c.staff)}</option>
            ))}
          </select>
        </label>
        {records.length === 0 ? (
          <p>まだ記録がありません</p>
        ) : (
          <>
            <p>{fmtNum(records.length)} 件</p>
            <ol className="ad-log">
              {records.slice(0, shown).map((r, i) => (
                <li key={`${r.stamped_at}-${i}`}>
                  <time dateTime={r.stamped_at}>{fmtDateTimeSec(r.stamped_at)}</time>
                  <StaffImage image={imageOf.get(r.staff)} />
                  <span>{staffLabel(r.staff)}</span>
                </li>
              ))}
            </ol>
            {records.length > shown && (
              <button type="button" className="rd-btn ad-btn-small" onClick={() => setShown((n) => n + PAGE)}>
                もっと見る(残り {fmtNum(records.length - shown)} 件)
              </button>
            )}
          </>
        )}
        <button type="button" className="rd-btn ad-btn-small ad-noprint" onClick={saveRecords} disabled={records.length === 0}>
          {filter === ALL ? '記録' : '絞り込んだ記録'}を CSV で保存
        </button>
      </section>
    </>
  );
}
