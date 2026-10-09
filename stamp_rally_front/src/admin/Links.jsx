import { useEffect, useState } from 'react';
import Loader from '../redesign/Loader.jsx';
import LoadError from '../redesign/LoadError.jsx';
import { adminGet } from '../api/admin';
import QrCode from './QrCode.jsx';
import { qrSvgFile } from './qr.js';
import { downloadBlob } from './download.js';
import { TYPE_LABEL, adminErrorMessage } from './format.js';

// QR・URL:QRコードの印刷・NFCタグへの書き込みに使う URL(https://<ドメイン>/?spot=<トークン>)を、スポット・スタッフごとに出す
// ドメインは、いま管理画面を開いているもの(本番の URL で開けば本番の URL になる)

// 本番以外(手元の開発環境・LAN 内の IP)で開いているか
function isLocalHost(hostname) {
  return hostname === 'localhost'
    || hostname === '[::1]'
    || hostname.endsWith('.local')
    || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
}

// 「コピーしました」を出しておく時間(ms)
const COPIED_MS = 1500;

export default function Links({ password, onAuthError }) {
  const [links, setLinks] = useState(null);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  // コピーした URL(しばらく「コピーしました」を出す)
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { status, data } = await adminGet('links', password);
      if (!alive) return;
      if (status === 200) {
        setLinks(data);
      } else if (status === 401 || status === 404) {
        onAuthError(status);
      } else {
        setMessage(adminErrorMessage(status));
      }
    })();
    return () => { alive = false; };
  }, [password, onAuthError, reload]);

  const retry = () => {
    setMessage('');
    setReload((n) => n + 1);
  };

  if (!links) {
    return message ? (
      <>
        <LoadError message={message} />
        <button type="button" className="rd-btn rd-btn--big" onClick={retry}>再読み込み ↻</button>
      </>
    ) : <Loader />;
  }

  const origin = window.location.origin;
  const urlOf = (link) => `${origin}/?spot=${encodeURIComponent(link.token)}`;
  const titleOf = (link) => (link.staff ? `${link.name}(${link.staff})` : link.name);

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? '' : c)), COPIED_MS);
    } catch (err) {
      // クリップボードが使えないとき(HTTP で開いているなど)は、選んでコピーしてもらう
      console.error('コピー失敗:', err);
      window.prompt('この URL をコピーしてください', url);
    }
  };
  const saveSvg = (link) => {
    const name = `qr-${link.spot_id}${link.staff ? `-${link.staff}` : ''}.svg`;
    downloadBlob(name, new Blob([qrSvgFile(urlOf(link))], { type: 'image/svg+xml' }));
  };

  return (
    <>
      <section className="rd-box ad-noprint">
        <h2>QRコード・NFCタグの URL</h2>
        <p>QRコードの印刷・NFCタグへの書き込みに使う URL です。書き込み方は README の「NFCタグ・QRコードの準備」を見てください</p>
        {isLocalHost(window.location.hostname) && (
          <p className="ad-warn" role="status">⚠ いま開いているのは本番の URL ではありません({origin})。タグ・QR には、本番の URL で開いた管理画面の URL を使ってください</p>
        )}
        <p className="ad-warn">⚠ この URL を知っていれば、会場に来なくてもスタンプが取れます。画面を人に見せたり、URL を共有したりしないでください</p>
        <button type="button" className="rd-btn" onClick={() => window.print()}>QRコードを印刷する</button>
      </section>

      <ul className="ad-links">
        {links.map((link) => {
          const url = urlOf(link);
          return (
            <li key={link.token} className="rd-box ad-link">
              <h3>{titleOf(link)}</h3>
              <p className="ad-link-sub">{[link.description, TYPE_LABEL[link.type] ?? link.type].filter(Boolean).join('・')}</p>
              <QrCode text={url} label={`${titleOf(link)}のQRコード`} />
              <p className="ad-url">{url}</p>
              <div className="rd-row ad-noprint">
                <button type="button" className="rd-btn ad-btn-small" onClick={() => copy(url)}>
                  {copied === url ? 'コピーしました' : 'URL をコピー'}
                </button>
                <button type="button" className="rd-btn ad-btn-small" onClick={() => saveSvg(link)}>SVG で保存</button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
