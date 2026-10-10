import { useNavigate } from 'react-router-dom';
import './redesign.css';
import LoadError from './LoadError.jsx';
import { Night } from './parts.jsx';
import { errorMessage } from '../api/errors';

// ステータスごとのエラー画面（今は存在しない URL を開いたときの 404 で使う）
// 見た目は来場者向けの画面と同じ切り絵の夜空。絵とひとことは LoadError を使う
// 戻る先はビンゴカード（/）だけ。管理画面（/admin）へのリンクは出さない

// ステータスごとの絵（LoadError の ARTS の番号）。ここに無いステータスはランダム
const ART_BY_STATUS = {
  404: 1, // 迷子のおばけ
};

export default function ErrorPage({ status }) {
  const navigate = useNavigate();
  return (
    <div className="rd">
      <div className="rd-frame">
        <Night />
        <main className="rd-scroll">
          <LoadError message={errorMessage(status)} artIndex={ART_BY_STATUS[status]} />
          <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('/', { replace: true })}>
            ビンゴカードに戻る
          </button>
        </main>
      </div>
    </div>
  );
}
