import { useNavigate } from 'react-router-dom';
import './redesign.css';
import LoadError from './LoadError.jsx';
import { Frame } from './parts.jsx';
import { errorMessage } from '../api/errors';

// ステータスごとのエラー画面（今は存在しない URL を開いたときの 404 で使う）
// 見た目は来場者向けの画面と同じ切り絵の夜空。絵とひとことは LoadError を使う
// 戻る先はビンゴカード（/）だけ。管理画面（/admin）へのリンクは出さない

// ページを開いたときのステータスごとの文と絵（artIndex は LoadError の ARTS の番号。0 始まり）
// ページが見つからないときの文は API の 404 とは意味が違うので、errorMessage（API の失敗にも使う）には入れずにここに持つ
// ここに無いステータスは errorMessage の文と、ランダムの絵を出す
const PAGES = {
  404: { message: 'ページが見つかりませんでした。ビンゴカードに戻って、もう一度試してください', artIndex: 1 }, // 迷子のおばけ
};

export default function ErrorPage({ status }) {
  const navigate = useNavigate();
  const page = PAGES[status];
  return (
    <Frame>
      <LoadError message={page?.message ?? errorMessage(status)} artIndex={page?.artIndex} />
      <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('/', { replace: true })}>
        ビンゴカードに戻る
      </button>
    </Frame>
  );
}
