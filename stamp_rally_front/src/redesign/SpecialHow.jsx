import { useEffect, useState } from 'react';
import { Title } from './parts.jsx';
import { HOW_STEPS, HOW_APIS } from './specialData.js';

// 特別室の「しくみ」（黒板）。スタンプが届くまでの流れ・サーバーの中（GET /api/special-room/how）・API をためす

const SERVER_MS = 5000;
const STATUS_TEXT = { 200: 'OK', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 503: 'Service Unavailable' };

const uptime = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h) return [`${h}`, `時間${m}分`];
  if (m) return [`${m}`, '分'];
  return [`${sec}`, '秒'];
};
const speed = (us) => (us >= 1000 ? [(us / 1000).toFixed(1), 'ms'] : [String(Math.max(1, Math.round(us))), 'µs']);

function Flow() {
  return (
    <ol className="rd-sp-flow">
      {HOW_STEPS.map((s, i) => (
        <li key={s.title}>
          <span className="rd-sp-flow-no" aria-hidden="true">{i + 1}</span>
          <div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <code>{s.code}</code>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Server() {
  const [s, setS] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/special-room/how');
        const data = res.ok ? await res.json() : { error: res.status };
        if (alive) setS(data);
      } catch {
        if (alive) setS((p) => p ?? { error: 0 });
      }
    };
    load();
    const id = setInterval(load, SERVER_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!s) return <p className="rd-note">サーバーに聞いています…</p>;
  if (s.error !== undefined) {
    return <p className="rd-note">{s.error === 401 || s.error === 403 ? 'サーバーの中は、特別室に入った人だけが見られます' : 'サーバーの中を取れませんでした'}</p>;
  }
  const tiles = [
    ['動きはじめてから', uptime(s.uptime_sec)],
    ['受けたリクエスト', [s.requests.toLocaleString('ja-JP'), '回']],
    ['1回の返事（平均）', speed(s.avg_us)],
    ['goroutine', [String(s.goroutines), '個']],
    ['メモリ', [s.heap_mb.toFixed(1), 'MB']],
    ['Go', [s.go.replace(/^go/, ''), '']],
  ];
  return (
    <>
      <div className="rd-sp-stats" aria-live="polite">
        {tiles.map(([label, [value, unit]]) => (
          <div key={label} className="rd-box rd-sp-stat"><span>{label}</span><b>{value}<small>{unit}</small></b></div>
        ))}
      </div>
      <p className="rd-note">5秒ごとに新しくなります。µs は 100万分の1秒です</p>
    </>
  );
}

// GET を送って、ステータス・かかった時間・中身（JSON なら整えて）を返す
async function request(path) {
  const t0 = performance.now();
  try {
    const r = await fetch(path);
    const text = await r.text();
    let body = text;
    try { body = JSON.stringify(JSON.parse(text), null, 2); } catch { /* JSON でなければそのまま出す */ }
    return { status: r.status, ms: performance.now() - t0, body };
  } catch {
    return { status: 0, ms: performance.now() - t0, body: '通信できませんでした' };
  }
}

function Explorer() {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const call = async (api) => {
    setBusy(true);
    const r = await request(api.path);
    setRes({ ...api, ...r });
    setBusy(false);
  };
  return (
    <>
      <div className="rd-sp-chips" aria-label="ためす API">
        {HOW_APIS.map((a) => <button key={a.path} type="button" onClick={() => call(a)} disabled={busy}>{a.label}</button>)}
      </div>
      {res && (
        <div className="rd-sp-res" role="status">
          <p className="rd-sp-res-head"><b>GET</b>{res.path}</p>
          <p className="rd-sp-res-note">{res.note}</p>
          <p className={`rd-sp-res-status${res.status >= 200 && res.status < 300 ? ' is-ok' : ''}`}>
            {res.status || '---'} {STATUS_TEXT[res.status] ?? ''}<span>{Math.round(res.ms)}ms</span>
          </p>
          <pre>{res.body}</pre>
        </div>
      )}
    </>
  );
}

export default function SpecialHow({ back }) {
  return (
    <>
      <Title name="しくみ" back={back} />
      <p className="rd-msg">スタンプを読み込んでから、マスにスタンプが押されるまでの裏側です。</p>
      <h2 className="rd-sp-h">スタンプが届くまで</h2>
      <Flow />
      <h2 className="rd-sp-h">サーバーの中</h2>
      <Server />
      <h2 className="rd-sp-h">API をためす</h2>
      <p className="rd-note">押すと、この画面からサーバーに GET を送って、返ってきた JSON をそのまま見せます</p>
      <Explorer />
    </>
  );
}
